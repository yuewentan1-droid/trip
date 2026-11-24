<template>
  <div v-if="session" class="review">
    <BackVine to="/mine"/>
    <header class="top-nav">
      <div class="logo">回看这块地</div>
      <nav><button class="btn-ghost" @click="copy">复制这堆想法</button></nav>
    </header>

    <!-- 类型钉在顶上，不跟着想法一起滚走 -->
    <div class="r-head card edge">
      <div class="r-topic">
        {{ session.topic_name }}
        <span class="badge">已封存</span>
      </div>
      <h1>{{ session.title }}</h1>
      <p v-if="session.question" class="r-q">“{{ session.question }}”</p>
      <p class="r-meta">一共挖到第 {{ session.level }} 层 · {{ thoughts.length }} 滴想法 · 封存于 {{ (session.ended_at || '').slice(0, 16) }}</p>
      <label class="r-find">
        <Glyph name="leaf" :size="15"/>
        <input v-model="q" placeholder="在这一垅里找一句…" aria-label="搜索想法"/>
        <i v-if="q">{{ matched }} 滴</i>
      </label>
    </div>

    <div class="main-wrap">
    <main ref="mainBody" class="roll">
      <!-- 左边摊想法，右边压地层：两垅地各走各的 -->
      <div class="furrow" :class="{ reading }">
        <section class="col-dig" :class="{ reading }">
          <template v-if="!reading">
            <TransitionGroup tag="div" name="fall" class="layers">
              <div v-for="b in blocks" :key="b.k" :class="b.t ? 'r-row' : ['r-mark', 'layer-mark']" :style="b.t ? rowStyle(b.t) : null">
                <template v-if="b.t">
                  <span class="leaf">{{ b.t.dimension }}</span>
                  <div class="r-body">
                    <div class="r-text" :class="{ open: openRows.has(b.t.id) }"
                      :ref="el => bindRow(b.t.id, el)">
                      <PenText :text="b.t.content"/>
                    </div>
                    <div class="r-acts">
                      <button v-if="overRows.has(b.t.id)" type="button" class="r-more"
                        :aria-expanded="openRows.has(b.t.id)" @click.stop="toggleRow(b.t.id)">
                        <Glyph name="expand" :size="18"/>{{ openRows.has(b.t.id) ? '收起来' : '摊开看' }}
                      </button>
                      <button type="button" class="r-secret" :class="{ off: b.t.visible === 0 }"
                        :title="b.t.visible === 0 ? '放回院里，路过的人也能看见' : '这一滴只给自己看'"
                        @click.stop="toggleSecret(b.t)">
                        <Glyph :name="b.t.visible === 0 ? 'leaf' : 'umbrella'" :size="18"/>{{ b.t.visible === 0 ? '放出来' : '只给自己' }}
                      </button>
                    </div>
                  </div>
                  <figure v-if="b.t.img" class="r-photo" title="点开看大图" role="button" tabindex="0"
                    @click.stop="photo = b.t.img" @keydown.enter.stop="photo = b.t.img">
                    <img :src="b.t.img" alt="" loading="lazy"/>
                  </figure>
                </template>
                <template v-else>
                  <svg class="layer-vine" viewBox="0 0 260 26" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M2 18 C 34 7, 62 22, 92 13 C 122 4, 150 21, 182 12 C 208 5, 232 15, 258 10"/>
                    <path d="M58 14 C 55 8, 49 5, 42 5"/>
                    <path d="M146 11 C 150 5, 156 3, 164 4"/>
                  </svg>
                  <Glyph class="vine-leaf v1" name="leaf" :size="14"/>
                  <Glyph class="vine-leaf v2" name="sakura" :size="12"/>
                  <Glyph class="vine-leaf v3" name="sprout" :size="13"/>
                  <span>第 {{ b.head }} 层</span>
                </template>
              </div>
            </TransitionGroup>
            <p v-if="!blocks.length" class="r-empty">{{ q ? '这一垅里没找着，换个词试试。' : '这一垅还空着。' }}</p>
          </template>
          <FieldFold v-else :count="thoughts.length" @open="letLayerGo"/>
        </section>

        <aside v-if="milestones.length" class="col-kept">
          <div class="r-mark kept-title"><Glyph name="leaf" :size="14"/> —— 压过的地层 ——</div>
          <MilestoneTimeline :items="milestones" big peek :fold="layerFold"
            @open="viewLayer" @close="closeLayer"/>
        </aside>
      </div>
    </main>
    <VineScroll :el="mainBody"/>
    </div>

    <section class="r-pick" :class="{ picked: picked || held }" role="status">
      <Glyph name="leaf" :size="20"/>
      <div>
        <b>{{ held ? '这块地先收在田埂上' : picked ? '这块地已经收进你的田里了' : '已经看过了，要采摘吗？' }}</b>
        <span>{{ held ? '树上、地上、风里都满了，先放在「我的田地 · 没种下的」，腾出地方再种。'
          : picked ? '在「我的田地」里放着，想挂回树上或交给风，随时再种。' : '采回去的叶子会收进「我的田地」，不会从这儿消失。' }}</span>
      </div>
      <button v-if="!picked && !held" :disabled="pickBusy" @click="pick">采回田里</button>
      <router-link v-else-if="held" :to="`/mine?tab=held&focus=${session.id}`">去我的田地看看</router-link>
      <router-link v-else :to="`/mine?tab=picked&focus=${session.id}`">去我的田地看看</router-link>
    </section>

    <WheatField class="wheat" :n="12" frozen/>
    <PhotoViewer :src="photo" :title="session.title" @close="photo = ''"/>
  </div>
  <div v-else class="loading">土还在翻</div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api';
