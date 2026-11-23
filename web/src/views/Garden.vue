<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api';
import { useUser } from '../store/user';
import { useNotice } from '../store/notice';
import { dimOf } from '../constants/dimensions';
import { glyphOf } from '../icons';
import { toast } from '../utils/toast';
import { ask } from '../utils/ask';
import { TREE_MAX, extraTrees, treeCap, treeForm, treeGroups, treeRoots, treeStyle } from '../utils/grove';
import SoulTree from '../components/SoulTree.vue';
import GroundWind from '../components/GroundWind.vue';
import WheatField from '../components/WheatField.vue';
import PenText from '../components/PenText.vue';
import MessageNotes from '../components/MessageNotes.vue';
import Spread from '../components/Spread.vue';
import VineScroll from '../components/VineScroll.vue';
import Glyph from '../components/Glyph.vue';
import ModalSprig from '../components/ModalSprig.vue';
import FestoonLights from '../components/FestoonLights.vue';
import PhotoViewer from '../components/PhotoViewer.vue';

const route = useRoute();
const router = useRouter();
const user = useUser();
const notice = useNotice();
const garden = ref(null);
const photo = ref('');
const sessions = ref([]);
const messages = ref([]);
const total = ref(0);
const mode = ref('');
const fenced = ref(false);
const knockState = ref('');
const knockReason = ref('');
const knocking = ref(false);
const ready = ref(false);
const mine = computed(() => garden.value && garden.value.id === user.user?.id);
// 别人家有几棵树，得按他自己种过的数来；一棵挂满了，旁边再冒一棵，不能只给看一棵
const grove = computed(() => treeGroups(sessions.value
  .filter(s => s.placement === 'tree' || !s.placement)
  .slice().sort((a, b) => a.id - b.id),
  extraTrees(garden.value?.id, garden.value?.extra_trees)));
// 地上有几条土埂就摆几条：新开的地还不算树，不能把种下的七十五棵都挤回一条根下
const groundRoots = computed(() => {
  const beds = sessions.value.reduce((m, s) =>
    s.placement === 'ground' ? Math.max(m, (s.branch ?? 0) + 1) : m, 0);
  return treeRoots(Math.max(grove.value.length, beds) || TREE_MAX, 'home');
});
const page = ref(1);
const moreBusy = ref(false);
const fenceBody = ref(null);
const fenceQ = ref('');
let fenceTimer;

const hash = s => [...String(s)].reduce((h, c) => (h * 31 + c.codePointAt(0)) >>> 0, 7);
// 右墙的藤按篱笆上有几句话长：话多，藤就多垂几股、多垂一截
const fenceVines = computed(() => {
  const n = Math.min(9, 3 + Math.ceil(total.value / 6));
  const reach = Math.min(1160, 860 + total.value * 18);
  return Array.from({ length: n }, (_, i) => {
    const h = hash('fv' + i);
    // 藤多半贴着院子这侧的篱笆缝往下垂，少数几股翻到背面
    const x = i % 3 === 2 ? 103 + h % 9 : 4 + (i % 3) * 5 + h % 7;
    const sway = 4 + h % 6;
    let d = `M${x} -12`;
    for (let k = 1; k <= 5; k++) {
      const y = reach * k / 5;
      const px = x + Math.sin(k * 1.4 + i) * sway * (k / 5);
      d += ` C ${(x + Math.sin(k * 1.7 + i) * sway).toFixed(1)} ${(y - reach / 5 * .55).toFixed(1)},`
        + ` ${(px - Math.sin(k + i) * 4).toFixed(1)} ${(y - reach / 5 * .2).toFixed(1)}, ${px.toFixed(1)} ${y.toFixed(1)}`;
    }
    return { d, w: 1.6 + h % 3 * .4, o: .42 + (h >>> 8) % 22 / 100, dur: 12 + h % 9, delay: -(h % 12) };
  });
});
const LEAF_TONE = ['var(--grass-deep)', 'var(--grass)', 'var(--sakura)', 'var(--wheat)', 'var(--clay)'];
const LEAF_NAME = ['leaf', 'sprout', 'blossom', 'sakura', 'daisy', 'tulip', 'rose', 'dandelion'];
const fenceLeaves = computed(() => {
  const n = Math.min(28, 8 + total.value * 2);
  return Array.from({ length: n }, (_, i) => {
    const h = hash('fl' + i);
    return {
      left: 1 + (h >>> 3) % 9, top: 2 + i * 94 / Math.max(1, n - 1),
      g: LEAF_NAME[h % LEAF_NAME.length], size: 13 + (h >>> 11) % 9,
      rot: (h >>> 15) % 70 - 35, c: LEAF_TONE[(h >>> 19) % LEAF_TONE.length],
      dur: 6 + h % 6, delay: -(h % 8)
    };
  });
});

