<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api';
import { useField } from '../store/field';
import { useUser } from '../store/user';
import { useNotice } from '../store/notice';
import { ask } from '../utils/ask';
import { said } from '../utils/time';
import { toast } from '../utils/toast';
import { glyphOf } from '../icons';
import FieldPager from '../components/FieldPager.vue';
import FenceToggle from '../components/FenceToggle.vue';
import WheatField from '../components/WheatField.vue';
import InboxFence from '../components/InboxFence.vue';
import ProfileFence from '../components/ProfileFence.vue';
import BackVine from '../components/BackVine.vue';
import VineScroll from '../components/VineScroll.vue';
import Glyph from '../components/Glyph.vue';

const route = useRoute();
const router = useRouter();
const field = useField();
const user = useUser();
const notice = useNotice();
field.refresh();
user.load();
onMounted(() => notice.load());

const inboxOpen = ref(false);
const inboxTab = ref('notes');
const inboxScope = ref('in');
const profileOpen = ref(false);
const openInbox = (tab, scope = 'in') => {
  inboxTab.value = tab;
  inboxScope.value = scope;
  inboxOpen.value = true;
};

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

/* ——— 挖过的地：一页就摊三行，三张四张轮着来，满三行就翻下一捆 ——— */
const CYCLE = [3, 4, 3];
const PER = CYCLE.reduce((a, b) => a + b, 0);
const page = ref(1);
const q = ref('');
const mineBody = ref(null);
// 手机上整页跟着手指走，翻页后回到这一页的头一张，别停在上一页的田尾
async function turnPage(n) {
  page.value = n;
  await nextTick();
  if (mineBody.value && getComputedStyle(mineBody.value.closest('.mine')).overflowY === 'auto')
    mineBody.value.scrollIntoView({ block: 'start' });
}
// 四道田垄：自己种的、看完了采回来的、三处满了暂放在田埂上的、别人院里夹进书里的
const tab = ref(['picked', 'held', 'kept'].includes(route.query.tab) ? route.query.tab : 'plots');
const TABS = [
  { key: 'plots', label: '我的地' },
  { key: 'picked', label: '采回的' },
  { key: 'held', label: '没种下的' },
  { key: 'kept', label: '夹在书里的' }
];
const plots = computed(() => field.sessions.filter(s => s.placement !== 'picked' && s.placement !== 'held'));
const picked = computed(() => field.sessions.filter(s => s.placement === 'picked'));
const held = computed(() => field.sessions.filter(s => s.placement === 'held'));
const keepList = ref([]);
const keepsReady = ref(false);
const placingId = ref(0);
async function loadKeeps() {
  if (keepsReady.value) return;
  try {
    const d = await api.keeps();
    keepList.value = d.list;
  } finally {
    keepsReady.value = true;
  }
}
watch(tab, t => {
  page.value = 1;
  if (t === 'kept') loadKeeps();
});
if (tab.value === 'kept') loadKeeps();

const source = computed(() => tab.value === 'picked' ? picked.value
  : tab.value === 'held' ? held.value
    : tab.value === 'kept' ? keepList.value : plots.value);
// 新开的地和刚动过的地排在前面；找地的时候只在名字、题目和那句问题里找
const found = computed(() => {
  const k = q.value.trim().toLowerCase();
  if (!k) return source.value;
  return source.value.filter(s =>
    [s.title, s.question, s.topic_name, s.nickname, s.garden_name]
      .some(v => (v || '').toLowerCase().includes(k)));
});
const pages = computed(() => Math.max(1, Math.ceil(found.value.length / PER)));
watch(q, () => (page.value = 1));
watch(pages, p => { if (page.value > p) page.value = p; });

// 三张、四张轮着摊，一行几张卡片就多宽，堆出来才有层次
const rows = computed(() => {
  const list = found.value.slice((page.value - 1) * PER, page.value * PER);
  const out = [];
  let k = 0;
  while (list.length) out.push(list.splice(0, CYCLE[k++ % 2]));
  return out;
});

