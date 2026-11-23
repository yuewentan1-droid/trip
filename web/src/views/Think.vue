<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api';
import { DIMS, dimOf } from '../constants/dimensions';
import { drawHook } from '../constants/hooks';
import { glyphOf } from '../icons';
import { toast } from '../utils/toast';
import { ask } from '../utils/ask';
import { GROUND_CAP, TREE_MAX, WIND_CAP, extraTrees, groveCount, plantTree, treeLimit, treeTotal } from '../utils/grove';
import { useField } from '../store/field';
import { useUser } from '../store/user';
import DimensionPicker from '../components/DimensionPicker.vue';
import ThoughtCard from '../components/ThoughtCard.vue';
import VineFlow from '../components/VineFlow.vue';
import MilestoneTimeline from '../components/MilestoneTimeline.vue';
import Toss from '../components/Toss.vue';
import RewardBloom from '../components/RewardBloom.vue';
import PenPanel from '../components/PenPanel.vue';
import FenceToggle from '../components/FenceToggle.vue';
import Spread from '../components/Spread.vue';
import BackVine from '../components/BackVine.vue';
import FieldFold from '../components/FieldFold.vue';
import VineScroll from '../components/VineScroll.vue';
import Glyph from '../components/Glyph.vue';
import ModalSprig from '../components/ModalSprig.vue';
import PhotoViewer from '../components/PhotoViewer.vue';

const route = useRoute();
const router = useRouter();
const field = useField();
const user = useUser();
// 路由给的是字符串，库里 id 是数字；转一次，回写原野那份缓存才认得出这块地
const id = +route.params.id;

const session = ref(null);
const thoughts = ref([]);
const milestones = ref([]);
const dim = ref('学科');
const draft = ref('');
const draftImg = ref('');
const sowPhoto = ref(null);
const shooting = ref(false);
const hook = ref('');
const grow = ref(false);
const tip = ref('');
// 每跨过 3 的倍数层，递一礼；0 就是没礼
const gift = ref(0);
// 第一次收到完整的礼之后，才轻轻提一句篱笆的事，只提一次
const guide = ref(false);
const pendingGuide = ref(false);
const showArc = ref(false);
const arcTitle = ref('');
const arcNote = ref('');
const edit = ref(null);
const editPhoto = ref(null);
const showPen = ref(false);
// 点开照片，在田埂上看大图
const photo = ref('');
// 封存时问一句：这块地，挂在树上还是种在地上
const placing = ref(false);
// 五棵树各有各的地界，挂满了就在旁边再冒一棵；小院里最多五棵，再多就落土、交给风
const extra = ref(extraTrees(user.user?.id, user.user?.extra_trees));
const treeCount = computed(() => treeTotal(field.sessions));
const slots = computed(() => groveCount(treeCount.value, extra.value));
const treeFull = computed(() => treeCount.value >= treeLimit(slots.value));
const groveFull = computed(() => slots.value >= TREE_MAX);
// 地上按树根分，每根最多十五棵；还没种树的，五条土埂都留着
const roots = computed(() => {
  const tree = field.sessions.filter(s => s.status === 'running' || s.placement === 'tree' || !s.placement).length;
  return tree ? groveCount(tree, extra.value) : TREE_MAX;
});
const groundFull = computed(() =>
  field.sessions.filter(s => s.placement === 'ground').length >= GROUND_CAP * roots.value);
const windFull = computed(() =>
  field.sessions.filter(s => s.placement === 'wind').length >= WIND_CAP);
// 三处都没地方了：不拦着封存，先收进我的田地，回头再种
const allFull = computed(() => treeFull.value && groundFull.value && windFull.value);
// 再种一棵：本机记着，也告诉服务器，换台机器串门时才看得见这一棵
async function moreTree() {
  extra.value = plantTree(user.user.id,
    Math.max(user.user?.extra_trees || 0, slots.value - 1));
  await user.save({ extra_trees: extra.value });
}
// 输入框的边线：一落笔就抽出来，纸不再是空的
const typing = ref(false);
const draftLen = computed(() => [...draft.value].length);
const BODY_MAX = 500;
// 篱笆的公开/私密就在落墨旁边，改完轻轻说一句
const vis = computed(() => user.user?.visibility || 'private');
const fenceSay = ref('');
const FENCE_WORDS = {
  public: ['篱笆敞着，路过的人能看一眼', '风能进来，别人也能进来'],
  private: ['篱笆围上了，就你自己知道', '这块地，先自己待着']
};
let fenceTimer;
async function toggleFence() {
  const next = vis.value === 'public' ? 'private' : 'public';
  const d = await user.save({ visibility: next });
  const words = FENCE_WORDS[d.visibility];
  fenceSay.value = words[Math.floor(Math.random() * words.length)];
  clearTimeout(fenceTimer);
  fenceTimer = setTimeout(() => (fenceSay.value = ''), 2400);
}
// 风起在哪儿：落墨从输入框那道底边起，封存从「结束思考」上起
const gust = ref(null);
const ink = ref(null);
const drop = ref(null);
const sealBtn = ref(null);
const at = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
// 光标落在第几行第几个字：拿一段看不见的同样字排一遍，量那一点
function caretPoint(el) {
  const cs = getComputedStyle(el), box = el.getBoundingClientRect();
  const ghost = document.createElement('div');
  ghost.style.cssText = `position:fixed;left:${box.left}px;top:${box.top}px;width:${box.width}px;visibility:hidden;white-space:pre-wrap;word-break:break-word;font:${cs.font};letter-spacing:${cs.letterSpacing};line-height:${cs.lineHeight};padding:${cs.padding}`;
  ghost.textContent = el.value.slice(0, el.selectionStart ?? 0);
  const mark = document.createElement('i');
  mark.textContent = '.';
  ghost.appendChild(mark);
  document.body.appendChild(ghost);
  const r = mark.getBoundingClientRect();
  ghost.remove();
  return { x: r.left, y: r.bottom };
}
// 种子从笔尖底下起：横竖都跟着光标，不贴着输入框底边乱落
const mouth = () => caretPoint(ink.value);