/* ——— 点开树上一片叶子：别人的地只给看，不能改也不能删 ——— */
const read = ref(null);
const readOpen = ref(false);
const readBusy = ref(false);
const readBody = ref(null);
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
// 喜欢的叶子夹进自己的书里；主人收起来也还留着，门围上了才只剩一句去敲门
const keeps = ref(new Set());
const keepBusy = ref(false);
async function loadKeeps() {
  if (!user.isLogin) return;
  try {
    const d = await api.keeps();
    keeps.value = new Set(d.list.map(k => k.session_id));
  } catch {}
}
async function toggleKeep() {
  const sid = read.value?.session?.id;
  if (!sid || keepBusy.value) return;
  keepBusy.value = true;
  try {
    if (keeps.value.has(sid)) {
      const out = await ask({
        title: '把这片叶子取出来？',
        body: '取出来，书里就不留这一片了。想再看，得回这儿重新夹。',
        ok: '取出来', cancel: '先留着', icon: 'leaf'
      });
      if (!out) return;
      await api.unkeep(sid);
      keeps.value.delete(sid);
      toast('从书里取出来了');
    } else {
      await api.keep(garden.value.id, sid);
      keeps.value.add(sid);
      const go = await ask({
        title: '这片叶子夹好了', icon: 'leaf',
        body: '已经收在「我的田地 · 夹在书里的」。现在顺着藤去看看，还是再坐会儿？',
        ok: '顺着藤去看', cancel: '再坐会儿'
      });
      if (go) router.push('/mine?tab=kept&focus=' + sid);
      else toast('好，叶子夹在书里了，就在这儿再坐会儿');
    }
  } finally {
    keepBusy.value = false;
  }
}

async function load() {
  ready.value = false;
  fenced.value = false;
  knockState.value = '';
  knockReason.value = '';
  garden.value = null;
  readOpen.value = false;
  read.value = null;
  seen.clear();
  page.value = 1;
  fenceQ.value = '';
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
    knockReason.value = e.data?.knock_reason || '';
    garden.value = e.data?.garden || null;
  } finally {
    ready.value = true;
    nextTick(fillFence);
    const sid = Number(route.query.session);
    if (sid) nextTick(() => peek(sessions.value.find(x => x.id === sid) || { id: sid, status: 'finished' }));
  }
}

/* ——— 篱笆上的话：一次十二句，往下翻着看，藤也跟着往下长 ——— */
function fillFence() {
  const el = fenceBody.value;
  if (el && el.scrollHeight <= el.clientHeight + 16) loadMore();
}
async function loadMessages() {
  const d = await api.gardenMessages(garden.value.id, 1, fenceQ.value.trim());
  page.value = 1;
  messages.value = d.list;
  total.value = d.total;
  nextTick(fillFence);
}
// 篱笆上的话一多，按字、按回音、按来人的名字找；停手一息再问服务器
function searchFence() {
  clearTimeout(fenceTimer);
  fenceTimer = setTimeout(loadMessages, 260);
}
function clearSearch() {
  fenceQ.value = '';
  loadMessages();
}
async function loadMore() {
  if (moreBusy.value || messages.value.length >= total.value) return;
  moreBusy.value = true;
  try {
    const d = await api.gardenMessages(garden.value.id, page.value + 1, fenceQ.value.trim());
    if (d.list.length) {
      page.value++;
      messages.value = messages.value.concat(d.list);
    }
    total.value = d.list.length ? d.total : messages.value.length;
  } finally {
    moreBusy.value = false;
    nextTick(fillFence);
  }
}
function maybeMore(e) {
  const el = e.currentTarget;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 160) loadMore();
}
async function erase(m) {
  await api.delMessage(m.id);
  await loadMessages();
}
function replied() {
  notice.load();
}

/* ——— 围起来的门：敲一下，等主人点头 ——— */
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
const draftLen = computed(() => [...draft.value].length);
const sending = ref(false);
const sent = ref(false);
const note = ref('');
const box = ref(null);
let closeTimer, sentTimer;

// 纸跟着字长，长到屏幕三成高就停，余下的顺着藤往下看
function fitBox() {
  const el = box.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, Math.round(innerHeight * .34)) + 'px';
}

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
  if ([...content].length > 100) return (note.value = '话太长了，收一收');
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
watch(draft, () => nextTick(fitBox));
watch(open, on => {
  if (on) nextTick(() => { fitBox(); box.value?.focus(); });
});
watch(() => route.params.userId, load);

onMounted(() => {
  load();
  loadKeeps();
  notice.load();
  if (user.isLogin) user.load();
});
</script>

