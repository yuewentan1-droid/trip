<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api';
import { useUser } from '../store/user';
import { useNotice } from '../store/notice';
import { dimOf } from '../constants/dimensions';
import { glyphOf } from '../icons';
import SoulTree from '../components/SoulTree.vue';
import WheatField from '../components/WheatField.vue';
import PenText from '../components/PenText.vue';
import MessageNotes from '../components/MessageNotes.vue';
import FieldPager from '../components/FieldPager.vue';
import Glyph from '../components/Glyph.vue';

const route = useRoute();
const router = useRouter();
const user = useUser();
const notice = useNotice();
const garden = ref(null);
const sessions = ref([]);
const messages = ref([]);
const total = ref(0);
const mode = ref('');
const fenced = ref(false);
const knockState = ref('');
const knocking = ref(false);
const ready = ref(false);
const top = computed(() => Math.max(0, ...sessions.value.map(s => s.level || 1)));
const loose = computed(() => sessions.value.filter(s => s.placement && s.placement !== 'tree'));
const mine = computed(() => garden.value && garden.value.id === user.user?.id);
const PER = 4;
const page = ref(1);
const pages = computed(() => Math.max(1, Math.ceil(total.value / PER)));

/* ——— 点开树上一片叶子：别人的地只给看，不能改也不能删 ——— */
const read = ref(null);
const readOpen = ref(false);
const readBusy = ref(false);
const seen = new Map();
async function peek(s) {
  if (mine.value) return router.push(s.status === 'running' ? '/think/' + s.id : '/review/' + s.id);
  readOpen.value = true;
  if (seen.has(s.id)) return (read.value = seen.get(s.id));
  readBusy.value = true;
  try {
    const d = await api.gardenSession(garden.value.id, s.id);
    seen.set(s.id, d);
    read.value = d;
  } catch {
    readOpen.value = false;
  } finally {
    readBusy.value = false;
  }
}
const readThoughts = computed(() => (read.value ? read.value.thoughts.slice().reverse() : []));

async function load() {
  ready.value = false;
  fenced.value = false;
  knockState.value = '';
  readOpen.value = false;
  read.value = null;
  seen.clear();
  page.value = 1;
  try {
    const d = await api.garden(route.params.userId);
    garden.value = d.garden;
    sessions.value = d.sessions;
    messages.value = d.messages;
    total.value = d.message_total;
    mode.value = d.mode;
  } catch (e) {
    fenced.value = true;
    knockState.value = e.data?.knock || '';
  } finally {
    ready.value = true;
  }
}

/* ——— 篱笆上的话：一页四句，主人能回，留话的人能抹 ——— */
async function loadMessages() {
  const d = await api.gardenMessages(garden.value.id, page.value);
  messages.value = d.list;
  total.value = d.total;
}
async function goPage(p) {
  page.value = p;
  await loadMessages();
}
async function erase(m) {
  await api.delMessage(m.id);
  await loadMessages();
  if (!messages.value.length && page.value > 1) {
    page.value--;
    await loadMessages();
  }
}
function replied() {
  notice.load();
}

/* ——— 围起来的门：敲一下，等主人决定开哪几块地 ——— */
async function knock() {
  if (!user.isLogin) return router.push({ path: '/login', query: { to: route.fullPath } });
  knocking.value = true;
  try {
    const d = await api.knock(route.params.userId);
    knockState.value = d.status;
    if (d.status === 'approved') await load();
  } finally {
    knocking.value = false;
  }
}

/* ——— 留句话 ——— */
const open = ref(false);
const draft = ref('');
const sending = ref(false);
const sent = ref(false);
const note = ref('');
const box = ref(null);
let closeTimer, sentTimer;