const finished = computed(() => session.value?.status === 'finished');
const maxML = computed(() => milestones.value.reduce((a, m) => Math.max(a, m.level), 0));
const showArchiveBtn = computed(() => !finished.value && session.value && session.value.level > maxML.value);
const counts = computed(() => {
  const c = Object.fromEntries(DIMS.map(d => [d.key, 0]));
  thoughts.value.forEach(t => { c[t.dimension]++; });
  return c;
});
onMounted(async () => {
  user.load();
  const [d] = await Promise.all([api.session(id), field.refresh()]);
  session.value = d.session;
  thoughts.value = d.thoughts;
  milestones.value = d.milestones;
  measure();
  addEventListener('resize', measure);
});
onBeforeUnmount(() => {
  removeEventListener('resize', measure);
  clearTimeout(fenceTimer);
});

/* ——— 思绪长河：河道 + 每条想法接入河道的枝须 ——— */
const stream = ref(null);
const grid = ref(null);
const leftCol = ref(null);
const rightCol = ref(null);
const cards = new Map();
const bind = (id, el) => (el ? cards.set(id, el.$el ?? el) : cards.delete(id));
const river = ref('');
const twigs = ref([]);
const riverH = ref('100%');
// 扒开一层地层，河面上的种子都先收回三十字
const seedFold = ref(0);
const foldSeeds = () => { seedFold.value++; nextTick(measure); };
// 看地层的时候，整条河先收进一块折页标牌；点开再把河放回来，地层也一起合上
const reading = ref(false);
const layerFold = ref(0);
const viewLayer = () => { foldSeeds(); reading.value = true; };
const closeLayer = () => { reading.value = false; nextTick(measure); };
const letRiverOut = () => { layerFold.value++; closeLayer(); };

async function measure() {
  await nextTick();
  const box = stream.value?.getBoundingClientRect();
  if (!box) return;
  // 河要铺满整条滚动的内容，不是只铺看得见的那一屏
  const H = Math.max(stream.value.scrollHeight, 220), gx = 22, top = stream.value.scrollTop;
  riverH.value = H + 'px';
  // 河道自己晃，枝须就从河上当前那条线出发，才不会看着像两根没接上的线
  const rx = y => gx + Math.sin(y / H * 5.4 + .3) * 11 + Math.sin(y / H * 2.3) * 5;
  let d = `M${rx(-14).toFixed(1)} -14`;
  for (let y = 2; y <= H + 16; y += 16) d += ` L${rx(y).toFixed(1)} ${y.toFixed(1)}`;
  river.value = d;
  twigs.value = thoughts.value.map(t => {
    const el = cards.get(t.id);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const x = r.left - box.left, y = r.top - box.top + top + 26;
    const sx = rx(y - 2);
    return {
      k: t.id, c: dimOf(t.dimension).color,
      d: `M${sx.toFixed(1)} ${(y - 2).toFixed(1)} C ${((sx + x) * .42).toFixed(1)} ${(y + 11).toFixed(1)}, ${(x * .62).toFixed(1)} ${(y - 9).toFixed(1)}, ${(x - 3).toFixed(1)} ${y.toFixed(1)}`
    };
  }).filter(Boolean);
}
watch(thoughts, measure, { deep: true });

/* ——— 落墨 ——— */
// 点落墨：风从墨池下沿起，把种子带走；话同时就埋进地里，不等风
function plant(e) {
  const content = draft.value.trim();
  if (!content || finished.value) return;
  if ([...content].length > BODY_MAX) return toast('这一层装不下了，再落一层');
  // 风从指尖或光标底下起，再顺着输入框底边扬出去
  gust.value = mouth(e);
  // 先腾空，连着按两下 Ctrl+Enter 也只种得下一句
  const img = draftImg.value;
  draft.value = '';
  draftImg.value = '';
  sow(content, img);
}

async function sow(content, img) {
  const d = await api.addThought(id, { dimension: dim.value, content, img });
  thoughts.value.push(d.thought);
  session.value.level = d.level;
  session.value.thought_count++;
  field.patch(id, { level: d.level, thought_count: session.value.thought_count });
  stream.value?.scrollTo({ top: stream.value.scrollHeight, behavior: 'smooth' });
  toast('种下了');
  const last3 = thoughts.value.slice(-3);
  if (last3.length === 3 && last3.every(t => t.dimension === d.thought.dimension))
    setTimeout(() => toast('一直在同一个角度看，要不要换个视角？'), 600);
  // 跨过 3 的倍数层就递一礼；只是寻常升层，冒一片叶子够了，别打断心流
  if (d.reward) {
    gift.value = d.stage;
    if (d.stage === 1 && localStorage.getItem('guide_fence_shown') !== '1') pendingGuide.value = true;
  }
  else if (d.levelUp) {
    grow.value = true;
    tip.value = '又往下挖了一层';
    setTimeout(() => { grow.value = false; }, 1400);
    setTimeout(() => { tip.value = ''; }, 2800);
  }
}

async function archive() {
  if ([...arcTitle.value.trim()].length > 10) return toast('标题最多十个字');
  if ([...arcNote.value.trim()].length > 30) return toast('这句话最多三十个字');
  const m = await api.addMilestone(id, { title: arcTitle.value, note: arcNote.value });
  milestones.value.unshift(m);
  showArc.value = false;
  arcTitle.value = arcNote.value = '';
  toast('这一层压好了');
}