<template>
  <div class="garden">
    <p v-if="!ready" class="loading">土还在翻</p>

    <template v-else-if="fenced">
      <div class="closed">
        <div v-if="garden" class="closed-head">
          <h1>{{ garden.garden_name }}</h1>
          <p v-if="garden.bio">{{ garden.bio }}</p>
        </div>
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
        <p v-if="knockReason" class="closed-why">
          <span v-if="knockState === 'pending'" class="why-lead">主人上回没开，留了句话：</span>“{{ knockReason }}”
        </p>
        <p class="closed-say">开门后，再一起说说话</p>
        <div class="fence-acts">
          <button v-if="user.isLogin && knockState !== 'pending'" class="knock-btn"
            :disabled="knocking" @click="knock">
            <Glyph name="home" :size="16"/> {{ knockState === 'declined' ? '再敲一次' : '敲敲门' }}
          </button>
          <router-link v-else-if="!user.isLogin" class="knock-btn"
            :to="{ path: '/login', query: { to: route.fullPath } }">先登录，再来敲门</router-link>
          <span v-else class="knock-btn wait-leaf"><Glyph name="leaf" :size="16"/> 等主人来看看</span>
          <router-link class="knock-btn" to="/visits"><Glyph name="left" :size="15"/> 回串门</router-link>
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
          <span v-if="mode === 'knock'" class="knock-open">
            主人开了 {{ sessions.length }} 块地给你看
          </span>
          <template v-if="mode === 'public' || mode === 'owner'">
            <span class="g-fence">篱笆上的话 <i v-if="total">{{ total }}</i></span>
            <button v-if="mode === 'public' && !mine && user.isLogin" class="fence-write" @click="write">留句话</button>
            <router-link v-else-if="mode === 'public' && !mine" class="fence-write g-login"
              :to="{ path: '/login', query: { to: route.fullPath } }">登录后留句话</router-link>
            <router-link class="fence-back" to="/visits">回串门</router-link>
          </template>
          <router-link v-else-if="mode === 'knock'" class="g-back" to="/visits">回串门</router-link>
        </nav>
      </header>

      <div class="g-main-wrap">
      <main class="g-main">
        <section class="g-tree">
          <svg class="art strata" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true">
            <path v-for="i in 5" :key="i"
              :d="`M2 ${i * 11} C 20 ${i * 11 - 4}, 38 ${i * 11 + 3}, 56 ${i * 11 - 2} C 72 ${i * 11 - 5}, 86 ${i * 11 + 2}, 98 ${i * 11 - 1}`"/>
          </svg>
          <svg class="art water" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
            <path v-for="i in 4" :key="i"
              :d="`M${4 + i * 3} ${i * 7} C 26 ${i * 7 - 3}, 48 ${i * 7 + 3}, 70 ${i * 7 - 1} C 82 ${i * 7 - 2}, 90 ${i * 7 + 1}, 96 ${i * 7}`"/>
          </svg>
          <SoulTree v-for="(tree, i) in grove" :key="'tree' + i" class="g-soul"
            :class="'g-soul-' + i" :style="treeStyle(i, 'home', tree.length, treeCap(i))" :sessions="tree" :cap="treeCap(i)"
            :variant="treeForm(garden.id, i)"
            :seed="(garden.id || 0) * 37 + i * 101" peek @open="peek"/>
          <!-- 别人院里的树、地上的和风里的，和原野共用同一套生长 -->
          <GroundWind :sessions="sessions" :roots="groundRoots" @open="peek"/>
          <WheatField class="g-wheat" :n="16"/>
        </section>
      </main>

      <aside v-if="(mode === 'public' || mode === 'owner') && (total || fenceQ)" class="fence-rail" aria-label="篱笆上的话">
        <div ref="fenceBody" class="fence-scroll" @scroll.passive="maybeMore">
          <div class="fence-sheet">
            <svg class="fence-ink" viewBox="0 0 120 1200" preserveAspectRatio="none" aria-hidden="true">
              <g class="fence-wood">
                <path class="post" d="M12 -6 C 10 380, 13 760, 11 1206 M108 -6 C 110 380, 107 760, 109 1206"/>
                <path v-for="i in 7" :key="'rail' + i" class="rail"
                  :d="`M2 ${i * 168} C 36 ${i * 168 - 5}, 78 ${i * 168 + 5}, 118 ${i * 168 - 2}`"/>
              </g>
              <g class="fence-vines">
                <path v-for="(v, i) in fenceVines" :key="'vine' + i" :d="v.d"
                  :style="{ strokeWidth: v.w, opacity: v.o, animationDuration: v.dur + 's', animationDelay: v.delay + 's' }"/>
              </g>
            </svg>
            <Glyph v-for="(l, i) in fenceLeaves" :key="'leaf' + i" class="fence-leaf" :name="l.g" :size="l.size"
              :style="{ left: l.left + '%', top: l.top + '%', color: l.c, '--rot': l.rot + 'deg',
                '--dur': l.dur + 's', '--delay': l.delay + 's' }"/>

            <p v-if="mode === 'public' && !mine" class="fence-today">只挂今天的话，昨天的落进土里了。</p>

            <div class="fence-search">
              <Glyph name="search" :size="15"/>
              <input v-model="fenceQ" maxlength="40" placeholder="找一句话、一个人"
                aria-label="搜篱笆上的话" @input="searchFence"/>
              <button v-if="fenceQ" type="button" @click="clearSearch">收</button>
            </div>

            <div class="fence-list">
              <MessageNotes rows :list="messages" :owner="mine" :can-reply="mine" erase
                :empty="mine ? '篱笆上还空着，风吹过去只有叶子响。' : '今天还没人在这儿留话。'"
                @erase="erase" @replied="replied"/>
            </div>
            <p v-if="messages.length < total" class="fence-more">
              <button :disabled="moreBusy" @click="loadMore">{{ moreBusy ? '藤在往下长…' : '再往下翻翻' }}</button>
            </p>
            <p v-else-if="messages.length" class="fence-end">藤蔓到头了。</p>
          </div>
        </div>
        <VineScroll :el="fenceBody"/>
        <FestoonLights class="fence-lights" :count="18" :seed="5" :sag="7"/>
        <FestoonLights class="fence-lights down" vertical :count="26" :seed="9" :sag="9"/>
        <span class="fence-lamp" aria-hidden="true">
          <svg viewBox="0 0 38 64" fill="none">
            <path class="lamp-hook" d="M19 2 C 19 8, 19 11, 19 14"/>
            <path class="lamp-cap" d="M9 21 C 11 15, 15 13, 19 13 C 23 13, 27 15, 29 21 Z"/>
            <path class="lamp-glass" d="M10 21 C 7 30, 7 42, 11 50 C 13 54, 25 54, 27 50 C 31 42, 31 30, 28 21 Z"/>
            <path class="lamp-wick" d="M19 33 C 17 38, 21 40, 19 45"/>
            <path class="lamp-foot" d="M11 51 L 27 51 L 25 57 L 13 57 Z"/>
            <path class="lamp-ring" d="M19 57 C 19 60, 19 61, 19 63"/>
          </svg>
        </span>
      </aside>
      </div>

      <Transition name="read">
        <div v-if="readOpen" class="read-mask" @click.self="readOpen = false">
          <article class="read-sheet" role="dialog" aria-label="别人的一块地">
            <ModalSprig/>
            <div ref="readBody" class="read-body roll">
              <template v-if="read">
                <p class="read-topic">
                  <Glyph :name="glyphOf({ name: read.session.topic_name })" :size="22"/>
                  {{ read.session.topic_name }}
                </p>
                <h2>{{ read.session.title }}</h2>
                <p v-if="read.session.question" class="read-q">“{{ read.session.question }}”</p>
                <p class="read-meta">{{ read.session.thought_count }} 滴 · 只许看</p>
                <div class="read-stream">
                  <div v-for="t in readThoughts" :key="t.id" class="read-drop" :style="{ '--c': dimOf(t.dimension).color }">
                    <span class="read-leaf">{{ t.dimension }}</span>
                    <PenText :text="t.content"/>
                    <figure v-if="t.img" class="read-photo" title="点开看大图" role="button" tabindex="0"
                      @click.stop="photo = t.img" @keydown.enter.stop="photo = t.img">
                      <img :src="t.img" alt="" loading="lazy"/>
                    </figure>
                  </div>
                </div>
              </template>
              <p v-else class="read-loading">{{ readBusy ? '叶子还在翻' : '这片叶子是空的' }}</p>
            </div>
            <div v-if="read && !mine && user.isLogin" class="read-keep">
              <button :disabled="keepBusy" @click="toggleKeep">
                <Glyph name="leaf" :size="16"/>
                {{ keeps.has(read.session.id) ? '夹在书里了 · 再点取出' : '夹一片，收进我的书里' }}
              </button>
              <span>{{ keeps.has(read.session.id) ? '已经收好，再点一下就从书里取出来' : '主人收起来，这片也还留在你这儿' }}</span>
            </div>
            <VineScroll :el="readBody"/>
          </article>
        </div>
      </Transition>

      <Transition name="sheet">
        <div v-if="open" class="sheet-mask" @click.self="shut">
          <section class="sheet">
            <ModalSprig/>
            <span v-if="sent" class="fly-leaf" aria-hidden="true">
              <svg viewBox="0 0 18 18" fill="none">
                <path d="M3 15 C 3.4 8.6, 7.4 4.4, 15 3 C 14.2 10.4, 10.4 14.2, 3 15 Z"/>
                <path d="M3.4 14.6 C 6.4 11.4, 9.4 8.6, 13 5.8"/>
              </svg>
            </span>
            <form @submit.prevent="send">
              <h3>给{{ garden.garden_name }}留句话</h3>
              <div class="sheet-well">
                <textarea ref="box" v-model="draft" rows="2" maxlength="100" :disabled="sending"
                  aria-label="留句话"/>
                <VineScroll :el="box"/>
              </div>
              <svg class="ink-line" :class="{ draw: sent }" viewBox="0 0 600 5" preserveAspectRatio="none" aria-hidden="true">
                <path pathLength="1" d="M2 3 C 110 1.6, 220 4.2, 330 2.8 C 430 1.4, 520 3.6, 598 2.6"/>
              </svg>
              <p v-if="note" class="note">{{ note }}</p>
              <div class="sheet-foot">
                <Spread v-model="draft" :max="100" placeholder="留句话"/>
                <span class="sheet-count">{{ draftLen }}/100</span>
                <button type="submit" class="leave" :disabled="sending || !draft.trim()">留下了</button>
              </div>
            </form>
          </section>
        </div>
      </Transition>
    </template>
    <PhotoViewer :src="photo" :title="read && read.session.title" @close="photo = ''"/>
  </div>