function write() {
  if (mine.value || !user.isLogin) return;
  draft.value = '';
  note.value = '';
  sent.value = false;
  open.value = true;
}
function shut() {
  if (sending.value) return;
  open.value = false;
}
async function send() {
  const content = draft.value.trim();
  if (!content || sending.value) return;
  if ([...content].length > 200) return (note.value = '话太长了，收一收');
  sending.value = true;
  note.value = '';
  try {
    await api.addMessage(garden.value.id, { content });
    page.value = 1;
    await loadMessages();
    draft.value = '';
    sent.value = true;
    clearTimeout(closeTimer);
    clearTimeout(sentTimer);
    closeTimer = setTimeout(() => (open.value = false), 800);
    sentTimer = setTimeout(() => (sent.value = false), 1300);
  } catch (e) {
    note.value = e.code === 429 ? '今天说得够多了，明天再来' : e.message;
  } finally {
    sending.value = false;
  }
}
watch(open, on => {
  if (on) nextTick(() => box.value?.focus());
});
watch(() => route.params.userId, load);

onMounted(() => {
  load();
  notice.load();
});
</script>

<template>
  <div class="garden">
    <p v-if="!ready" class="loading">土还在翻</p>

    <template v-else-if="fenced">
      <div class="closed">
        <svg class="fence" viewBox="0 0 260 140" fill="none" aria-hidden="true">
          <g class="ink">
            <path class="post" pathLength="1" d="M40 24 C 38 59, 40.6 95, 39 129"/>
            <path class="post" pathLength="1" d="M220 24 C 222 58, 219.4 96, 221 129"/>
            <path class="rail" pathLength="1" d="M30 46 C 78 43, 122 48, 168 45 C 195 43.4, 213 45, 231 44"/>
            <path class="rail" pathLength="1" d="M30 73 C 76 76, 122 70, 168 74 C 196 76.4, 214 74, 231 74"/>
            <path class="rail" pathLength="1" d="M30 100 C 80 97, 124 102, 170 99 C 196 97.4, 214 99, 231 98"/>
            <path class="rail" pathLength="1" d="M30 121 C 78 124, 120 119, 166 122 C 194 124, 214 122, 231 122"/>
            <path class="tuft" pathLength="1" d="M124 137 C 122 128, 121 122, 118 116 M131 137 C 131.6 127, 133 121, 136 115 M139 137 C 141 129, 144 124, 149 120"/>
          </g>
        </svg>
        <p v-if="knockState === 'pending'">门已经敲过了，主人还在院里</p>
        <p v-else-if="knockState === 'declined'">主人这回没开门</p>
        <p v-else>这块地围起来了</p>
        <div class="fence-acts">
          <button v-if="user.isLogin && knockState !== 'pending'" class="knock-btn"
            :disabled="knocking" @click="knock">
            <Glyph name="home" :size="16"/> {{ knockState === 'declined' ? '再敲一次' : '敲敲门' }}
          </button>
          <router-link v-else-if="!user.isLogin" class="wavy-link"
            :to="{ path: '/login', query: { to: route.fullPath } }">先登录，再来敲门</router-link>
          <span v-else class="wait-leaf"><Glyph name="leaf" :size="14"/> 等主人来看看</span>
          <router-link class="wavy-link quiet" to="/visits">回串门</router-link>
        </div>
      </div>
    </template>

    <template v-else>
      <header class="g-top">
        <div class="g-title">
          <h1>{{ garden.garden_name }}</h1>
          <p v-if="garden.bio">{{ garden.bio }}</p>
        </div>
        <nav class="g-links">
          <span v-if="sessions.length">第 {{ top }} 层</span>
          <span v-if="mode === 'knock'" class="knock-open">
            主人开了 {{ sessions.length }} 块地给你看
          </span>
          <button v-if="mode === 'public' && !mine && user.isLogin" @click="write">留句话</button>
          <router-link v-else-if="mode === 'public' && !mine" class="g-login"
            :to="{ path: '/login', query: { to: route.fullPath } }">登录后留句话</router-link>
          <router-link class="g-back" to="/visits">回串门</router-link>
        </nav>
      </header>

      <main class="g-main roll">
        <section class="g-tree">
          <svg class="art strata" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true">
            <path v-for="i in 5" :key="i"
              :d="`M2 ${i * 11} C 20 ${i * 11 - 4}, 38 ${i * 11 + 3}, 56 ${i * 11 - 2} C 72 ${i * 11 - 5}, 86 ${i * 11 + 2}, 98 ${i * 11 - 1}`"/>
          </svg>
          <svg class="art water" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
            <path v-for="i in 4" :key="i"
              :d="`M${4 + i * 3} ${i * 7} C 26 ${i * 7 - 3}, 48 ${i * 7 + 3}, 70 ${i * 7 - 1} C 82 ${i * 7 - 2}, 90 ${i * 7 + 1}, 96 ${i * 7}`"/>
          </svg>
          <SoulTree class="g-soul" :sessions="sessions" peek @open="peek"/>
          <p v-if="mode === 'knock'" class="look">只开了这几块地，别处还围着</p>
          <p v-else-if="!mine" class="look">这是别人的地，点一片叶子看看，不能改</p>
        </section>

        <section v-if="loose.length" class="g-loose" aria-label="种在地上和交给风的几块地">
          <span class="loose-tag"><Glyph name="leaf" :size="13"/> 地上和风里</span>
          <button v-for="s in loose" :key="s.id" @click="peek(s)">
            <Glyph :name="s.placement === 'wind' ? 'fly' : 'leaf'" :size="14"/>
            <span>{{ s.title }}</span>
            <i>{{ s.placement === 'wind' ? '风里' : '地上' }}</i>
          </button>
        </section>

        <section v-if="mode !== 'knock' && (total || mine)" class="g-words">
          <h2>
            <Glyph name="leaf" :size="15"/>
            篱笆上的话
            <i v-if="total">{{ total }}</i>
          </h2>
          <MessageNotes :list="messages" :owner="mine" erase @erase="erase" @replied="replied"/>
          <FieldPager v-if="pages > 1" :page="page" :pages="pages" @go="goPage"/>
        </section>
      </main>

      <footer class="g-foot">
        <WheatField class="g-wheat" :n="16"/>
      </footer>

      <Transition name="read">
        <div v-if="readOpen" class="read-mask" @click.self="readOpen = false">
          <article class="read-sheet" role="dialog" aria-label="别人的一块地">
            <button class="read-x" title="合上" @click="readOpen = false"><Glyph name="close" :size="14"/></button>
            <template v-if="read">
              <p class="read-topic">
                <Glyph :name="glyphOf({ name: read.session.topic_name })" :size="16"/>
                {{ read.session.topic_name }}
              </p>
              <h2>{{ read.session.title }}</h2>
              <p v-if="read.session.question" class="read-q">“{{ read.session.question }}”</p>
              <p class="read-meta">第 {{ read.session.level }} 层 · {{ read.session.thought_count }} 滴 · 只许看</p>
              <div class="read-stream">
                <div v-for="t in readThoughts" :key="t.id" class="read-drop" :style="{ '--c': dimOf(t.dimension).color }">
                  <span class="read-leaf">{{ t.dimension }}</span>
                  <PenText :text="t.content"/>
                </div>
              </div>
            </template>
            <p v-else class="read-loading">{{ readBusy ? '叶子还在翻' : '这片叶子是空的' }}</p>
          </article>
        </div>
      </Transition>

      <Transition name="sheet">
        <div v-if="open" class="sheet-mask" @click.self="shut">
          <section class="sheet">
            <span v-if="sent" class="fly-leaf" aria-hidden="true">
              <svg viewBox="0 0 18 18" fill="none">
                <path d="M3 15 C 3.4 8.6, 7.4 4.4, 15 3 C 14.2 10.4, 10.4 14.2, 3 15 Z"/>
                <path d="M3.4 14.6 C 6.4 11.4, 9.4 8.6, 13 5.8"/>
              </svg>
            </span>
            <form @submit.prevent="send">
              <h3>给{{ garden.garden_name }}留句话</h3>
              <textarea ref="box" v-model="draft" rows="2" maxlength="200" :disabled="sending"
                aria-label="留句话"/>
              <svg class="ink-line" :class="{ draw: sent }" viewBox="0 0 600 5" preserveAspectRatio="none" aria-hidden="true">
                <path pathLength="1" d="M2 3 C 110 1.6, 220 4.2, 330 2.8 C 430 1.4, 520 3.6, 598 2.6"/>
              </svg>
              <p class="hint">最多 200 字 · 说点实在的</p>
              <p v-if="note" class="note">{{ note }}</p>
              <div class="sheet-foot">
                <button type="submit" class="leave" :disabled="sending || !draft.trim()">留下了</button>
              </div>
            </form>
          </section>
        </div>
      </Transition>
    </template>
  </div>