const open = s => {
  if (tab.value === 'kept') {
    if (s.hidden) return toast('主人把这滴收起来了，只在自家院里看');
    if (!s.opened) return router.push('/garden/' + s.owner_id);
    return router.push(`/garden/${s.owner_id}?session=${s.id}`);
  }
  if (tab.value === 'picked' || tab.value === 'held') return router.push('/review/' + s.id);
  return router.push(s.status === 'running' ? '/think/' + s.id : '/review/' + s.id);
};
// 采回来的叶子重新挂上主页：树上、地上、风里，还是原来那三处
async function replant(s, where) {
  if (placingId.value) return;
  placingId.value = s.id;
  try {
    await api.place(s.id, where);
    field.patch(s.id, { placement: where });
    toast(where === 'wind' ? '交给风了' : where === 'ground' ? '种回地上了' : '挂回树上了');
    // 种回哪处，就顺着藤或风跟到主页去看它
    setTimeout(() => router.push('/?focus=' + s.id), 1200);
  } finally {
    placingId.value = 0;
  }
}
async function unkeep(s) {
  const out = await ask({
    title: '把这片叶子取出来？',
    body: '取出来，书里就不留这一片了。想再看，得回人家院里重新夹。',
    ok: '取出来', cancel: '先留着', icon: 'leaf'
  });
  if (!out) return;
  await api.unkeep(s.id);
  keepList.value = keepList.value.filter(k => k.id !== s.id);
  toast('从书里取出来了');
}
const badgeOf = s => tab.value === 'picked' ? '采回的'
  : tab.value === 'held' ? '待安顿'
    : tab.value === 'kept' ? (s.hidden ? '只主人看' : s.placement === 'picked' ? '主人收着' : s.opened ? '夹着' : '门里')
      : s.status === 'running' ? '生长中' : '已封存';
const tabCount = k => k === 'picked' ? picked.value.length
  : k === 'held' ? held.value.length : k === 'kept' ? keepList.value.length : plots.value.length;
const emptyOf = computed(() => tab.value === 'picked'
  ? '还没采回什么。在自己的地里读完，底下会问你要不要采回来。'
  : tab.value === 'held'
    ? '田埂上还空着。树上、地上、风里都满了的时候，封好的地会先寄放在这儿。'
    : tab.value === 'kept'
      ? '书里还空着。去串门时，读到喜欢的叶子可以夹一片。'
      : '还没开过地，随便挑一块试试。');