</template>

<style scoped>
.garden { position: relative; display: flex; flex-direction: column; height: 100vh; height: 100dvh;
  overflow: hidden; padding-bottom: env(safe-area-inset-bottom); }
.loading { margin-top: 30vh; }

.g-top { flex: none; display: flex; align-items: flex-start; justify-content: space-between; gap: 24px;
  padding: max(24px, env(safe-area-inset-top)) max(8px, env(safe-area-inset-right)) 12px max(24px, 6vw);
  z-index: 4; }
.g-title h1 { font-size: var(--fs-hero); font-weight: 400; letter-spacing: 1px; color: var(--ink); line-height: 1.35; }
.g-title p { margin-top: 2px; font-size: var(--fs-base); letter-spacing: 1px; color: var(--ink-soft); }
.g-links { display: flex; align-items: center; gap: 24px; padding-top: 1px; flex: none; }
.g-links span, .g-links button, .g-links a { font-size: var(--fs-base); letter-spacing: 1px; color: var(--ink-soft); transition: color .3s; }
.g-links button { text-decoration: underline wavy rgba(139, 107, 74, .55) 1px; text-underline-offset: 6px; }
.g-links button:hover, .g-links a:hover { color: var(--wood); }
/* 篱笆上的话搬到题头，字和主页「我的田地」一样大 */
.g-links .g-fence { display: inline-flex; align-items: center; gap: 6px; font-size: var(--fs-head); }
.g-fence i { font-style: normal; font-size: var(--fs-base);
  color: color-mix(in srgb, var(--grass-deep) 55%, var(--ink-soft)); }