</template>

<style scoped>
.garden { position: relative; display: flex; flex-direction: column; height: 100vh; height: 100dvh; overflow: hidden; }
.loading { margin-top: 30vh; }

.g-top { flex: none; display: flex; align-items: flex-start; justify-content: space-between; gap: 24px;
  padding: 24px max(24px, 6vw) 12px; z-index: 4; }
.g-title h1 { font-size: 32px; font-weight: 400; letter-spacing: 1px; color: #3D3229; line-height: 1.35; }
.g-title p { margin-top: 2px; font-size: 14px; letter-spacing: 1px; color: #8A7A66; }
.g-links { display: flex; align-items: center; gap: 24px; padding-top: 9px; flex: none; }
.g-links span, .g-links button, .g-links a { font-size: 14px; letter-spacing: 1px; color: #8A7A66; transition: color .3s; }
.g-links button { text-decoration: underline wavy rgba(139, 107, 74, .55) 1px; text-underline-offset: 6px; }
.g-links button:hover, .g-links a:hover { color: var(--wood); }
.g-back { text-decoration: underline wavy rgba(139, 107, 74, .4) 1px; text-underline-offset: 6px; }
.knock-open { color: var(--grass-deep); font-size: 12px; }
.g-login { text-decoration: underline wavy rgba(139, 107, 74, .4) 1px; text-underline-offset: 6px; }

.g-main { flex: 1; min-height: 0; padding-bottom: 150px; }
.g-tree { position: relative; height: 52vh; min-height: 360px; }
.art { position: absolute; fill: none; stroke: var(--graphite); stroke-width: 1; opacity: .15;
  stroke-linecap: round; pointer-events: none; }
.art path { vector-effect: non-scaling-stroke; }
.strata { left: 2%; top: 12%; width: 38%; height: 44%; }
.water { left: 6%; bottom: 6%; width: 88%; height: 30%; stroke: var(--sky); opacity: .3; }
.g-soul { position: absolute; left: 50%; top: 46%; width: 34%; max-width: 470px; aspect-ratio: 1;
  transform: translate(-50%, -50%); }
.look { position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%); white-space: nowrap;
  font-size: 12px; letter-spacing: 2px; color: #A89880; }
/* 没挂在枝上的地也得让人看见：一片片摊在树脚下 */
.g-loose { display: flex; align-items: baseline; justify-content: center; flex-wrap: wrap; gap: 7px 20px;
  width: min(900px, calc(100% - 2 * max(24px, 6vw))); margin: -6px auto 8px; padding: 9px 0 10px;
  border-top: 1.1px dashed rgba(150, 133, 100, .3); border-bottom: 1.1px dashed rgba(150, 133, 100, .3); }
.loose-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; letter-spacing: .1em;
  color: var(--ink-faint); }
.g-loose button { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; letter-spacing: .05em;
  color: var(--ink-soft); text-decoration: underline wavy rgba(150, 133, 100, .4) 1px;
  text-underline-offset: 4px; transition: color .3s; }
.g-loose button:hover { color: var(--grass-deep); }
.g-loose button :deep(svg) { color: var(--grass-deep); }
.g-loose i { font-style: normal; font-size: 10.5px; color: var(--ink-faint); letter-spacing: .04em; }

.g-words { width: min(1120px, calc(100% - 2 * max(24px, 5vw))); margin: 0 auto; padding: 16px 0 30px; }
.g-words h2 { display: flex; align-items: center; justify-content: center; gap: 7px;
  font-size: 14px; font-weight: 400; letter-spacing: 2px; color: #8A7A66; margin-bottom: 14px; }
.g-words h2 i { font-style: normal; font-size: 11px; letter-spacing: .04em; color: var(--grass-deep); }

.g-foot { position: absolute; left: 0; right: 0; bottom: 0; height: 116px; z-index: 3;
  pointer-events: none; }
.g-wheat { position: absolute; left: 0; right: 0; bottom: 0; height: 92px; opacity: .85; }

/* 别人的一块地摊在纸上：只许看，纸上没有笔，也没有铲子 */
.read-mask { position: fixed; inset: 0; z-index: 45; display: grid; place-items: center;
  padding: 24px; background: rgba(63, 58, 47, .24); }
.read-sheet { position: relative; width: min(760px, 100%); max-height: 84vh; overflow-y: auto;
  padding: 26px 30px 22px; background: var(--card); border: 1.4px dashed rgba(150, 133, 100, .5);
  border-radius: var(--r-a); transform: rotate(-.35deg); scrollbar-width: thin; }
.read-x { position: absolute; right: 16px; top: 13px; color: var(--ink-faint); line-height: 0; padding: 4px; }
.read-x:hover { color: var(--wood); }
.read-topic { display: flex; align-items: center; gap: 7px; font-size: 14px; color: var(--wood); }
.read-sheet h2 { margin: 7px 0 2px; font-size: 23px; font-weight: normal; letter-spacing: .04em; }
.read-q { font-size: 14px; color: var(--ink-soft); }
.read-meta { margin-top: 7px; font-size: 12px; letter-spacing: 1px; color: var(--ink-faint); }
.read-stream { margin-top: 18px; }
.read-drop { display: flex; align-items: flex-start; gap: 10px; padding: 9px 2px 11px;
  border-bottom: 1px dashed rgba(150, 133, 100, .3); font-size: 16px; line-height: 1.9; }
.read-drop:last-child { border-bottom: 0; }
.read-leaf { flex: none; margin-top: 5px; padding: 0 9px 1px 7px; font-size: 11.5px; line-height: 1.7;
  color: var(--ink); transform: rotate(-1.2deg);
  border-radius: 3px 14px 4px 12px / 12px 4px 14px 5px;
  background: color-mix(in srgb, var(--c) 16%, transparent);
  box-shadow: inset 0 0 0 1.1px color-mix(in srgb, var(--c) 45%, transparent); }
.read-loading { padding: 12vh 0; text-align: center; font-size: 14px; letter-spacing: 1px; color: var(--ink-soft); }
.read-enter-active, .read-leave-active { transition: opacity .35s, transform .35s; }
.read-enter-from, .read-leave-to { opacity: 0; transform: translateY(10px); }

/* ——— 围起来的门 ——— */
.closed { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 18px; padding-bottom: 8vh; }
.fence { width: 260px; height: 140px; overflow: visible; }
.fence .ink { filter: url(#boil-soft); }
.fence path { stroke: #8B6B4A; stroke-width: 1.6; stroke-linecap: round; opacity: .72;
  animation: strokeIn 1.1s ease-out backwards; }
.fence .tuft { stroke: #7E9A5F; opacity: .6; }
.closed p { font-size: 14px; letter-spacing: 2px; color: #5C5044; }
.fence-acts { display: flex; align-items: center; gap: 22px; }
.knock-btn { display: inline-flex; align-items: center; gap: 5px; font-size: 13.5px; color: var(--grass-deep);
  letter-spacing: .08em; padding: 5px 15px 6px; border-radius: var(--r-c);
  box-shadow: inset 0 0 0 1.3px rgba(79, 107, 58, .4); transition: background .3s, transform .4s; }
.knock-btn:hover { background: rgba(79, 107, 58, .08); transform: translateY(-1px); }
.knock-btn:disabled { opacity: .45; cursor: default; }
.wait-leaf { display: inline-flex; align-items: center; gap: 4px; font-size: 12.5px; color: var(--grass-deep);
  letter-spacing: .08em; }
.wavy-link { font-size: 14px; color: var(--wood); letter-spacing: 1px;
  text-decoration: underline wavy rgba(139, 107, 74, .65) 1px; text-underline-offset: 6px; }
.wavy-link.quiet { font-size: 12.5px; color: var(--ink-faint); text-decoration-color: rgba(150, 133, 100, .4); }

/* ——— 留话：一张从底下推上来的纸 ——— */
.sheet-mask { position: fixed; inset: 0; z-index: 40; display: flex; align-items: flex-end;
  background: rgba(63, 58, 47, .2); }
.sheet { position: relative; width: 100%; background: var(--paper); padding: 22px max(24px, 6vw) 26px;
  box-shadow: 0 -10px 30px rgba(63, 58, 47, .12); }
.sheet form { width: min(720px, 100%); margin: 0 auto; }
.sheet h3 { font-size: 17px; font-weight: 400; letter-spacing: 1px; color: #3D3229; }
.sheet textarea { display: block; width: 100%; min-height: 76px; margin-top: 12px; padding: 4px 2px 10px;
  border: none; font-size: 17px; line-height: 1.9; color: #3D3229; background: transparent; }
.sheet textarea:focus { outline: none; }
.ink-line { display: block; width: 100%; height: 5px; overflow: visible; }
.ink-line path { stroke: #C9B99A; stroke-width: 1.6; stroke-linecap: round; }
.ink-line.draw path { animation: lineBack .4s ease-out; }
.hint { margin-top: 8px; font-size: 12px; letter-spacing: 1px; color: #A89880; }
.note { margin-top: 4px; font-size: 12px; letter-spacing: 1px; color: var(--wood); animation: inkIn .3s ease-out; }
.sheet-foot { display: flex; justify-content: flex-end; margin-top: 14px; }
.leave { font-size: 14px; color: var(--wood); letter-spacing: 2px;
  text-decoration: underline wavy rgba(139, 107, 74, .6) 1px; text-underline-offset: 6px; }
.leave:disabled { opacity: .35; text-decoration-color: transparent; cursor: default; }
.fly-leaf { position: absolute; right: 12%; top: 0; width: 18px; height: 18px; pointer-events: none;
  animation: leafAway 1.2s ease-out forwards; }
.fly-leaf path { stroke: #7E9A5F; stroke-width: 1.3; stroke-linecap: round; fill: rgba(126, 154, 95, .1); }
.sheet-enter-active, .sheet-leave-active { transition: transform .3s cubic-bezier(.22, 1.2, .36, 1), opacity .3s; }
.sheet-enter-from, .sheet-leave-to { transform: translateY(calc(100% + 20px)); opacity: .6; }
@keyframes lineBack { from { stroke-dasharray: 1; stroke-dashoffset: 1; } to { stroke-dasharray: 1; stroke-dashoffset: 0; } }
@keyframes leafAway {
  0% { transform: translate(0, 0) rotate(0); opacity: 0; }
  16% { opacity: .95; }
  100% { transform: translate(52px, -96px) rotate(58deg); opacity: 0; }
}

@media (max-width: 720px) {
  .g-top { padding-top: 16px; }
  .g-links { gap: 16px; }
  .g-tree { height: 44vh; min-height: 300px; }
  .g-soul { width: 64%; }
  .g-words { width: calc(100% - 36px); }
  .g-links { gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
  .knock-open { flex-basis: 100%; text-align: right; }
  .g-foot { height: 96px; }
  .g-wheat { height: 76px; }
}
</style>