async function finish() {
  const sure = await ask({
    title: '这块地要封存了吗？', icon: 'archive',
    body: '封存之后只能回看，不能新种了。想好了就点封存。',
    ok: '封存', cancel: '再想想'
  });
  if (sure) placing.value = true;
}
// 选好长在哪儿，这一把叶子才从封存按钮上被风带走；挂在树上的枝不挑，树自己分
async function seal(where) {
  if (where === 'tree' && treeFull.value) {
    if (groveFull.value) {
      const soil = await ask({
        title: '五棵树都挂满了', icon: 'sprout',
        body: groundFull.value
          ? '小院里再挪不出树，地上也满了。这块地，就交给风吧。'
          : '主树挂六十块，往后四棵各挂三十、二十、二十五、三十块，小院里再挪不出树了。这块地，就种在土里吧。',
        ok: groundFull.value ? '交给风' : '种在地上', cancel: '再想想'
      });
      if (!soil) return;
      where = groundFull.value ? 'wind' : 'ground';
    } else {
      const more = await ask({
        title: '这一棵已经挂满了', icon: 'pine',
        body: '这一棵的地都挂稳了。再种一棵，接着往上挂？',
        ok: '再种一棵', cancel: '先这样'
      });
      if (!more) return;
      await moreTree();
    }
  }
  placing.value = false;
  gust.value = at(sealBtn.value);
  const d = await api.finish(id, { placement: where });
  session.value.status = 'finished';
  session.value.placement = d.placement;
  session.value.branch = d.branch;
  field.patch(id, { status: 'finished', placement: d.placement, branch: d.branch });
  if (d.placement === 'held') {
    toast('三处都满了，先收进我的田地');
    const go = await ask({
      title: '先收在田埂上了', icon: 'pot',
      body: '树上、地上、风里都满了。这块地放在「我的田地 · 没种下的」，等院里腾出地方，再挑个位置种回去。现在去看看？',
      ok: '现在去看', cancel: '回头再说'
    });
    if (go) router.push('/mine?tab=held&focus=' + id);
    return;
  }
  toast(where === 'wind' ? '交给风了' : '这块地封存了');
  // 刚好挂满这一棵：问一声，要不要在旁边再种一棵
  if (where === 'tree' && treeCount.value === treeLimit(slots.value)) {
    if (groveFull.value) return toast('五棵树都满了，往后的地就种在土里、交给风吧');
    const more = await ask({
      title: '这棵树挂满了', icon: 'sprout',
      body: '这一棵的地都挂稳了。要不要在旁边再种一棵，往后接着长？',
      ok: '种一棵', cancel: '先这样'
    });
    if (more) {
      await moreTree();
      toast('又一棵种下了，去原野上看一眼');
    }
  }
}

async function del(t) {
  if (finished.value) return;
  const out = await ask({ title: '拔掉这一滴？', body: '写下的字就没了，找不回来。', ok: '拔掉', cancel: '再想想', icon: 'trash' });
  if (!out) return;
  await api.delThought(t.id);
  thoughts.value = thoughts.value.filter(x => x.id !== t.id);
  session.value.thought_count--;
  session.value.level = Math.floor(session.value.thought_count / 3) + 1;
  field.patch(id, { level: session.value.level, thought_count: session.value.thought_count });
}

// 照片先递到 uploads，再把地址记在这滴上；传之前把公开的风险说清楚
const IMG_MAX = 300 * 1024 * 1024;
const agreeSowPhoto = () => ask({
  title: '给这滴种子压张照片', icon: 'sprout',
  body: '挑一张照片，跟种子一起落进田里。风会把它带出去，路过的人看得见、存得下，也可能顺手截图。真被谁拿去用了，田里管不住。想好了再放。',
  ok: '压在种子旁', cancel: '再等等'
});
const agreeEditPhoto = () => ask({
  title: '照片会公开', icon: 'image',
  body: '传上去的照片会显示在想法旁边，别人能看、能下载，也可能被截图。存在被盗用或拿去商用的风险。愿意公开再传。',
  ok: '愿意，挑一张', cancel: '先不传'
});
async function pickSowPhoto() {
  if (await agreeSowPhoto()) sowPhoto.value?.click();
}
async function attachSow(e) {
  const f = e.target.files[0];
  if (!f) return;
  if (f.size > IMG_MAX) return toast('照片不能超过 300M');
  shooting.value = true;
  try {
    draftImg.value = (await api.upload(f)).url;
  } finally {
    shooting.value = false;
    e.target.value = '';
  }
}
async function pickEditPhoto() {
  if (await agreeEditPhoto()) editPhoto.value?.click();
}
async function attachEdit(e) {
  const f = e.target.files[0];
  if (!f) return;
  if (f.size > IMG_MAX) return toast('照片不能超过 300M');
  edit.value.img = (await api.upload(f)).url;
  e.target.value = '';
}

async function saveEdit() {
  if ([...edit.value.content].length > BODY_MAX) return toast('这一层装不下了，再落一层');
  const patch = {
    dimension: edit.value.dimension, content: edit.value.content, img: edit.value.img || ''
  };
  await api.updThought(edit.value.id, patch);
  const i = thoughts.value.findIndex(t => t.id === edit.value.id);
  thoughts.value[i] = { ...thoughts.value[i], ...patch };
  edit.value = null;
  toast('改好了');
}

async function delMile(m) {
  const out = await ask({ title: '抹掉这一层存档？', body: '地层没了，写过的想法还留着。', ok: '抹掉', cancel: '再想想', icon: 'scroll' });
  if (!out) return;
  await api.delMilestone(m.id);
  milestones.value = milestones.value.filter(x => x.id !== m.id);
}

function rollHook() {
  hook.value = drawHook(session.value?.topic_name);
}

// 礼播完了，停一小会儿再把那句话说出口
function giftDone() {
  gift.value = 0;
  if (!pendingGuide.value) return;
  pendingGuide.value = false;
  setTimeout(() => (guide.value = true), 1200);
}
function closeGuide(toMine) {
  localStorage.setItem('guide_fence_shown', '1');
  guide.value = false;
  if (toMine) router.push('/mine');
}
// 点别处也当看过了，不拦着用户继续写
function offGuide(e) {
  if (!e.target.closest('.fence-guide')) closeGuide(false);
}
watch(guide, on => {
  if (on) document.addEventListener('pointerdown', offGuide, true);
  else document.removeEventListener('pointerdown', offGuide, true);
});
onBeforeUnmount(() => document.removeEventListener('pointerdown', offGuide, true));
</script>