.g-links .fence-write, .g-links .fence-back { font-size: var(--fs-head); color: var(--wood); }
.g-back { text-decoration: underline wavy rgba(139, 107, 74, .4) 1px; text-underline-offset: 6px; }
.knock-open { color: var(--grass-deep); font-size: var(--fs-sm); }
.g-login { text-decoration: underline wavy rgba(139, 107, 74, .4) 1px; text-underline-offset: 6px; }

.g-main-wrap { position: relative; flex: 1; min-height: 0; display: flex; }
.g-main { position: relative; flex: 1; min-width: 0; min-height: 0; overflow: hidden; }
/* 树照着原野的尺寸长：根扎在同一条土线上，树冠往上顶满一屏 */
.g-tree { position: relative; height: 100%; min-height: 0; overflow: hidden;
  --tree-w: min(45vw, 640px); --tree-lift: 120px; --tree-x: calc(24.5% - 160px);
  --tree-h: min(calc(var(--tree-w) * 1.4), calc(100% - var(--tree-lift))); }
/* 桌面端照主页原野那块画布来量：左右同样留 2vw，树高扣掉题头、门牌和根抬起的 120px，
   树和地才和主页钉在同一处，不各偏各的 */
@media (min-width: 1001px) {
  .g-tree { width: calc(100vw - 4vw); margin-left: 2vw;
    --tree-h: min(calc(var(--tree-w) * 1.4), calc(100vh - 314px)); }
}
.art { position: absolute; fill: none; stroke: var(--graphite); stroke-width: 1; opacity: .16;
  stroke-linecap: round; pointer-events: none; }
.art path { vector-effect: non-scaling-stroke; }
.strata { left: 1%; top: 36%; width: 46%; height: 28%; }
.water { left: 4%; top: 66%; width: 92%; height: 22%; stroke: var(--sky); opacity: .3; }
.g-soul { position: absolute; left: var(--tree-x); bottom: calc(var(--tree-lift) - var(--tree-drop, 0px)); width: auto;
  height: calc(var(--tree-h) * var(--tree-grow, 1) * var(--tree-boost, 1)); aspect-ratio: 300 / 420; z-index: 12;
  transform: translateX(-50%); transition: height .9s cubic-bezier(.2, .8, .3, 1); }
/* 第二棵往旁边让开，矮一点；访客和主人家看到的是同一片树 */
.g-soul:not(.g-soul-0) { left: var(--tree-left); bottom: calc(var(--tree-lift) - var(--tree-drop, 0px));
  height: calc((var(--tree-h) * var(--tree-scale) * var(--tree-grow, 1) + var(--tree-extra, 0px)) * var(--tree-boost, 1)); z-index: 11; }
/* 麦秆站在最前头，树根、风和地上的记号都压不住它 */
.g-wheat { position: absolute; left: 0; right: 0; bottom: 0; height: 92px; opacity: .85;
  z-index: 21; pointer-events: none; }

/* ——— 右墙：一段老篱笆，藤顺着话往下垂，翻多少话藤就多长 ——— */
/* 篱笆直接立在院子的纸上，不另铺一块底，跟原野是同一张纸 */
/* 篱笆压在风里的地后面：风里的字飘过来时，仍旧点得中 */
.fence-rail { position: relative; flex: 0 0 clamp(300px, 27vw, 390px); z-index: 15; }
/* 篱笆灯：只在夜里亮，一盏旧路灯，几串彩灯缠在木头顶上 */
.fence-lights { inset: 0 0 auto; height: 72px; z-index: 1; opacity: .82; }
.fence-lights.down { inset: 60px auto 12px 0; width: 62px; height: auto; opacity: .6; }
.fence-lamp { display: none; position: absolute; left: 1px; top: 4px; width: 38px; height: 64px;
  z-index: 3; pointer-events: none; }
