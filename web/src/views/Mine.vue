<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api';
import { useField } from '../store/field';
import { useUser } from '../store/user';
import { useNotice } from '../store/notice';
import { ask } from '../utils/ask';
import { glyphOf } from '../icons';
import FieldPager from '../components/FieldPager.vue';
import FenceToggle from '../components/FenceToggle.vue';
import WheatField from '../components/WheatField.vue';
import InboxFence from '../components/InboxFence.vue';
import ProfileFence from '../components/ProfileFence.vue';
import Glyph from '../components/Glyph.vue';

const router = useRouter();
const field = useField();
const user = useUser();
const notice = useNotice();
field.refresh();
user.load();
onMounted(() => notice.load());

const inboxOpen = ref(false);
const inboxTab = ref('notes');
const profileOpen = ref(false);
const openInbox = tab => { inboxTab.value = tab; inboxOpen.value = true; };

/* ——— 篱笆：敞着还是围着，点一下就改 ——— */
const vis = computed(() => user.user?.visibility || 'private');
const fenceSay = ref('');
let sayTimer;
const FENCE_WORDS = {
  public: ['篱笆拆了，风可以进来了', '门敞着，路过的人能看一眼'],
  private: ['篱笆围上了，就你自己知道', '这块地，先自己待着']
};
async function toggleFence() {
  const next = vis.value === 'public' ? 'private' : 'public';
  const d = await user.save({ visibility: next });
  const words = FENCE_WORDS[d.visibility];
  fenceSay.value = words[Math.floor(Math.random() * words.length)];
  clearTimeout(sayTimer);
  sayTimer = setTimeout(() => (fenceSay.value = ''), 2600);
}

const hash = s => [...String(s)].reduce((a, c) => (a * 31 + c.codePointAt(0)) >>> 0, 7);

/* ——— 挖过的地：一轮十五张，五行六行四行轮着堆 ——— */
const CYCLE = [5, 6, 4];
const PER = 15;
const page = ref(1);
const q = ref('');
// 新开的地和刚动过的地排在前面；找地的时候只在名字、题目和那句问题里找
const found = computed(() => {
  const k = q.value.trim().toLowerCase();
  if (!k) return field.sessions;
  return field.sessions.filter(s =>
    [s.title, s.question, s.topic_name].some(v => (v || '').toLowerCase().includes(k)));
});
const pages = computed(() => Math.max(1, Math.ceil(found.value.length / PER)));
watch(q, () => (page.value = 1));
watch(pages, p => { if (page.value > p) page.value = p; });

// 一行几张，卡片就多宽：四张一行的最大，六张一行的最窄，堆出来才有层次
const rows = computed(() => {
  const list = found.value.slice((page.value - 1) * PER, page.value * PER);
  const out = [];
  let k = 0;
  while (list.length) out.push(list.splice(0, CYCLE[k++ % 3]));
  return out;
});

const open = s => router.push(s.status === 'running' ? '/think/' + s.id : '/review/' + s.id);

// 每张都是随手贴在田埂上的纸：倾角和高低各错开一点，不排队
const plot = (ri, i, s) => {
  const h = hash(s.title);
  return {
    '--rot': ((h >>> 9) % 21 - 10) / 8 + 'deg',
    '--ty': ((h >>> 14) % 20) + (i % 2 ? 8 : 0) + (ri % 2 ? 4 : 0) + 'px'
  };
};

async function del(s) {
  const gone = await ask({
    title: '铲掉这块地？',
    body: `「${s.title}」连同里面种过的东西一起没了，找不回来。`,
    ok: '铲掉', cancel: '再想想'
  });
  if (!gone) return;
  await api.delSession(s.id);
  field.clear(s.id);
}
</script>