import { useField } from '../store/field';
import { dimOf } from '../constants/dimensions';
import { glyphOf } from '../icons';
import { toast } from '../utils/toast';
import WheatField from '../components/WheatField.vue';
import BackVine from '../components/BackVine.vue';
import MilestoneTimeline from '../components/MilestoneTimeline.vue';
import FieldFold from '../components/FieldFold.vue';
import VineScroll from '../components/VineScroll.vue';
import PenText from '../components/PenText.vue';
import Glyph from '../components/Glyph.vue';
import PhotoViewer from '../components/PhotoViewer.vue';

const route = useRoute();
const router = useRouter();
const field = useField();
const pickBusy = ref(false);
const session = ref(null);
const photo = ref('');
const picked = computed(() => session.value?.placement === 'picked');
const held = computed(() => session.value?.placement === 'held');
const thoughts = ref([]);
const milestones = ref([]);
const q = ref('');
const mainBody = ref(null);

// 看右边压住的地层时，左边这垅先收成一块折页标牌，把地方让给土层
const reading = ref(false);
const layerFold = ref(0);
const viewLayer = () => (reading.value = true);
const closeLayer = () => (reading.value = false);
const letLayerGo = () => {
  layerFold.value++;
  closeLayer();
};

onMounted(async () => {
  const d = await api.session(route.params.id);
  session.value = d.session;
  thoughts.value = d.thoughts;
  milestones.value = d.milestones;
  sizeRows();
  addEventListener('resize', sizeRows);
});
onBeforeUnmount(() => removeEventListener('resize', sizeRows));

async function pick() {
  if (pickBusy.value || picked.value || held.value) return;
  pickBusy.value = true;
  try {
    await api.pick(session.value.id);
    session.value.placement = 'picked';
    field.patch(session.value.id, { placement: 'picked', branch: null });
    toast('收进我的田里了');
  } finally {
    pickBusy.value = false;
  }
}

// 新挖的那一层先摊开；在整块地里找一句话，找到的那层留下
const groups = computed(() => {
  const k = q.value.trim().toLowerCase();
  const map = new Map();
  thoughts.value.forEach(t => {
    if (k && !(t.content + ' ' + t.dimension).toLowerCase().includes(k)) return;
    if (!map.has(t.level)) map.set(t.level, []);
    map.get(t.level).push(t);
  });
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([level, list]) => ({ level, list: list.slice().sort((a, b) => b.id - a.id) }));
});
const matched = computed(() => groups.value.reduce((n, g) => n + g.list.length, 0));

// 压过的地层一层不藏，全摊在这条流水上
const blocks = computed(() => groups.value
  .flatMap(g => [{ k: 'h' + g.level, head: g.level }, ...g.list.map(t => ({ k: 't' + t.id, t }))]));

// 一条想法先摊三行，多出来的折在纸下；点一下再全摊开
const openRows = ref(new Set());
const overRows = ref(new Set());
const rowEls = new Map();
const bindRow = (id, el) => (el ? rowEls.set(id, el) : rowEls.delete(id));
const toggleRow = id => {
  const next = new Set(openRows.value);
  next.has(id) ? next.delete(id) : next.add(id);
  openRows.value = next;
};
async function sizeRows() {
  await nextTick();
  const over = new Set();
  rowEls.forEach((el, id) => {
    if (openRows.value.has(id)) {
      if (overRows.value.has(id)) over.add(id);
      return;
    }
    if (el.scrollHeight - el.clientHeight > 2) over.add(id);
  });
  overRows.value = over;
}
watch(blocks, sizeRows, { flush: 'post' });