body[data-night="1"] .fence-lamp { display: block; }
.fence-lamp::before { content: ''; position: absolute; left: 19px; top: 34px; width: 82px; height: 82px;
  margin: -41px 0 0 -41px; border-radius: 50%;
  background: radial-gradient(circle, rgba(240, 203, 127, .3), rgba(240, 203, 127, .08) 46%, transparent 70%);
  animation: lampBreathe 5.4s ease-in-out infinite alternate; }
.fence-lamp svg { position: relative; width: 100%; height: 100%; overflow: visible; filter: url(#boil-soft); }
.lamp-hook, .lamp-cap, .lamp-foot, .lamp-ring { stroke: #6F5A40; stroke-width: 1.5; stroke-linecap: round; }
.lamp-glass { fill: rgba(238, 202, 126, .2); stroke: #7A6448; stroke-width: 1.3; }
.lamp-wick { stroke: #E4BC6C; stroke-width: 1.6; stroke-linecap: round; }
@keyframes lampBreathe { from { opacity: .55; } to { opacity: 1; } }
.fence-scroll { position: absolute; inset: 0; overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none;
  --fs-xs: calc(16px * var(--ui-scale)); --fs-sm: calc(18px * var(--ui-scale));
  --fs-md: calc(20px * var(--ui-scale)); --fs-base: calc(22px * var(--ui-scale)); }
.fence-scroll::-webkit-scrollbar { display: none; }
.fence-sheet { position: relative; min-height: 100%; padding: 0 8px 22px 0; }
.fence-ink { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible;
  fill: none; stroke-linecap: round; pointer-events: none; }
.fence-wood { stroke: #8B6B4A; }
.fence-wood .post { stroke-width: 2.6; opacity: .3; }
.fence-wood .rail { stroke-width: 1.8; opacity: .24; }
.fence-wood path { vector-effect: non-scaling-stroke; }
.fence-vines path { fill: none; stroke: var(--grass); filter: url(#boil-soft);
  vector-effect: non-scaling-stroke; transform-box: fill-box; transform-origin: 50% 0;
  animation-name: fenceSway; animation-timing-function: ease-in-out; animation-iteration-count: infinite;
  animation-direction: alternate; }
.fence-vines path:nth-child(2n) { stroke: var(--grass-deep); }
.fence-leaf { position: absolute; z-index: 1; opacity: .84; pointer-events: none;
  transform: translate(-50%, -50%) rotate(var(--rot));
  animation: fenceLeaf var(--dur, 7s) ease-in-out var(--delay, 0s) infinite alternate; }
.fence-write, .fence-back { flex: none; letter-spacing: .06em;
  padding: 2px 0 4px; text-decoration: underline wavy rgba(139, 107, 74, .45) 1px; text-underline-offset: 5px; }
.fence-write:hover, .fence-back:hover { color: var(--grass-deep); }
.fence-search { position: relative; z-index: 2; display: flex; align-items: center; gap: 6px;
  margin: 10px 10px 2px 46px; padding-bottom: 5px; color: var(--ink-faint);
  border-bottom: 1.1px dashed rgba(150, 133, 100, .38); }
.fence-search input { flex: 1; min-width: 0; border: none; background: none; outline: none;
  font-size: var(--fs-sm); color: var(--ink-soft); letter-spacing: .04em; }
.fence-search input::placeholder { color: var(--ink-faint); }
.fence-search button { flex: none; font-size: var(--fs-xs); color: var(--wood); }
.fence-search button:hover { color: var(--grass-deep); }
.fence-today { position: relative; z-index: 2; margin: 14px 6px 9px 50px; font-size: var(--fs-xs);
  line-height: 1.7; letter-spacing: .04em; color: var(--ink-faint); }
.fence-list { position: relative; z-index: 2; padding-left: 46px; }
.fence-list :deep(.note-row) { padding: 8px 9px; gap: 8px; }
.fence-list :deep(.nr-acts) { gap: 8px; }
.fence-more { position: relative; z-index: 2; padding: 14px 0 6px 46px; text-align: center; }
.fence-more button { font-size: var(--fs-sm); color: var(--ink-faint); letter-spacing: .08em; }
.fence-more button:hover { color: var(--grass-deep); }
.fence-more button:disabled { opacity: .5; cursor: default; }
.fence-end { position: relative; z-index: 2; padding: 16px 0 4px 46px; text-align: center;
  font-size: var(--fs-xs); letter-spacing: .16em; color: var(--ink-faint); }
@keyframes fenceSway {
  from { transform: rotate(-.4deg); }
  to { transform: rotate(.5deg); }
}
@keyframes fenceLeaf {
  from { transform: translate(-50%, -50%) rotate(calc(var(--rot) - 3deg)); }
  to { transform: translate(-50%, -50%) rotate(calc(var(--rot) + 4deg)); }
}

/* 别人的一块地摊在纸上：只许看，纸上没有笔，也没有铲子 */
.read-mask { position: fixed; inset: 0; z-index: 45; display: grid; place-items: center;
  padding: calc(24px + env(safe-area-inset-top)) calc(24px + env(safe-area-inset-right))
    calc(24px + env(safe-area-inset-bottom)) calc(24px + env(safe-area-inset-left));
  background: rgba(63, 58, 47, .24); }
.read-sheet { position: relative; display: flex; flex-direction: column; width: min(960px, 100%);
  max-height: calc(100dvh - 48px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
  overflow: hidden;
  background: var(--card); border: 1.4px dashed rgba(150, 133, 100, .5);
  border-radius: var(--r-a); transform: rotate(-.35deg); }
.read-body { flex: 1; min-height: 0; overflow-y: auto; padding: 28px 38px 22px 32px;
  scrollbar-width: none; }
.read-body::-webkit-scrollbar { display: none; }
.read-topic { display: flex; align-items: center; gap: 8px; font-size: var(--fs-head); letter-spacing: .06em; color: var(--wood); }
.read-sheet h2 { margin: 7px 0 2px; font-size: var(--fs-title); font-weight: normal; letter-spacing: .04em; }
.read-q { font-size: var(--fs-base); color: var(--ink-soft); }
.read-meta { margin-top: 7px; font-size: var(--fs-sm); letter-spacing: 1px; color: var(--ink-faint); }
/* 夹书签这一下钉在纸角，正文自己滚，它不跟着走 */
.read-keep { position: relative; z-index: 6; flex: none; display: flex; align-items: baseline;
  flex-wrap: wrap; gap: 4px 12px; padding: 13px 38px 16px 32px;
  background: var(--card); border-top: 1.1px dashed rgba(150, 133, 100, .34); }
.read-keep button { display: inline-flex; align-items: center; gap: 6px; font-size: var(--fs-md);
  color: var(--grass-deep); letter-spacing: .06em;
  text-decoration: underline wavy rgba(79, 107, 58, .4) 1px; text-underline-offset: 5px; }
.read-keep button:hover { color: var(--wood); }
.read-keep span { font-size: var(--fs-xs); color: var(--ink-faint); letter-spacing: .04em; }
.read-stream { margin-top: 18px; }
.read-drop { display: flex; align-items: flex-start; gap: 10px; padding: 9px 2px 11px;
  border-bottom: 1px dashed rgba(150, 133, 100, .3); font-size: var(--fs-read); line-height: 1.9; }
.read-drop:last-child { border-bottom: 0; }
.read-photo { flex: none; width: 104px; margin-left: auto; cursor: zoom-in; }
.read-photo img { display: block; width: 100%; max-height: 82px; object-fit: cover;
  border-radius: var(--r-c); box-shadow: inset 0 0 0 1.1px rgba(150, 133, 100, .4);
  transform: rotate(.8deg); }
.read-leaf { flex: none; margin-top: 5px; padding: 0 9px 1px 7px; font-size: var(--fs-sm); line-height: 1.7;
  color: var(--ink); transform: rotate(-1.2deg);
  border-radius: 3px 14px 4px 12px / 12px 4px 14px 5px;
  background: color-mix(in srgb, var(--c) 16%, transparent);
  box-shadow: inset 0 0 0 1.1px color-mix(in srgb, var(--c) 45%, transparent); }
.read-loading { padding: 12vh 0; text-align: center; font-size: var(--fs-base); letter-spacing: 1px; color: var(--ink-soft); }
.read-enter-active, .read-leave-active { transition: opacity .35s, transform .35s; }
.read-enter-from, .read-leave-to { opacity: 0; transform: translateY(10px); }

/* ——— 围起来的门 ——— */
.closed { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 18px; padding: 24px 24px 8vh; text-align: center; }
.closed-head h1 { font-size: var(--fs-hero); font-weight: 400; letter-spacing: 1px; color: var(--ink); line-height: 1.35; }
.closed-head p { margin-top: 2px; font-size: var(--fs-base); letter-spacing: 1px; color: var(--ink-soft); }
.fence { width: 260px; height: 140px; overflow: visible; }
.fence .ink { filter: url(#boil-soft); }
.fence path { stroke: #8B6B4A; stroke-width: 1.6; stroke-linecap: round; opacity: .72;
  animation: strokeIn 1.1s ease-out backwards; }
.fence .tuft { stroke: #7E9A5F; opacity: .6; }
.closed > p { font-size: var(--fs-base); letter-spacing: 2px; color: var(--ink-soft); }
.closed-why { margin-top: -10px; font-size: var(--fs-base); line-height: 1.8; letter-spacing: .04em; color: var(--wood); }
.why-lead { color: var(--ink-faint); }
.closed-say { font-size: var(--fs-sm) !important; letter-spacing: .08em !important; color: var(--ink-faint) !important; }
.fence-acts { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; justify-content: center; }
/* 门上这一排都是同一颗扣子：敲门的、等着的、回头的，只是颜色深浅不同 */
.knock-btn { display: inline-flex; align-items: center; gap: 5px; font-size: var(--fs-base); color: var(--grass-deep);
  letter-spacing: .08em; padding: 5px 15px 6px; border-radius: var(--r-c);
  box-shadow: inset 0 0 0 1.3px rgba(79, 107, 58, .4); transition: background .3s, transform .4s; }
.knock-btn:hover { background: rgba(79, 107, 58, .08); transform: translateY(-1px); }
.knock-btn:disabled { opacity: .45; cursor: default; }
.knock-btn.wait-leaf { color: var(--ink-faint); box-shadow: inset 0 0 0 1.3px rgba(150, 133, 100, .35); }

/* ——— 留话：一张从底下推上来的纸 ——— */
.sheet-mask { position: fixed; inset: 0; z-index: 40; display: flex; align-items: flex-end;
  background: rgba(63, 58, 47, .2); }
.sheet { position: relative; isolation: isolate; width: 100%; background: var(--paper);
  padding: 22px max(24px, 6vw) calc(26px + env(safe-area-inset-bottom)) max(24px, 6vw);
  border-top: 1px dashed rgba(150, 133, 100, .3);
  box-shadow: 0 -10px 30px rgba(63, 58, 47, .12); }
body[data-night="1"] .sheet { border-top-color: rgba(148, 160, 176, .2);
  box-shadow: 0 -10px 34px rgba(5, 9, 15, .34), 0 0 24px rgba(130, 156, 130, .05); }
body[data-night="1"] .read-sheet { border-color: rgba(148, 160, 176, .22);
  box-shadow: 0 18px 44px rgba(5, 9, 15, .34); }
.sheet form { width: min(720px, 100%); margin: 0 auto; }
.sheet h3 { font-size: var(--fs-read); font-weight: 400; letter-spacing: 1px; color: var(--ink); }
.sheet-well { position: relative; margin-top: 12px; }
.sheet textarea { display: block; width: 100%; min-height: 76px; max-height: 34dvh; padding: 4px 26px 10px 2px;
  border: none; font-size: var(--fs-read); line-height: 1.9; color: var(--ink); background: transparent;
  overflow-y: auto; overscroll-behavior: contain; resize: none; scrollbar-width: none; }
.sheet textarea::-webkit-scrollbar { display: none; }
.sheet textarea:focus { outline: none; }
.ink-line { display: block; width: 100%; height: 5px; overflow: visible; }
.ink-line path { stroke: #C9B99A; stroke-width: 1.6; stroke-linecap: round; }
.ink-line.draw path { animation: lineBack .4s ease-out; }
.note { margin-top: 4px; font-size: var(--fs-sm); letter-spacing: 1px; color: var(--wood); animation: inkIn .3s ease-out; }
.sheet-foot { display: flex; align-items: center; justify-content: flex-end; flex-wrap: nowrap; gap: 24px; margin-top: 14px; }
.sheet-count { font-size: var(--fs-sm); color: var(--ink-faint); letter-spacing: .04em; }
.leave { font-size: var(--fs-base); color: var(--wood); letter-spacing: 2px;
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

/* 窄屏右墙挪到树下，仍是院子的半边；树和地还按原野那套长 */
@media (max-width: 1000px) {
  .g-main-wrap { flex-direction: column; }
  .g-main { flex: 1 1 auto; }
  .g-tree { --tree-w: min(64vw, 420px); --tree-lift: 70px; --tree-x: 50%;
    --tree-h: min(calc(var(--tree-w) * 1.4), calc(100% - var(--tree-lift))); }
  .look { top: 6px; right: 12px; max-width: 190px; }
  .g-wheat { height: 64px; }
  .g-tree :deep(.ground-bed) { position: absolute; left: var(--root-left, var(--tree-x)); top: calc(100% - var(--tree-lift));
    bottom: auto; width: var(--bed-w, 460px); max-width: 92%; height: 0; margin: 0;
    transform: translateX(-50%); display: block; z-index: 16; }
  .g-tree :deep(.ground-seed) { position: absolute; transform: translateX(-50%) rotate(var(--rot)); }
  .g-tree :deep(.ground-seed:hover) { transform: translateX(-50%) rotate(0deg) translateY(-3px); }
  .fence-rail { flex: 0 0 42%; width: auto; }
  .fence-sheet { padding-right: 24px; }
}
@media (max-width: 720px) {
  .g-top { padding-top: max(16px, env(safe-area-inset-top)); }
  .g-links { gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
  .knock-open { flex-basis: 100%; text-align: right; }
}
/* 窄屏题头和门牌分两行站，别把回串门挤出纸外 */
@media (max-width: 620px) {
  .g-top { flex-direction: column; gap: 4px; padding: max(12px, env(safe-area-inset-top))
    max(18px, env(safe-area-inset-right)) 8px max(18px, env(safe-area-inset-left)); }
  .g-links { width: 100%; padding-top: 0; justify-content: flex-start; gap: 6px 14px; }
  .knock-open { flex-basis: 100%; text-align: left; }
  .look { display: none; }
  .read-mask { padding: calc(12px + env(safe-area-inset-top)) calc(12px + env(safe-area-inset-right))
    calc(12px + env(safe-area-inset-bottom)) calc(12px + env(safe-area-inset-left)); }
  .read-sheet { max-height: calc(100dvh - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom)); }
  .read-body { padding: 20px 18px 16px; }
  .read-keep { padding: 11px 18px 13px; }
  .read-drop { flex-wrap: wrap; }
  .read-photo { width: 96px; }
  .read-photo img { max-height: 72px; }
  .sheet { padding: 18px max(18px, env(safe-area-inset-right))
    calc(18px + env(safe-area-inset-bottom)) max(18px, env(safe-area-inset-left)); }
  .sheet-foot { flex-wrap: wrap; gap: 10px 18px; }
}
</style>