<template>
  <div class="mine">
    <header class="top-nav">
      <div class="logo"><button class="link back" title="回原野" @click="router.push('/')"><Glyph name="left" :size="19"/></button> 我的田地</div>
      <nav>
        <button v-if="notice.messages" class="nav-note" @click="openInbox('notes')">
          <Glyph name="leaf" :size="15"/> {{ notice.messages }} 条留言
        </button>
        <button v-if="notice.doors" class="nav-note door" @click="openInbox('knocks')">
          <Glyph name="bell" :size="13"/> {{ notice.doors }} 处动静
        </button>
        <button class="avatar" title="改名字、换把钥匙" @click="profileOpen = true">
          {{ (user.user?.nickname || '田')[0] }}
        </button>
        <button class="btn-ghost" @click="router.push('/')">去开新地</button>
      </nav>
    </header>

    <div class="fence-bar">
      <FenceToggle :open="vis === 'public'" @toggle="toggleFence"/>
      <label class="find">
        <Glyph name="leaf" :size="15"/>
        <input v-model="q" placeholder="找找哪块地…" aria-label="搜索我的田地"/>
        <i v-if="q">{{ found.length }} 块</i>
      </label>
      <Transition name="say">
        <p v-if="fenceSay" class="fence-say">{{ fenceSay }}</p>
      </Transition>
    </div>

    <main class="roll">
      <div v-if="!field.ready" class="loading">土还在翻</div>

      <template v-else>
        <p v-if="!field.sessions.length" class="empty">还没开过地，随便挑一块试试。</p>
        <p v-else-if="!found.length" class="empty">没找着这块地，换个词试试。</p>
        <Transition v-else name="sheaf" mode="out-in">
          <div :key="page" class="cards">
            <div v-for="(row, ri) in rows" :key="ri" class="rank">
              <article v-for="(s, i) in row" :key="s.id" class="s-card" :style="plot(ri, i, s)" @click="open(s)">
                <div class="s-top">
                  <span class="s-topic"><Glyph :name="glyphOf({ name: s.topic_name })" :size="16"/> {{ s.topic_name }}</span>
                  <span class="badge" :class="s.status">{{ s.status === 'running' ? '生长中' : '已封存' }}</span>
                </div>
                <h3>{{ s.title }}</h3>
                <p v-if="s.question" class="s-q">{{ s.question }}</p>
                <div class="s-foot">
                  <span>第 {{ s.level }} 层 · {{ s.thought_count }} 条想法</span>
                  <span class="s-time">{{ (s.last_at || '').slice(5, 16) }}</span>
                  <button class="s-del" @click.stop="del(s)">铲掉</button>
                </div>
              </article>
            </div>
          </div>
        </Transition>
      </template>
    </main>

    <!-- 跟回看那块地站在同一个高度：底下垫一条麦田，别贴着窗口边 -->
    <footer v-if="field.ready && pages > 1" class="foot">
      <FieldPager :page="page" :pages="pages" @go="page = $event"/>
    </footer>

    <WheatField class="wheat" :n="12"/>
    <InboxFence :open="inboxOpen" :tab="inboxTab" @close="inboxOpen = false"/>
    <ProfileFence :open="profileOpen" @close="profileOpen = false"/>
  </div>
</template>

<style scoped>
.mine { height: 100vh; height: 100dvh; display: flex; flex-direction: column; overflow: hidden; }
.back { display: inline-flex; color: var(--ink-soft); transition: transform .4s, color .4s; }
.back:hover { color: var(--wood); transform: translateX(-3px); }
.nav-note { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; color: var(--grass-deep);
  letter-spacing: .04em; padding: 2px 3px 4px;
  text-decoration: underline wavy rgba(79, 107, 58, .42) 1px; text-underline-offset: 4px; }
.nav-note.door { color: var(--wood); text-decoration-color: rgba(139, 107, 74, .42); }
.nav-note:hover { color: var(--clay); }
.fence-bar { flex: none; display: flex; align-items: center; gap: 16px; min-height: 42px;
  padding: 0 max(24px, 4vw); }