// 回看也不该像看表格：每条想法离左边的距离、倾角都跟着内容走
const rowStyle = t => {
  const h = [...t.content].reduce((a, c) => (a * 31 + c.codePointAt(0)) >>> 0, 5);
  return {
    '--c': dimOf(t.dimension).color,
    '--mx': 1 + (h >>> 3) % 10 + '%',
    '--rot': ((h >>> 11) % 17 - 8) / 12 + 'deg'
  };
};

// 这一滴只给自己，还是放回院里；改的是单滴，不牵动整块地
async function toggleSecret(t) {
  const visible = t.visible === 0 ? 1 : 0;
  await api.setThoughtVisible(t.id, visible);
  t.visible = visible;
  toast(visible ? '这滴放回院里了，路过的人看得见' : '这滴收起来了，只有你看得见');
}

function copy() {
  const lines = [
    `【${session.value.topic_name}】${session.value.title}`,
    session.value.question ? `问题：${session.value.question}` : '',
    ''
  ];
  thoughts.value.forEach(t => lines.push(`[第${t.level}层 · ${t.dimension}] ${t.content}`));
  if (milestones.value.length) {
    lines.push('', '—— 压过的地层 ——');
    milestones.value.slice().reverse().forEach(m => lines.push(`· ${m.title}${m.note ? '：' + m.note : ''}`));
  }
  navigator.clipboard.writeText(lines.filter(l => l !== '').join('\n'))
    .then(() => toast('全在剪贴板里了'))
    .catch(() => toast('浏览器不让复制，自己截个屏吧'));
}
</script>

<style scoped>
.review { position: relative; height: 100vh; height: 100dvh; display: flex; flex-direction: column; overflow: hidden;
  padding-left: clamp(78px, 7.5vw, 118px); padding-bottom: env(safe-area-inset-bottom);
  --fs-xs: calc(15px * var(--ui-scale)); --fs-sm: calc(16px * var(--ui-scale));
  --fs-md: calc(17px * var(--ui-scale)); --fs-base: calc(19px * var(--ui-scale));
  --fs-read: calc(21px * var(--ui-scale)); --fs-head: calc(24px * var(--ui-scale));
  --fs-title: calc(27px * var(--ui-scale)); --fs-hero: calc(34px * var(--ui-scale)); font-size: var(--fs-base); }
.review .top-nav { padding-left: 6px; }
/* 回看也不套窄盒子：纸摊开多大就多大，字才不用挤成一团 */
.main-wrap { position: relative; flex: 1; min-height: 0; display: flex; }
main { flex: 1; min-width: 0; min-height: 0; padding: 0 max(24px, 4vw) 18px max(0px, calc(max(24px, 4vw) - 30px)); }
.wheat { flex: none; }
/* 题头和下面的两垅地用同一条边，顶上也钉住不跟着滚 */
.r-head { flex: none; margin: 0 max(24px, 4vw) 22px max(0px, calc(max(24px, 4vw) - 30px)); padding: 20px 28px 22px; border-radius: var(--r-soft); }
.r-topic { font-size: var(--fs-head); color: var(--wood); display: flex; align-items: center; gap: 9px; }
.badge { flex: none; white-space: nowrap; font-size: var(--fs-md); border-radius: var(--r-c);
  padding: 1px 11px 2px; background: rgba(139, 107, 74, .13); color: var(--wood); }
.r-head h1 { font-size: var(--fs-title); font-weight: normal; margin: 8px 0 2px; letter-spacing: .05em; }
.r-q { color: var(--ink-soft); }
.r-meta { font-size: var(--fs-md); color: var(--ink-faint); margin-top: 8px; }
/* 在纸角找一句：没有方框，只有一道会跟着写的田埂 */
.r-find { display: flex; align-items: center; gap: 6px; width: min(330px, 100%); margin-top: 11px;
  color: var(--ink-faint); border-bottom: 1.2px dashed rgba(150, 133, 100, .45); }