// 顺着藤摸回那片叶子：从串门夹回后跳进来，藤先长，再停在卡片上
const focusId = Number(route.query.focus) || 0;
const locating = ref(0);
async function locateFocus() {
  if (!focusId || !field.ready || (tab.value === 'kept' && !keepsReady.value)) return;
  const i = found.value.findIndex(s => s.id === focusId);
  if (i < 0) return;
  const target = Math.floor(i / PER) + 1;
  if (page.value !== target) {
    page.value = target;
    await nextTick();
  }
  await nextTick();
  const el = mineBody.value?.querySelector(`[data-id="${focusId}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  locating.value = focusId;
  setTimeout(() => (locating.value = 0), 3600);
}
watch([keepsReady, () => field.ready], locateFocus, { immediate: true });

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
    <BackVine/>
    <header class="top-nav">
      <div class="logo">我的田地</div>
      <nav>
        <button v-if="notice.messages" class="btn-ghost note-btn" @click="openInbox('notes')">
          <Glyph name="leaf" :size="15"/> {{ notice.messages }} 条留言
        </button>
        <button v-if="notice.replies" class="nav-note" title="你留出去的话，有人回了"
          @click="openInbox('notes', 'out')">
          <Glyph name="pen" :size="13"/> 篱上回音 {{ notice.replies }} 人
        </button>
        <button v-if="notice.doors" class="nav-note door" @click="openInbox('knocks')">
          <Glyph name="bell" :size="13"/> {{ notice.doors }} 处动静
        </button>
        <button v-if="notice.approvals" class="nav-note door" title="有人给你开了门"
          @click="openInbox('knocks')">
          <Glyph name="home" :size="13"/> 门开了 {{ notice.approvals }} 处
        </button>
        <button v-if="notice.declined" class="nav-note door" title="门那边递来一句话"
          @click="openInbox('knocks')">
          <Glyph name="leaf" :size="14"/> 门外回音 {{ notice.declined }} 句
        </button>
        <router-link v-if="user.user?.id" class="btn-ghost yard-btn" title="小院里的花草都记得你"
          :to="'/garden/' + user.user.id">回我的小院</router-link>
        <button class="btn-ghost" @click="router.push('/')">去开新地</button>
        <button class="avatar" title="改名字、换把钥匙" @click="profileOpen = true">
          {{ (user.user?.nickname || '田')[0] }}
        </button>
      </nav>
    </header>

    <div class="fence-bar">
      <FenceToggle :open="vis === 'public'" @toggle="toggleFence"/>
      <div class="tabs" role="tablist" aria-label="我的田地分类">
        <button v-for="t in TABS" :key="t.key" role="tab" :aria-selected="tab === t.key"
          :class="{ on: tab === t.key }" @click="tab = t.key">
          {{ t.label }}<i v-if="tabCount(t.key)">{{ tabCount(t.key) }}</i>
        </button>
      </div>
      <label class="find">
        <Glyph name="leaf" :size="15"/>
        <input v-model="q" :placeholder="tab === 'kept' ? '找找哪片叶子…' : tab === 'picked' ? '找找采回的…' : tab === 'held' ? '找找没种下的…' : '找找哪块地…'"
          aria-label="搜索我的田地"/>
        <i v-if="q">{{ found.length }} 块</i>
      </label>
      <Transition name="say">
        <p v-if="fenceSay" class="fence-say">{{ fenceSay }}</p>
      </Transition>
    </div>

    <div class="mine-roll">
    <main ref="mineBody" class="roll">
      <div v-if="!field.ready" class="loading">土还在翻</div>

      <template v-else>
        <p v-if="tab === 'kept' && !keepsReady" class="empty">书页还在翻…</p>
        <p v-else-if="!source.length" class="empty">{{ emptyOf }}</p>
        <p v-else-if="!found.length" class="empty">没找着这块地，换个词试试。</p>
        <Transition v-else name="sheaf" mode="out-in">
          <div :key="tab + page" class="cards">
            <div v-for="(row, ri) in rows" :key="ri" class="rank">
              <article v-for="(s, i) in row" :key="s.id" class="s-card" :style="plot(ri, i, s)"
                :data-id="s.id" :class="{ locked: tab === 'kept' && !s.opened, locate: locating === s.id }"
                @click="open(s)">
                <svg v-if="locating === s.id" class="locate-vine" viewBox="0 0 70 260"
                  preserveAspectRatio="none" aria-hidden="true">
                  <path class="stalk" pathLength="1"
                    d="M10 -6 C 48 40, 4 86, 34 128 C 60 166, 12 204, 40 262"/>
                  <path class="tendril" pathLength="1" d="M34 128 C 52 120, 60 126, 66 140"/>
                  <path class="tendril two" pathLength="1" d="M26 74 C 8 64, 4 72, 2 86"/>
                </svg>
                <span v-if="locating === s.id" class="locate-note">顺着藤，找到它了</span>
                <div class="s-top">
                  <span class="s-topic" :title="tab === 'kept' ? s.garden_name : s.topic_name">
                    <Glyph :name="tab === 'kept' ? 'home' : glyphOf({ name: s.topic_name })" :size="40"/>
                    <template v-if="tab === 'kept'">{{ s.garden_name }}</template>
                    <span v-if="s.has_img" class="s-img" title="这块地里有照片"><Glyph name="image" :size="40"/></span>
                  </span>
                  <span class="badge" :class="tab === 'kept' && !s.opened ? 'finished' : s.status">
                    {{ badgeOf(s) }}
                  </span>
                </div>
                <h3>{{ s.title || '这片叶子收在门里' }}</h3>
                <p v-if="s.question" class="s-q">{{ s.question }}</p>
                <p v-if="tab === 'kept' && !s.opened" class="s-q locked-say">
                  {{ s.hidden ? '主人把这一叶上的水滴滴收起来了，只在自己院里看。'
                    : '主人把门围上了。去篱笆外说句话，开了门再接着看。' }}
                </p>
                <div class="s-foot">
                  <span v-if="tab === 'kept' && !s.opened">门里</span>
                  <span v-else>{{ s.level }}层·{{ s.thought_count }}想法</span>
                  <span class="s-time">{{ said(tab === 'kept' ? s.kept_at : s.ended_at || s.last_at) }}</span>
                  <button v-if="tab === 'plots'" class="s-del" @click.stop="del(s)">铲掉</button>
                  <button v-else-if="tab === 'kept'" class="s-del" @click.stop="unkeep(s)">取出来</button>
                </div>
                <div v-if="tab === 'picked' || tab === 'held'" class="s-acts" @click.stop>
                  <button :disabled="!!placingId" @click="replant(s, 'tree')">挂树上</button>
                  <button :disabled="!!placingId" @click="replant(s, 'ground')">种地上</button>
                  <button :disabled="!!placingId" @click="replant(s, 'wind')">交给风</button>
                </div>
              </article>
            </div>
          </div>
        </Transition>
      </template>
    </main>
    <VineScroll :el="mineBody"/>
    </div>

    <!-- 跟回看那块地站在同一个高度：底下垫一条麦田，别贴着窗口边 -->
    <footer v-if="field.ready && pages > 1" class="foot">
      <FieldPager :page="page" :pages="pages" big @go="turnPage"/>
    </footer>

    <WheatField class="wheat" :n="12"/>
    <InboxFence :open="inboxOpen" :tab="inboxTab" :scope="inboxScope" @close="inboxOpen = false"/>
    <ProfileFence :open="profileOpen" @close="profileOpen = false"/>
  </div>
</template>

<style scoped>
.mine { position: relative; height: 100vh; height: 100dvh; display: flex; flex-direction: column; overflow: hidden;
  padding-left: clamp(78px, 7.5vw, 118px); padding-bottom: env(safe-area-inset-bottom);
  --fs-xs: calc(21px * var(--ui-scale)); --fs-sm: calc(22px * var(--ui-scale));
  --fs-md: calc(23px * var(--ui-scale)); --fs-base: calc(25px * var(--ui-scale));
  --fs-read: calc(27px * var(--ui-scale)); --fs-head: calc(30px * var(--ui-scale));
  --fs-title: calc(33px * var(--ui-scale)); --fs-hero: calc(40px * var(--ui-scale)); font-size: var(--fs-base); }
.mine .top-nav { padding-left: 6px; }
.nav-note { display: inline-flex; align-items: center; gap: 5px; font-size: var(--fs-md); color: var(--grass-deep);
  letter-spacing: .04em; padding: 2px 3px 4px;
  text-decoration: underline wavy rgba(79, 107, 58, .42) 1px; text-underline-offset: 4px; }
.nav-note.door { color: var(--wood); text-decoration-color: rgba(139, 107, 74, .42); }
.nav-note:hover { color: var(--clay); }
/* 留言也穿小院和开地那件纸边衣裳，只是颜色留成草色 */
.note-btn { display: inline-flex; align-items: center; gap: 5px; color: var(--grass-deep);
  letter-spacing: .04em; box-shadow: inset 0 0 0 1.3px rgba(79, 107, 58, .34); }
.note-btn:hover { color: var(--grass-deep); background: rgba(79, 107, 58, .09);
  box-shadow: inset 0 0 0 1.4px rgba(79, 107, 58, .55); }
.note-btn:active { box-shadow: inset 0 0 0 1.3px rgba(79, 107, 58, .4), var(--pressed); }
.yard-btn { display: inline-flex; align-items: center; gap: 5px; }
.fence-bar { flex: none; display: flex; align-items: center; gap: 18px; min-height: 52px;
  padding: 0 max(24px, 4vw); --fence-note: calc(25px * var(--ui-scale)); }
.fence-bar :deep(.fence-svg) { width: 91px; height: 50px; }
/* 三道田垄：自己种的、采回来的、别人院里夹着的 */
.tabs { display: flex; align-items: center; gap: 4px; flex: none; }
.tabs button { display: inline-flex; align-items: baseline; gap: 4px; padding: 3px 9px 5px;
  font-size: calc(25px * var(--ui-scale)); color: var(--ink-faint); letter-spacing: .05em;
  border-bottom: 1.2px dashed transparent; transition: color .3s, border-color .3s; }
.tabs button i { font-style: normal; font-size: var(--fs-xs); color: var(--ink-faint); }
.tabs button:hover { color: var(--wood); }
.tabs button.on { color: var(--grass-deep); border-bottom-color: rgba(79, 107, 58, .5); }
.tabs button.on i { color: var(--grass-deep); }
.fence-say { font-size: var(--fs-sm); color: var(--ink-faint); letter-spacing: 1.5px; }
/* 找地：一道田埂，一片叶，没有输入框的方角 */
.find { display: flex; align-items: center; gap: 6px; width: min(260px, 32vw); color: var(--ink-faint);
  border-bottom: 1.2px dashed rgba(150, 133, 100, .45); transition: color .35s, border-color .35s; }
.find input { flex: 1; min-width: 0; padding: 3px 0 5px; font-size: var(--fs-md); color: var(--ink); background: none; }
.find input::placeholder { font-style: italic; color: #B0A898; }
.find input:focus { outline: none; }
.find:focus-within { color: var(--grass-deep); border-bottom-color: rgba(79, 107, 58, .55); }
.find i { font-style: normal; font-size: var(--fs-xs); color: var(--ink-faint); white-space: nowrap; }
.say-enter-active, .say-leave-active { transition: opacity .4s, transform .4s; }
.say-enter-from, .say-leave-to { opacity: 0; transform: translateY(4px); }
/* 地是敞的：中间不再套一只窄盒子，有几张纸就摊几张 */
.mine-roll { position: relative; flex: 1; min-height: 0; display: flex; flex-direction: column; }
main { flex: 1; min-height: 0; padding: 10px max(24px, 4vw) 14px; }
.foot { flex: none; padding: 4px max(24px, 4vw) 14px; }
.wheat { position: relative; flex: none; z-index: 21; }

.empty { text-align: center; padding: 40px 0 10px; color: var(--ink-soft); }
.cards { padding: 8px 2px 0; }
/* 一行一垅：这垅摆几张，纸就摊多宽，垅与垅之间留出踩脚的地方 */
.rank { display: flex; align-items: flex-start; gap: 22px 22px; margin-bottom: 22px; }
.rank:last-child { margin-bottom: 0; }
.s-card { position: relative; flex: 1 1 0; min-width: 0; max-width: 380px; padding: 12px 18px 11px; cursor: pointer;
  transform: translateY(var(--ty)) rotate(var(--rot));
  background: radial-gradient(105% 88% at 22% 14%, rgba(94, 83, 64, .045), transparent 60%), var(--card);
  border: 1.4px dashed rgba(150, 133, 100, .45);
  border-radius: var(--r-a); box-shadow: var(--emboss-soft);
  transition: transform .5s cubic-bezier(.22, .8, .26, 1), box-shadow .5s, opacity .45s; }
.s-card:hover { transform: translateY(calc(var(--ty) - 4px)) rotate(0deg); box-shadow: var(--emboss-lift); }
.s-top { display: flex; justify-content: space-between; align-items: center; }
.s-topic { display: inline-flex; align-items: center; gap: 6px; min-width: 0; font-size: var(--fs-md); color: var(--wood); }
.s-img { display: inline-flex; align-items: center; color: var(--wood); }
.badge { flex: none; white-space: nowrap; font-size: var(--fs-sm); border-radius: var(--r-c); padding: 1px 11px 2px; }
.badge.running { background: rgba(127, 166, 80, .18); color: var(--grass-deep); }
.badge.finished { background: rgba(139, 107, 74, .15); color: var(--wood); }
h3 { margin: 4px 0 0; font-size: var(--fs-read); font-weight: normal; }
.s-q { font-size: var(--fs-base); color: var(--ink-soft); line-height: 1.55; }
.s-foot { display: flex; align-items: center; gap: 5px; margin-top: 8px;
  font-size: var(--fs-sm); color: var(--ink-soft); white-space: nowrap; }
.s-foot > span:first-child { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.s-time { flex: none; white-space: nowrap; }
.s-del { flex: none; color: var(--ink-soft); font-size: var(--fs-sm); white-space: nowrap; }
.s-del:hover { color: #B0533B; }
/* 采回来的叶子再挑个地方种回主页 */
.s-acts { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 12px; margin-top: 8px;
  padding-top: 7px; border-top: 1px dashed rgba(150, 133, 100, .3); }
.s-acts button { font-size: var(--fs-sm); color: var(--wood); letter-spacing: .04em;
  text-decoration: underline wavy rgba(139, 107, 74, .38) 1px; text-underline-offset: 4px; }
.s-acts button:hover { color: var(--grass-deep); }
.s-acts button:disabled { opacity: .45; cursor: default; }
.s-card.locked { opacity: .82; }
.locked-say { color: var(--ink-faint); }
/* 从书里找到这一片：一根藤先顺着纸边摸下来，再停在卡片上 */
.s-card.locate { box-shadow: 0 0 0 1.5px rgba(79, 107, 58, .42), 0 10px 24px rgba(79, 107, 58, .14); }
.locate-vine { position: absolute; left: -19px; top: -12px; width: 70px; height: calc(100% + 28px);
  overflow: visible; pointer-events: none; }
.locate-vine path { fill: none; stroke: var(--grass-deep); stroke-linecap: round; stroke-width: 2;
  stroke-dasharray: 1; stroke-dashoffset: 1; opacity: .72;
  animation: vineLocate 1.4s cubic-bezier(.2, .72, .3, 1) forwards; }
.locate-vine .tendril { stroke-width: 1.4; animation-delay: .55s; }
.locate-vine .tendril.two { animation-delay: .8s; }
.locate-note { position: absolute; left: 4px; bottom: -19px; font-size: var(--fs-xs); color: var(--grass-deep);
  letter-spacing: .08em; white-space: nowrap; animation: fadeUp .5s ease-out 1.2s backwards; }
@keyframes vineLocate { to { stroke-dashoffset: 0; } }
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
  .mine { padding-left: max(60px, env(safe-area-inset-left)); }
  .mine .top-nav { padding-left: 0; }
  .fence-bar { flex-wrap: wrap; gap: 2px 12px; padding-top: 4px; padding-bottom: 6px; }
  .fence-bar :deep(.fence-svg) { width: 76px; height: 42px; }
  /* 四道田垄排成一行，窄了就在这一行里横着摸，不各占一行 */
  .tabs { flex: 1 1 100%; flex-wrap: nowrap; gap: 0 6px; overflow-x: auto;
    overscroll-behavior-x: contain; scrollbar-width: none; }
  .tabs::-webkit-scrollbar { display: none; }
  .tabs button { flex: none; padding: 3px 3px 5px; }
  .find { order: 3; width: 100%; }
  .rank { gap: 18px 12px; }
  .s-card { flex: 1 1 44%; max-width: none; }
}
/* 再窄就一张纸一垅，标题和徽记不必挤在一行里 */
@media (max-width: 620px) {
  /* 手机屏幕短，题头、田垄、翻页和麦子一起顺着手指走，
     别把中间那块地挤成一条缝 */
  .mine { overflow-y: auto; overscroll-behavior: contain; }
  .mine-roll { flex: none; }
  .mine-roll main { flex: none; overflow: visible; }
  .rank { flex-direction: column; gap: 18px; }
  .s-card { flex: 1 1 auto; width: 100%; }
  .s-foot { flex-wrap: wrap; white-space: normal; }
  .s-time { margin-left: auto; }
  /* 两个门牌和头像并排走，别一个占一行 */
  .mine .top-nav nav { gap: 5px; }
  .mine .top-nav nav .btn-ghost { position: static; padding: 6px 8px 7px;
    font-size: calc(22px * var(--ui-scale)); }
  .mine .top-nav nav .avatar { margin-left: 2px; }
}
/* 手机一巴掌宽：四道田垄摆成两行，谁都不用藏在横滑后头 */
@media (max-width: 480px) {
  .tabs { flex-wrap: wrap; gap: 0 12px; overflow: visible; }
  .tabs button { flex: 0 0 calc(50% - 6px); padding: 3px 0 5px;
    font-size: calc(22px * var(--ui-scale)); }
}
</style>