<template>
  <div v-if="session" class="work" :class="{ sealed: finished }" :style="{ '--c': dimOf(dim).color }">
    <BackVine/>
    <div v-if="tip" class="tip-bar">{{ tip }}</div>

    <header class="w-top">
      <div class="w-name">
        <Glyph :name="glyphOf({ name: session.topic_name })" :size="24"/>
        <span class="w-topic">{{ session.topic_name }}</span>
        <b>{{ session.title }}</b>
      </div>
      <div class="w-meta">第 {{ session.level }} 层 · {{ session.thought_count }} 滴</div>
      <button class="penbtn" title="笔风" @click="showPen = true"><Glyph name="pen" :size="40"/></button>
      <router-link v-if="finished" class="btn-ghost" :to="'/review/' + id">回看这块地</router-link>
      <button v-else ref="sealBtn" class="seal" @click="finish"><Glyph name="archive" :size="23"/> 结束思考</button>
    </header>
    <p v-if="session.question" class="w-q">“{{ session.question }}”</p>

    <div class="grid-wrap">
    <main ref="grid" class="w-grid" :class="{ reading, 'no-layer': !milestones.length }">
      <div class="w-left-wrap">
      <aside ref="leftCol" class="w-left roll">
        <i class="wash" :key="dim"/>
        <DimensionPicker v-model="dim" :disabled="finished" :center="counts[dim] + ' 滴'"/>
        <button class="hook-btn" :disabled="finished" @click="rollHook"><Glyph name="again" :size="19"/> 抽个引子</button>
        <p v-if="hook" class="hook">{{ hook }}</p>

        <!-- 礼长在撒种这口井的左边，就在引子底下，不抢河面的地方 -->
        <RewardBloom v-if="gift" :stage="gift" @done="giftDone"/>

      </aside>
      <VineScroll :el="leftCol"/>
      </div>

      <section class="w-main" :class="{ reading }">
        <template v-if="!reading">
        <div class="stream-wrap">
        <div ref="stream" class="stream roll">
          <VineFlow :river="river" :twigs="twigs" :style="{ height: riverH }"/>
          <i v-if="thoughts.length" class="pebble"/>

          <ThoughtCard v-for="(t, i) in thoughts" :key="t.id" :t="t" :i="i" :frozen="finished"
            :fold="seedFold" :ref="el => bind(t.id, el)"
            @edit="!finished && (edit = { ...t })" @del="del" @resize="measure"
            @view="photo = $event.img"/>
        </div>
        <VineScroll :el="stream"/>
        </div>

        <div class="mouth">
          <button v-if="showArchiveBtn" class="arc-fab" type="button" @click="showArc = true"><Glyph name="scroll" :size="19"/> 存个档</button>
          <form v-if="!finished" class="well" @submit.prevent>
            <textarea ref="ink" v-model="draft" rows="3" placeholder="把种子撒在这里……"
              @focus="typing = true" @blur="typing = false" @keydown.ctrl.enter.prevent="plant($event)"/>
            <svg class="well-rule" :class="{ live: typing || draft }" viewBox="0 0 600 7" preserveAspectRatio="none" aria-hidden="true">
              <path class="base" d="M2 3.5 C 100 2.1, 200 4.7, 300 3.3 C 400 1.9, 500 4.3, 598 2.9"/>
              <path class="ink" pathLength="1" d="M2 3.5 C 100 2.1, 200 4.7, 300 3.3 C 400 1.9, 500 4.3, 598 2.9"/>
            </svg>
            <div class="well-bar">
              <span class="chip"><Glyph :name="dimOf(dim).glyph" :size="21"/> {{ dim }}</span>
              <span class="hint" :class="{ over: draftLen > BODY_MAX }">
                {{ draftLen > BODY_MAX ? '这一层装不下了，再落一层' : 'Ctrl + Enter 落墨' }}
              </span>
              <span class="count" :class="{ over: draftLen > BODY_MAX }">{{ draftLen }} / {{ BODY_MAX }}</span>
              <Spread v-model="draft" :max="BODY_MAX" placeholder="把种子撒在这里……" wide/>
              <FenceToggle class="well-fence" :open="vis === 'public'" @toggle="toggleFence"/>
              <button type="button" class="sow-shot" :disabled="shooting" title="给这滴种子压一张照片"
                @click="pickSowPhoto">
                <img v-if="draftImg" :src="draftImg" alt="" @click.stop="photo = draftImg"/>
                <Glyph v-else name="image" :size="24"/>
              </button>
              <input ref="sowPhoto" type="file" accept="image/*" hidden @change="attachSow"/>
              <button ref="drop" class="drop" type="button" :disabled="!draft.trim() || shooting" title="落下去" @click="plant($event)"><Glyph name="leaf" :size="34" draw/></button>
            </div>
            <p v-if="draftImg" class="sow-photo-note">照片跟着种子一起长在田里，路过的人都看得见。</p>
            <Transition name="say">
              <p v-if="fenceSay" class="fence-whisper">{{ fenceSay }}</p>
            </Transition>
          </form>

          <div v-else class="crate">
            <svg viewBox="0 0 120 62" aria-hidden="true">
              <path pathLength="1" d="M8 22 C 34 20, 86 21, 112 22 C 114 38, 112 50, 110 58 C 74 60, 30 59, 10 58 C 8 46, 7 34, 8 22 Z"/>
              <path pathLength="1" d="M6 22 C 36 11, 84 11, 114 22 M10 30 C 40 28, 80 28, 110 30 M52 25 h 18 v 13 h -18 Z"/>
            </svg>
            <p>这块地封存了。只许回看，不许新种。</p>
          </div>

          <Transition name="guide">
            <div v-if="guide" class="fence-guide">
              <button class="fg-text" @click="closeGuide(true)">这块地，想敞着门吗？——<u>去我的田地里看看</u></button>
              <button class="fg-x" title="知道了" @click="closeGuide(false)"><Glyph name="close" :size="18"/></button>
            </div>
          </Transition>
        </div>
        </template>
        <FieldFold v-else :count="thoughts.length" @open="letRiverOut"/>
      </section>

      <div v-if="milestones.length" class="w-right-wrap">
      <aside ref="rightCol" class="w-right roll">
        <div class="m-h"><Glyph name="scroll" :size="30"/> 压住的地层</div>
        <MilestoneTimeline :items="milestones" :delable="!finished" big peek :fold="layerFold"
          @del="delMile" @open="viewLayer" @close="closeLayer"/>
      </aside>
      <VineScroll :el="rightCol"/>
      </div>
    </main>
    <VineScroll :el="grid"/>
    </div>

    <div v-if="grow" class="grow">
      <Glyph class="g1" name="sprout" :size="49" draw/>
      <Glyph class="g2" name="leaf" :size="43" draw/>
      <Glyph class="g3" name="leaf" :size="47" draw/>
      <Glyph class="g4" name="leaf" :size="41" draw/>
    </div>

    <div v-if="showArc" class="mask" @click.self="showArc = false">
      <div class="modal arc-modal">
        <ModalSprig/>
        <h3 class="m-h"><Glyph name="scroll" :size="27"/> 在 第 {{ session.level }} 层 压一道地层</h3>
        <div class="f-item">
          <label>标题（留空就叫「第 {{ session.level }} 层」）</label>
          <input v-model="arcTitle"/>
        </div>
        <div class="f-item">
          <label>说一句给未来的自己（可空）</label>
          <textarea v-model="arcNote" rows="2"/>
        </div>
        <div class="m-acts">
          <button class="btn-ghost" @click="showArc = false">算了</button>
          <button class="btn" @click="archive">压上去</button>
        </div>
      </div>
    </div>

    <div v-if="placing" class="mask" @click.self="placing = false">
      <div class="modal place-modal">
        <ModalSprig/>
        <h3 class="m-h"><Glyph name="sprout" :size="31"/> 「{{ session.title }}」封好了</h3>
        <p class="place-q">{{ allFull ? '树上、地上、风里都满了，先收在田埂上吧' : '想让它长在哪儿？' }}</p>
        <div v-if="allFull" class="place-ways">
          <button class="way" @click="seal('held')">
            <Glyph name="pot" :size="58"/>
            <b>先收进我的田地</b>
            <span>在三处腾出地方之前，先搁在「没种下的」里，随时能再挑地方种</span>
          </button>
        </div>
        <div v-else class="place-ways">
          <button class="way" @click="seal('tree')">
            <Glyph name="pine" :size="58"/>
            <b>挂在树上</b>
            <span>{{ treeFull ? (groveFull ? '五棵都满了，这块落土里吧' : '这棵挂满了，再种一棵接着挂') : '树上有的是枝，它自己挑一根长' }}</span>
          </button>
          <button class="way" :disabled="groundFull" @click="seal('ground')">
            <Glyph name="sprout" :size="58"/>
            <b>种在地上</b>
            <span>{{ groundFull ? '每个树根下都种满十五棵了' : '落在一棵树的根下，每个根最多十五棵' }}</span>
          </button>
          <button class="way" :disabled="windFull" @click="seal('wind')">
            <Glyph name="fly" :size="58"/>
            <b>交给风</b>
            <span>{{ windFull ? '风里最多留 200 片，已经满了' : '不挂也不种，飘到哪儿算哪儿' }}</span>
          </button>
        </div>
        <div class="m-acts"><button class="btn-ghost" @click="placing = false">先不封了</button></div>
      </div>
    </div>

    <div v-if="edit" class="mask" @click.self="edit = null">
      <div class="modal edit-modal">
        <ModalSprig/>
        <div class="edit-body">
          <h3 class="m-h"><Glyph name="pen" :size="27"/> 修一修这一滴</h3>
          <div class="f-item"><DimensionPicker v-model="edit.dimension"/></div>
          <div class="f-item edit-well">
            <textarea v-model="edit.content" rows="3"/>
            <p class="edit-count" :class="{ over: [...edit.content].length > BODY_MAX }">
              {{ [...edit.content].length }} / {{ BODY_MAX }}
              <span v-if="[...edit.content].length > BODY_MAX">这一层装不下了，再落一层</span>
            </p>
          </div>
          <div class="f-item">
            <label>这一滴旁边，要不要压一张照片（可空）</label>
            <div class="edit-shot">
              <img v-if="edit.img" :src="edit.img" alt="" title="点开看大图" @click="photo = edit.img"/>
              <div class="shot-acts">
                <button type="button" class="shot-btn" @click="pickEditPhoto">
                  <Glyph name="image" :size="23"/> {{ edit.img ? '换一张' : '挑一张照片' }}
                </button>
                <button v-if="edit.img" type="button" class="shot-btn" @click="edit.img = ''">撤掉</button>
              </div>
              <input ref="editPhoto" type="file" accept="image/*" hidden @change="attachEdit"/>
            </div>
          </div>
        </div>
        <div class="m-acts">
          <button class="btn-ghost" @click="edit = null">不改了</button>
          <button class="btn" @click="saveEdit">改好了</button>
        </div>
      </div>
    </div>

    <Toss v-if="gust" :x="gust.x" :y="gust.y" @done="gust = null"/>
    <PenPanel v-if="showPen" wide @close="showPen = false"/>
    <PhotoViewer :src="photo" :title="session.title" @close="photo = ''"/>
  </div>
  <div v-else class="loading">土还在翻</div>