.r-find input { flex: 1; min-width: 0; padding: 3px 0 5px; font-size: var(--fs-md); color: var(--ink); background: none; }
.r-find input::placeholder { font-style: italic; color: #B0A898; }
.r-find input:focus { outline: none; }
.r-find:focus-within { color: var(--grass-deep); border-bottom-color: rgba(79, 107, 58, .55); }
.r-find i { font-style: normal; font-size: var(--fs-xs); color: var(--ink-faint); white-space: nowrap; }
/* 往下翻过一阵，这片地才从田角探出来问一句：要不要收进自己的田里 */
.r-pick { position: fixed; right: max(24px, 4vw); bottom: calc(clamp(124px, 15vh, 154px) + env(safe-area-inset-bottom)); z-index: 50;
  width: max-content; max-width: calc(100vw - 48px); display: flex; align-items: center; gap: 12px;
  padding: 13px 16px 14px 18px;
  background: linear-gradient(0deg, rgba(126, 154, 95, .1), rgba(126, 154, 95, .1)), var(--card);
  border: 1.1px dashed rgba(126, 154, 95, .42);
  border-radius: 20px 9px 22px 8px / 9px 20px 8px 22px; color: var(--grass-deep);
  box-shadow: 0 12px 30px rgba(63, 58, 47, .13); }
/* 框子只按标题的长短定宽，底下那行小字顺着标题的宽折行，别让它把框撑大 */
.r-pick > div { flex: 0 1 auto; min-width: 0; }
.r-pick b { display: block; font-size: var(--fs-read); font-weight: normal; letter-spacing: .05em; white-space: nowrap; }
.r-pick span { display: block; width: 0; min-width: 100%; margin-top: 3px; font-size: var(--fs-base);
  line-height: 1.55; color: var(--ink-faint); white-space: normal; }
.r-pick button, .r-pick a { flex: none; font-size: var(--fs-read); color: var(--wood); letter-spacing: .06em;
  text-decoration: underline wavy rgba(139, 107, 74, .45) 1px; text-underline-offset: 5px; }
.r-pick button:hover, .r-pick a:hover { color: var(--grass-deep); }
.r-pick button:disabled { opacity: .5; cursor: default; }
.r-pick.picked { background: linear-gradient(0deg, rgba(139, 107, 74, .05), rgba(139, 107, 74, .05)), var(--card);
  border-color: rgba(150, 133, 100, .36); color: var(--wood); }

/* 两垅地：宽的那垅摊想法，窄的那垅压地层 */
.furrow { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 34px; align-items: start; }
/* 点开右边的地层，左边就让成一块折页标牌，土层铺开 */
.furrow.reading { grid-template-columns: clamp(132px, 13vw, 178px) minmax(0, 1fr); gap: 28px; }
.col-dig.reading { position: sticky; top: 12px; align-self: start; display: flex; justify-content: center; }
.col-kept { min-width: 0; }
.r-mark { font-size: var(--fs-base); color: var(--wood); text-align: center; margin-bottom: 12px; letter-spacing: .2em; }
/* 压过的地层跟着往下走，标题留在土面上 */
.kept-title { position: sticky; top: 0; z-index: 3; padding: 3px 0 8px; margin-bottom: 2px;
  background: var(--paper); display: flex; align-items: center; justify-content: center; gap: 5px; }
/* 层名不写光秃秃的破折号：一根藤从字底下穿过去，叶和花都从开源记号库里来 */
.layer-mark { position: relative; display: flex; align-items: center; justify-content: center;
  min-height: 34px; margin-bottom: 10px; }
.layer-vine { position: absolute; left: 11%; right: 11%; top: 2px; width: 78%; height: 24px;
  fill: none; stroke: var(--grass-deep); stroke-width: 1.2; stroke-linecap: round; opacity: .42;
  filter: url(#boil-soft); }
.vine-leaf { position: absolute; color: var(--grass-deep); opacity: .76; }
.v1 { left: 17%; top: 0; transform: rotate(-24deg); }
.v2 { right: 20%; top: 1px; color: var(--sakura); transform: rotate(18deg); }
.v3 { right: 10%; top: 9px; color: #7E9A5F; transform: rotate(8deg); }
.layer-mark > span { position: relative; padding: 0 8px; background: var(--paper); }
.r-empty { text-align: center; font-size: var(--fs-md); color: var(--ink-faint); padding: 22px 0; letter-spacing: .06em; }

.layers { position: relative; margin-bottom: 8px; }
.r-row { display: flex; align-items: flex-start; gap: 12px; padding: 8px 16px 10px 18px; margin: 0 auto 13px var(--mx);
  width: max-content; max-width: min(86%, 200em);
  background: radial-gradient(100% 90% at 20% 16%, rgba(94, 83, 64, .045), transparent 62%), var(--card);
  border-radius: var(--r-a); transform: rotate(var(--rot)); }
/* 纸跟着字的长短裁；一条先露三行，剩下的折起来 */
.r-body { flex: 0 1 auto; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; }
.r-text { width: 100%; line-height: 1.8; max-height: calc(1.8em * 3); overflow: hidden; }
.r-text.open { max-height: none; }
.r-acts { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 14px;
  align-self: flex-end; margin-top: 2px; }
.r-more { display: inline-flex; align-items: center; gap: 4px;
  font-size: var(--fs-sm); color: var(--ink-faint); letter-spacing: .04em;
  text-decoration: underline dashed rgba(139, 122, 92, .5) 1px; text-underline-offset: 3px; }
.r-more:hover { color: var(--wood); }
/* 回看时也能把某一滴收起来；旁人院里就再翻不到这一句 */
.r-secret { display: inline-flex; align-items: center; gap: 4px;
  font-size: var(--fs-sm); color: var(--ink-faint); letter-spacing: .04em;
  text-decoration: underline dashed rgba(139, 122, 92, .45) 1px; text-underline-offset: 3px; }
.r-secret :deep(.gl) { opacity: .65; }
.r-secret:hover, .r-secret.off { color: var(--wood); }
.leaf { background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--ink);
  box-shadow: inset 0 0 0 1.1px color-mix(in srgb, var(--c) 45%, transparent); }
/* 当初压在这滴旁边的照片，回看时也一起摊出来 */
.r-photo { flex: none; width: 132px; margin-left: 4px; cursor: zoom-in; }
.r-photo img { display: block; width: 100%; max-height: 104px; object-fit: cover;
  border-radius: var(--r-c); box-shadow: inset 0 0 0 1.1px rgba(150, 133, 100, .4); }

/* 摊开这块地时，土层一层层从下往上落定 */
.fall-enter-active { transition: opacity .55s ease-out, transform .55s cubic-bezier(.22, .8, .26, 1); }
.fall-enter-from { opacity: 0; transform: translateY(18px); }

/* 窄到一句话放不下时，宁可折行也不让它探出纸外 */
@media (max-width: 960px) {
  .r-pick { width: auto; flex-wrap: wrap; }
}
/* 窄屏上两垅并不下，就一垅接一垅地顺着看 */
@media (max-width: 880px) {
  .furrow { grid-template-columns: minmax(0, 1fr); gap: 22px; }
  .furrow.reading { grid-template-columns: minmax(0, 1fr); }
  .col-dig.reading { position: static; padding: 4px 0 6px; }
  .r-row { max-width: 94%; }
}
@media (max-width: 720px) {
  .review { padding-left: max(60px, env(safe-area-inset-left)); }
  .review .top-nav { padding-left: 0; }
  main { padding-right: max(14px, env(safe-area-inset-right));
    /* 采摘栏浮在田角，给最后一张纸留出能翻到它上面的空地 */
    padding-bottom: calc(104px + env(safe-area-inset-bottom)); }
  .r-head { margin: 0 max(14px, env(safe-area-inset-right)) 16px 0; padding: 14px 16px 16px; }
  .r-q { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  /* 窄屏上照片别再跟字挤一条：字留在叶签旁边，照片落到纸角 */
  .r-row { display: grid; grid-template-columns: auto minmax(0, 1fr); row-gap: 7px; padding: 8px 14px 10px 16px; }
  .r-body { grid-column: 2; }
  .r-photo { grid-column: 1 / -1; justify-self: end; margin: 0; }
  .r-pick { left: 72px; right: 14px; bottom: calc(72px + env(safe-area-inset-bottom)); width: auto;
    flex-wrap: wrap; gap: 4px 9px; padding: 9px 12px 10px 14px; }
  .r-pick > div { flex: 1 1 calc(100% - 34px); }
  .r-pick b { font-size: calc(17px * var(--ui-scale)); }
  .r-pick span { display: none; }
  .r-pick button, .r-pick a { font-size: calc(19px * var(--ui-scale)); margin-left: 29px; }
}
@media (max-width: 420px) {
  .r-head { padding: 12px 13px 14px; }
  .r-head h1 { font-size: var(--fs-head); }
  .r-topic { font-size: var(--fs-base); flex-wrap: wrap; }
  .r-row { max-width: 100%; margin-left: 0; }
  .r-pick b, .r-pick span { font-size: calc(16px * var(--ui-scale)); }
}
</style>