.fence-say { font-size: 12px; color: var(--ink-faint); letter-spacing: 1.5px; }
/* 找地：一道田埂，一片叶，没有输入框的方角 */
.find { display: flex; align-items: center; gap: 6px; width: min(260px, 32vw); color: var(--ink-faint);
  border-bottom: 1.2px dashed rgba(150, 133, 100, .45); transition: color .35s, border-color .35s; }
.find input { flex: 1; min-width: 0; padding: 3px 0 5px; font-size: 13px; color: var(--ink); background: none; }
.find input::placeholder { font-style: italic; color: #B0A898; }
.find input:focus { outline: none; }
.find:focus-within { color: var(--grass-deep); border-bottom-color: rgba(79, 107, 58, .55); }
.find i { font-style: normal; font-size: 11px; color: var(--ink-faint); white-space: nowrap; }
.say-enter-active, .say-leave-active { transition: opacity .4s, transform .4s; }
.say-enter-from, .say-leave-to { opacity: 0; transform: translateY(4px); }
/* 地是敞的：中间不再套一只窄盒子，有几张纸就摊几张 */
main { flex: 1; min-height: 0; padding: 14px max(24px, 4vw) 18px; }
.foot { flex: none; padding: 6px max(24px, 4vw) 16px; }
.wheat { flex: none; }

.empty { text-align: center; padding: 40px 0 10px; color: var(--ink-soft); }
.cards { padding: 14px 2px 0; }
/* 一行一垅：这垅摆几张，纸就摊多宽，垅与垅之间留出踩脚的地方 */
.rank { display: flex; align-items: flex-start; gap: 24px 22px; margin-bottom: 30px; }
.rank:last-child { margin-bottom: 0; }
.s-card { position: relative; flex: 1 1 0; min-width: 0; max-width: 380px; padding: 15px 20px 14px; cursor: pointer;
  transform: translateY(var(--ty)) rotate(var(--rot));
  background: radial-gradient(105% 88% at 22% 14%, rgba(94, 83, 64, .045), transparent 60%), var(--card);
  border: 1.4px dashed rgba(150, 133, 100, .45);
  border-radius: var(--r-a); box-shadow: var(--emboss-soft);
  transition: transform .5s cubic-bezier(.22, .8, .26, 1), box-shadow .5s, opacity .45s; }
.s-card:hover { transform: translateY(calc(var(--ty) - 4px)) rotate(0deg); box-shadow: var(--emboss-lift); }
.s-top { display: flex; justify-content: space-between; align-items: center; }
.s-topic { display: inline-flex; align-items: center; gap: 6px; min-width: 0; font-size: 13px; color: var(--wood); }
.badge { flex: none; white-space: nowrap; font-size: 12px; border-radius: var(--r-c); padding: 1px 11px 2px; }
.badge.running { background: rgba(127, 166, 80, .18); color: var(--grass-deep); }
.badge.finished { background: rgba(139, 107, 74, .15); color: var(--wood); }
h3 { margin: 6px 0 2px; font-size: 17px; font-weight: normal; }
.s-q { font-size: 13.5px; color: var(--ink-soft); line-height: 1.75; }
.s-foot { display: flex; align-items: center; gap: 10px; margin-top: 12px; font-size: 12px; color: var(--ink-soft); }
.s-time { flex: 1; }
.s-del { color: var(--ink-soft); font-size: 12px; }
.s-del:hover { color: #B0533B; }
/* 翻页：整捆纸被抱走，新的一捆从土里顶上来 */
.sheaf-enter-active, .sheaf-leave-active { transition: opacity .45s, transform .45s; }
.sheaf-enter-from { opacity: 0; transform: translateY(16px); }
.sheaf-leave-to { opacity: 0; transform: translateY(-12px); }

/* 窄屏上一垅摆不下那么多张，让它自己换成两列 */
@media (max-width: 1100px) {
  .rank { flex-wrap: wrap; }
  .s-card { flex: 1 1 220px; }
}
@media (max-width: 720px) {
  .rank { gap: 18px 12px; }
  .s-card { flex: 1 1 44%; max-width: none; }
}
</style>