</template>

<style scoped>
/* 一整屏就是这一块地：顶上题头，中间三栏各自滚，页面本身不动 */
.work { position: relative; height: 100vh; height: 100dvh; display: flex; flex-direction: column; overflow: hidden;
  padding-left: clamp(78px, 7.5vw, 118px);
  --fs-xs: 19px; --fs-sm: 20px; --fs-md: 21px; --fs-base: 23px; --fs-read: 25px;
  --fs-head: 28px; --fs-title: 31px; --fs-hero: 38px; font-size: var(--fs-base); }

.w-top {
  flex: none; display: flex; align-items: center; gap: 13px; padding: 10px 26px 9px;
  position: relative; z-index: 20; background: color-mix(in srgb, var(--paper) 90%, transparent);
}
.w-top::after { content: ''; position: absolute; left: 3%; right: 3%; bottom: 0; height: 1.4px;
  background: repeating-linear-gradient(90deg, rgba(150, 133, 100, .5) 0 9px, transparent 9px 15px); }
.w-name { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;
  font-size: 30px; font-weight: 600; letter-spacing: .05em;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.w-topic { color: var(--wood); }
.w-name b { font-weight: 600; letter-spacing: .05em; }
.w-meta { font-size: var(--fs-md); color: var(--ink-faint); }
.seal { display: inline-flex; align-items: center; gap: 7px; color: var(--wood); font-size: var(--fs-base); font-weight: 600;
  padding: 7px 17px 8px; border-radius: var(--r-c); box-shadow: inset 0 0 0 1.3px rgba(139, 107, 74, .44); transition: .4s; }
.seal:hover { background: rgba(139, 107, 74, .1); }
.w-q { flex: none; text-align: center; color: var(--wood); padding: 8px 22px 0; font-size: var(--fs-base); }

/* 跟我的田地一样摊开：不留一条固定宽度的中央窄道，屏幕多宽河就多宽 */
.grid-wrap { position: relative; flex: 1; min-height: 0; display: flex; }
.w-grid { flex: 1; min-width: 0; min-height: 0; display: grid; width: 100%;
  grid-template-columns: clamp(240px, calc(40vw - 290px), 340px) minmax(0, 1fr) clamp(260px, calc(17vw + 30px), 330px);
  gap: clamp(14px, 1.4vw, 22px);
  padding: 10px clamp(18px, 2.2vw, 34px) 16px clamp(10px, 1.4vw, 24px); }
/* 还没压过地层，右边就不留一只空筐；河自己铺到纸边 */
.w-grid.no-layer { grid-template-columns: clamp(240px, calc(40vw - 290px), 340px) minmax(0, 1fr); }
/* 看地层时河让开：中间只剩一块折页标牌，右边把土层铺开 */
.w-grid.reading { grid-template-columns: clamp(240px, calc(40vw - 290px), 340px) clamp(190px, 16vw, 245px) minmax(0, 1fr); }
.w-main.reading { justify-content: center; align-items: center; }

/* 左：视角罗盘 */
.w-left-wrap { position: relative; min-width: 0; min-height: 0; display: flex; }
.w-left { position: relative; flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; gap: 13px;
  isolation: isolate; overflow-x: clip; }
.wash { position: absolute; left: -18%; top: -6%; width: 136%; height: 62%; pointer-events: none; z-index: -1;
  background: radial-gradient(60% 50% at 40% 40%, var(--c), transparent 72%); opacity: .13; filter: url(#ink-blot);
  animation: washIn 1.5s cubic-bezier(.2, .8, .3, 1) backwards; }
@keyframes washIn { from { opacity: 0; transform: scale(.7) rotate(-4deg); } to { opacity: .13; transform: none; } }
.hook-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; font-size: var(--fs-base);
  margin-top: 22px; color: var(--ink-soft); letter-spacing: .05em; padding: 4px 0 7px;
  border-bottom: 1.2px dashed rgba(150, 133, 100, .5); transition: .4s; }
.hook-btn:hover:not(:disabled) { color: var(--wood); border-bottom-color: rgba(139, 107, 74, .75); }
.hook-btn:disabled { opacity: .45; }
.hook { font-size: var(--fs-md); color: var(--ink-soft); background: rgba(230, 216, 186, .35); padding: 9px 12px 10px;
  border-radius: var(--r-a); animation: inkIn .6s ease-out backwards; }
/* 中：思绪长河。河自己在框里滚，笔一直贴在底下 */
.w-main { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
/* 纸一窄，先收起快捷键和篱笆那句话；摊开、照片、存档和叶子还都站得下 */
@container (max-width: 600px) {
  .hint, .well-fence :deep(.fence-note) { display: none; }
  .well-bar { gap: 6px; }
}
/* 再窄一些，字数和摊开让出去，把地方留给叶子 */
@container (max-width: 370px) {
  .count, .well-bar :deep(.spread-open) { display: none; }
}
/* 再窄就只剩笔尖那点地方了，视角在钟面上看得见，这颗字让出去 */
@container (max-width: 380px) {
  .well-bar .chip { display: none; }
}
/* 水滴是正文，跟整页一个字号；只有右边地层退六号，纸面才松 */
.w-right-wrap { position: relative; min-width: 0; min-height: 0; display: flex; }
.w-right { position: relative; flex: 1; min-width: 0; min-height: 0; --fs-xs: 17px; --fs-sm: 20px; --fs-md: 22px; --fs-base: 23px;
  --fs-read: 24px; --fs-head: 27px; --fs-title: 30px; --fs-hero: 34px; }
.stream-wrap { position: relative; flex: 1; min-height: 0; display: flex; }
.stream { position: relative; flex: 1; min-width: 0; min-height: 0; padding-left: 46px; }
.pebble { position: absolute; left: 12px; top: -6px; width: 20px; height: 20px; border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, var(--graphite), rgba(90, 83, 64, .35) 70%, transparent); opacity: .5; }
.pebble::after, .pebble::before { content: ''; position: absolute; left: 50%; top: 50%; width: 46px; height: 22px;
  margin: -11px -23px; border: 1.2px solid rgba(126, 159, 174, .5); border-radius: 50%;
  animation: ripple 2.8s ease-out infinite; }
.pebble::after { animation-delay: 1.1s; }
/* 下种的笔：就是一支笔、一道虚线、一枚叶子，别的什么都不加 */
/* 纸不铺满整条河：跟落墨后那张差不多宽，存档就在纸角上另立一处 */
.mouth { position: relative; flex: none; margin-left: 46px; max-width: 880px; container-type: inline-size; }
.well { margin: 4px 0 0; padding-bottom: 6px; }
.well textarea { border: none; padding: 6px 2px; font-size: var(--fs-base); line-height: 1.9; background: transparent;
  resize: none; overflow: hidden; }
.well textarea::placeholder { font-style: italic; color: #B0A898; }
/* 一落笔，纸边就抽出一道活墨；不写字的时候它只是一条很淡的田埂 */
.well-rule { display: block; width: 100%; height: 7px; overflow: visible; margin-top: -1px; }
.well-rule path { fill: none; stroke-linecap: round; vector-effect: non-scaling-stroke; }
.well-rule .base { stroke: rgba(150, 133, 100, .34); stroke-width: 1.2; }
.well-rule .ink { stroke: var(--grass-deep); stroke-width: 1.5; opacity: .55; stroke-dasharray: 1;
  stroke-dashoffset: 1; transition: stroke-dashoffset .7s cubic-bezier(.2, .8, .25, 1), opacity .4s; }
.well-rule.live .ink { stroke-dashoffset: 0; opacity: .8; }
.penbtn { color: var(--ink-faint); line-height: 0; padding: 4px 7px; transition: color .35s, transform .35s; }
.penbtn:hover { color: var(--wood); transform: rotate(-6deg); }
.well-bar { display: flex; align-items: center; gap: 9px; margin-top: 2px; flex-wrap: nowrap; }
.chip { flex: none; display: inline-flex; align-items: center; gap: 5px; font-size: var(--fs-base);
  color: var(--ink-soft); white-space: nowrap; }
/* 字多了先让这句提示收窄，别把旁边摊开、篱笆和叶子挤得竖起来 */
.hint { font-size: var(--fs-sm); color: var(--ink-faint); flex: 1 1 0; min-width: 0; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; transition: color .3s; }
.hint.over, .count.over { color: var(--clay); }
.count { flex: none; font-size: var(--fs-xs); color: var(--ink-faint); letter-spacing: .04em; white-space: nowrap;
  transition: color .3s; }
.well-bar :deep(.spread-open) { flex: none; white-space: nowrap; }
.edit-count { margin-top: 5px; font-size: var(--fs-xs); color: var(--ink-faint); text-align: right; letter-spacing: .04em; }
.edit-count span { margin-right: 8px; color: var(--clay); }
/* 编辑时配的照片：一张压歪的纸片，旁边是换和撤，不另起一个弹窗 */
.edit-shot { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.edit-shot img { width: 112px; height: 78px; object-fit: cover; border-radius: var(--r-c); cursor: zoom-in;
  box-shadow: inset 0 0 0 1.2px rgba(150, 133, 100, .4); transform: rotate(-1.2deg); }
.shot-acts { display: flex; align-items: center; gap: 12px; }
.shot-btn { display: inline-flex; align-items: center; gap: 6px; padding: 5px 13px 6px;
  font-size: var(--fs-md); color: var(--wood); border-radius: var(--r-c);
  box-shadow: inset 0 0 0 1.2px rgba(139, 107, 74, .38); transition: background .3s; }
.shot-btn:hover { background: rgba(139, 107, 74, .07); }
.well-fence { flex: none; margin-left: 2px; }
.well-fence :deep(.fence-svg) { width: 54px; height: 30px; }
.well-fence :deep(.fence-note) { font-size: var(--fs-sm); letter-spacing: 1px; }
/* 中间这格要让出地方给「Ctrl + Enter 落墨」，篱笆只留图，意思还在 */
/* 给这滴种子压一张照片：没选时是一枚小记号，选了就露出照片角 */
.sow-shot { flex: none; display: inline-grid; place-items: center; width: 34px; height: 30px; line-height: 0;
  color: var(--ink-faint); border-radius: var(--r-c); overflow: hidden; transition: color .3s;
  box-shadow: inset 0 0 0 1.1px rgba(150, 133, 100, .38); }
.sow-shot:hover:not(:disabled) { color: var(--wood); }
.sow-shot:disabled { opacity: .45; cursor: default; }
.sow-shot img { width: 100%; height: 100%; object-fit: cover; cursor: zoom-in; }
.sow-photo-note { padding: 2px 0 0 2px; font-size: var(--fs-sm); color: var(--ink-faint); letter-spacing: .04em; }
.fence-whisper { font-size: var(--fs-sm); color: var(--ink-faint); letter-spacing: .06em; padding: 1px 0 0 2px; }
.say-enter-active, .say-leave-active { transition: opacity .4s, transform .4s; }
.say-enter-from, .say-leave-to { opacity: 0; transform: translateY(3px); }
.drop { flex: none; margin-left: auto; color: var(--grass-deep); line-height: 0; padding: 2px 6px;
  transition: transform .5s cubic-bezier(.3, .9, .3, 1.2); }
.drop:hover:not(:disabled) { transform: translateY(3px) rotate(-8deg); }
.drop:disabled { color: var(--ink-faint); opacity: .4; }

/* 第一次收礼之后那一句：像谁在旁边小声提了一嘴，不是弹窗 */
.fence-guide { display: flex; align-items: center; gap: 6px; padding: 2px 2px 0; }
.fg-text { font-size: var(--fs-sm); color: var(--ink-faint); letter-spacing: .04em; text-align: left; }
.fg-text u { color: var(--wood); text-decoration: underline; text-decoration-style: wavy;
  text-decoration-thickness: 1px; text-underline-offset: 3px; }
.fg-text:hover { color: var(--ink-soft); }
.fg-x { color: var(--ink-faint); line-height: 0; padding: 2px; }
.fg-x:hover { color: var(--clay); }
.guide-enter-active, .guide-leave-active { transition: opacity .5s, transform .5s; }
.guide-enter-from, .guide-leave-to { opacity: 0; transform: translateY(5px); }

.crate { margin: 12px 0 0; text-align: center; color: var(--wood); font-size: var(--fs-base); }
.crate svg { width: 150px; }
.crate path { fill: none; stroke: var(--wood); stroke-width: 2.2; stroke-linecap: round; opacity: .75;
  animation: strokeIn 1.1s ease-out backwards; }

/* 存档是纸角上单独的一枚签，不跟落墨的叶子挤在一格里 */
.arc-fab { display: flex; width: fit-content; align-items: center; gap: 5px;
  margin: 0 2px 3px auto;
  color: var(--wood); background: var(--card); padding: 4px 11px 5px; border-radius: var(--r-c);
  font-size: var(--fs-sm); font-weight: 600;
  border: 1.2px dashed rgba(139, 107, 74, .5);
  transform: rotate(-.8deg); animation: fadeUp .5s ease-out backwards; transition: transform .5s, color .4s; }
.arc-fab:hover { transform: rotate(.5deg) translateY(-2px); color: var(--grass-deep); }

.tip-bar { position: fixed; top: 16px; left: 50%; z-index: 60; color: var(--wood); background: var(--card);
  transform: translateX(-50%) rotate(-.8deg); text-align: center; letter-spacing: .12em; font-size: var(--fs-base);
  padding: 8px 22px 9px; border-radius: var(--r-c); border: 1.4px dashed rgba(139, 107, 74, .45);
  animation: tipDown .5s ease-out; }
.grow { position: fixed; inset: 0; pointer-events: none; z-index: 55; color: var(--grass-deep); }
.grow :deep(.gl) { position: absolute; opacity: .55; }
.g1 { top: 4%; left: 2%; } .g2 { top: 6%; right: 3%; transform: rotate(24deg); }
.g3 { bottom: 5%; left: 4%; transform: rotate(-18deg); } .g4 { bottom: 4%; right: 2%; transform: rotate(150deg); }

/* 封存之后：水停了，藤枯了 */
.sealed :deep(.river) { stroke: var(--dry); }
.sealed .wash { opacity: .08; }

.m-h { display: flex; align-items: center; gap: 7px; font-size: var(--fs-base); color: var(--wood); margin-bottom: 10px; }
.modal .m-h { font-size: var(--fs-head); }
/* 编辑这页横向铺开，纸的高度定住：字多了只在字框里滚，底下的字数和照片都钉在原处 */
.edit-modal { width: min(720px, 94vw); height: 82vh; max-height: 760px; overflow: hidden; display: flex; flex-direction: column; }
.edit-body { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
.edit-body > .m-h, .edit-body > .f-item { flex: none; }
.edit-body > .edit-well { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
.edit-well textarea { flex: 1 1 auto; min-height: 58px; overflow-y: auto;
  scrollbar-width: thin; scrollbar-color: rgba(139, 107, 74, .34) transparent; }
.edit-well textarea::-webkit-scrollbar { width: 6px; }
.edit-well textarea::-webkit-scrollbar-thumb { border-radius: 4px; background: rgba(139, 107, 74, .34); }
.edit-well textarea::-webkit-scrollbar-track { background: transparent; }
.edit-count { flex: none; }
.modal.edit-modal :deep(.compass) { max-width: min(230px, 26vh); margin: 0 auto 8px; }
.modal.edit-modal :deep(.tick) { font-size: calc(var(--fs-read) - 5px); }
/* 屏幕矮的时候纸铺高一点、钟面收一点，字框才留得下几行 */
@media (max-height: 820px) {
  .edit-modal { height: 88vh; }
  .modal.edit-modal :deep(.compass) { max-width: 180px; }
  .edit-modal .m-h { margin-bottom: 6px; }
}
/* 手印留在纸脚，不跟着字一起滚走 */
.edit-modal .m-acts { flex: none; margin-top: 12px; padding: 10px 0 2px; background: var(--paper); }
/* 地层可以往下滚，标题钉在土面上 */
.w-right > .m-h { position: sticky; top: 0; z-index: 3; margin-bottom: 4px; padding: 3px 0 8px;
  background: var(--paper); }

/* 存档和封层都把纸摊大些，字和手印才不挤在一处 */
.arc-modal { width: min(660px, 94vw); }
.arc-modal textarea { min-height: 104px; }
.arc-modal .m-h, .place-modal .m-h { font-size: var(--fs-title); }
/* 封层这张纸：三条路横着排，挑一条就把地封了 */
.place-modal { width: min(760px, 94vw); padding: 28px 32px 24px; }
.place-modal > .m-acts { margin-top: 16px; }
/* 三张土路横着摆：大记号在左，字在右，上头占的地方少了，树枝才露得出来 */
.place-modal .way { display: grid; grid-template-columns: auto minmax(0, 1fr); grid-template-rows: auto auto;
  column-gap: 12px; row-gap: 2px; align-items: center; text-align: left; padding: 14px 14px 13px; }
.place-modal .way > .gl { grid-row: 1 / span 2; }
.place-modal .way b { grid-column: 2; }
.place-modal .way span { grid-column: 2; text-align: left; }

/* 封存后选在哪儿长：两条土路，挑一条走 */
.place-q { color: var(--ink-soft); margin-bottom: 14px; }
.place-ways { display: flex; gap: 10px; }
.way { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 14px 7px 13px;
  color: var(--wood); border-radius: var(--r-a); box-shadow: inset 0 0 0 1.3px rgba(150, 133, 100, .35);
  transition: background .35s, box-shadow .35s, transform .4s; }
.way b { font-weight: normal; font-size: var(--fs-base); color: var(--ink); }
.way span { font-size: var(--fs-sm); color: var(--ink-faint); text-align: center; line-height: 1.5; }
.way:hover:not(:disabled), .way.on { background: rgba(139, 107, 74, .07); transform: translateY(-2px);
  box-shadow: inset 0 0 0 1.4px rgba(139, 107, 74, .55); }
.way:disabled { opacity: .45; cursor: default; }

@media (max-width: 1220px) {
  .w-grid, .w-grid.no-layer { grid-template-columns: 1fr; grid-auto-rows: max-content; align-content: start;
    gap: 20px; overflow-y: auto; scrollbar-width: none; }
  .w-grid.reading { grid-template-columns: 1fr; }
  .w-grid.reading .w-left { display: none; }
  .w-main.reading { min-height: 250px; }
  .w-grid::-webkit-scrollbar { display: none; }
  .w-left, .w-right { min-height: 0; overflow: visible; }
  .wash { position: static; width: 100%; height: 120px; margin-bottom: -30px; }
  .stream-wrap { flex: none; }
  .stream { flex: 1; min-width: 0; min-height: 0; overflow: visible; padding-left: 34px; }
  .mouth { margin-left: 4px; }
}

@media (max-width: 720px) {
  .work { padding-left: 60px; }
}

/* 手机：河道收细，顶栏只留必要的，没键盘就不提 Ctrl + Enter */
@media (max-width: 620px) {
  .w-top { gap: 9px; padding: 9px 13px 8px; }
  .w-name { font-size: 23px; gap: 7px; }
  .w-meta, .hint { display: none; }
  .place-ways { flex-direction: column; }
  .way { flex-direction: row; gap: 9px; padding: 10px 12px; text-align: left; }
  .way span { text-align: left; }
  .seal { padding: 4px 10px 5px; font-size: var(--fs-md); }
  .w-q { padding: 8px 16px 0; font-size: var(--fs-base); }
  .well-bar { gap: 4px; }
  .well-fence :deep(.fence-note) { display: none; }
  .well-fence :deep(.fence-svg) { width: 46px; height: 26px; }
  .w-grid { padding: 8px 10px 14px; gap: 16px; }
  .stream { padding-left: 20px; }
  .mouth { margin-left: 0; }
  .modal { padding: 20px 18px 18px; }
}
</style>
