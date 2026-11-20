<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api';
import { DIMS, dimOf, HOOKS } from '../constants/dimensions';
import { glyphOf } from '../icons';
import { toast } from '../utils/toast';
import { ask } from '../utils/ask';
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
import Glyph from '../components/Glyph.vue';

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
const showPen = ref(false);
// 封存时问一句：这块地，挂在树上还是种在地上
const placing = ref(false);
const treeOpen = ref(false);
const TREE_CAP = 40;
const treeFull = computed(() =>
  field.sessions.filter(s => s.placement === 'tree' || !s.placement).length >= TREE_CAP);
// 从上往下六根枝，左右两边都能落脚；分支号跟 SoulTree 共用：r*2 + (右?1:0)
const BRANCHES = [
  { r: 0, name: '底枝' }, { r: 1, name: '低枝' }, { r: 2, name: '腰枝' },
  { r: 3, name: '肩枝' }, { r: 4, name: '高枝' }, { r: 5, name: '梢枝' }
];
const SIDES = [-1, 1];
const branchCode = (r, side) => r * 2 + (side > 0 ? 1 : 0);
const branchCount = code => field.sessions.filter(s =>
  (s.placement === 'tree' || !s.placement) && s.branch === code).length;
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
// 鼠标在墨池上最后停的那个横坐标；键盘落墨没有鼠标，也拿它当笔尖
const nib = ref(0);
const at = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
// 没有鼠标的时候（Ctrl+Enter），把光标所在的横坐标量出来
function caretX(el) {
  const cs = getComputedStyle(el), box = el.getBoundingClientRect();
  const ghost = document.createElement('div');
  ghost.style.cssText = `position:fixed;left:${box.left}px;top:${box.top}px;width:${box.width}px;visibility:hidden;white-space:pre-wrap;word-break:break-word;font:${cs.font};letter-spacing:${cs.letterSpacing};line-height:${cs.lineHeight};padding:${cs.padding}`;
  ghost.textContent = el.value.slice(0, el.selectionStart ?? 0);
  const mark = document.createElement('i');
  mark.textContent = '.';
  ghost.appendChild(mark);
  document.body.appendChild(ghost);
  const x = box.left + mark.offsetLeft;
  ghost.remove();
  return x;
}
// 横着跟鼠标或光标走，竖着钉在输入框的底边上，不许飘到别处去
const mouth = e => {
  const r = ink.value.getBoundingClientRect();
  const x = e?.clientX > 0 ? e.clientX : caretX(ink.value) || nib.value || r.left + r.width / 2;
  return { x, y: r.bottom + 1 };
};

const finished = computed(() => session.value?.status === 'finished');
const maxML = computed(() => milestones.value.reduce((a, m) => Math.max(a, m.level), 0));
const showArchiveBtn = computed(() => !finished.value && session.value && session.value.level > maxML.value);
const counts = computed(() => {
  const c = Object.fromEntries(DIMS.map(d => [d.key, 0]));
  thoughts.value.forEach(t => { c[t.dimension]++; });
  return c;
});
const leastDim = computed(() => DIMS.slice().sort((a, b) => counts.value[a.key] - counts.value[b.key])[0]);
const leastHint = computed(() => {
  const n = counts.value[leastDim.value.key];
  return n === 0
    ? `你还没从【${leastDim.value.key}】的角度看过这件事。`
    : `【${leastDim.value.key}】这个角度你只碰过 ${n} 次，要不要再去挖挖？`;
});

onMounted(async () => {
  user.load();
  const d = await api.session(id);
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
const cards = new Map();
const bind = (id, el) => (el ? cards.set(id, el.$el ?? el) : cards.delete(id));
const river = ref('');
const twigs = ref([]);
const riverH = ref('100%');

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
  draft.value = '';
  sow(content);
}

async function sow(content) {
  const d = await api.addThought(id, { dimension: dim.value, content });
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
  if ([...arcNote.value].length > BODY_MAX) return toast('这一句太长了');
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
  if (sure) {
    treeOpen.value = false;
    placing.value = true;
  }
}
// 选好长在哪儿，这一把叶子才从封存按钮上被风带走
async function seal(where, branch = null) {
  placing.value = false;
  treeOpen.value = false;
  gust.value = at(sealBtn.value);
  const d = await api.finish(id, { placement: where, branch });
  session.value.status = 'finished';
  session.value.placement = d.placement;
  session.value.branch = d.branch;
  field.patch(id, { status: 'finished', placement: d.placement, branch: d.branch });
  toast(where === 'wind' ? '交给风了' : '这块地封存了');
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

async function saveEdit() {
  if ([...edit.value.content].length > BODY_MAX) return toast('这一层装不下了，再落一层');
  await api.updThought(edit.value.id, { dimension: edit.value.dimension, content: edit.value.content });
  const i = thoughts.value.findIndex(t => t.id === edit.value.id);
  thoughts.value[i] = { ...thoughts.value[i], dimension: edit.value.dimension, content: edit.value.content };
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
  hook.value = HOOKS[Math.floor(Math.random() * HOOKS.length)];
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
    <div v-if="tip" class="tip-bar">{{ tip }}</div>

    <header class="w-top">
      <button class="back" title="回原野" @click="router.push('/')"><Glyph name="left" :size="20"/></button>
      <div class="w-name">
        <Glyph :name="glyphOf({ name: session.topic_name })" :size="17"/>
        <span class="w-topic">{{ session.topic_name }}</span>
        <b>{{ session.title }}</b>
      </div>
      <div class="w-meta">第 {{ session.level }} 层 · {{ session.thought_count }} 滴</div>
      <button class="penbtn" title="笔风" @click="showPen = true"><Glyph name="pen" :size="17"/></button>
      <router-link v-if="finished" class="btn-ghost" :to="'/review/' + id">回看这块地</router-link>
      <button v-else ref="sealBtn" class="seal" @click="finish"><Glyph name="archive" :size="16"/> 结束思考</button>
    </header>
    <p v-if="session.question" class="w-q">“{{ session.question }}”</p>

    <main class="w-grid">
      <aside class="w-left roll">
        <i class="wash" :key="dim"/>
        <DimensionPicker v-model="dim" :disabled="finished" :center="counts[dim] + ' 滴'"/>
        <div class="view-card edge">
          <div class="vc-h">换个视角看看</div>
          <p>{{ leastHint }}</p>
        </div>
        <button class="hook-btn" :disabled="finished" @click="rollHook"><Glyph name="again" :size="16"/> 抽个引子</button>
        <p v-if="hook" class="hook">{{ hook }}</p>

        <!-- 礼长在撒种这口井的左边，就在引子底下，不抢河面的地方 -->
        <RewardBloom v-if="gift" :stage="gift" @done="giftDone"/>
      </aside>

      <section class="w-main">
        <div ref="stream" class="stream roll">
          <VineFlow :river="river" :twigs="twigs" :style="{ height: riverH }"/>
          <i v-if="thoughts.length" class="pebble"/>
          <div v-if="!thoughts.length" class="w-empty">这条河还空着。先落第一滴，哪怕是句废话。</div>

          <ThoughtCard v-for="(t, i) in thoughts" :key="t.id" :t="t" :i="i" :frozen="finished" :ref="el => bind(t.id, el)"
            @edit="!finished && (edit = { ...t })" @del="del"/>
        </div>

        <div class="mouth">
          <form v-if="!finished" class="well" @submit.prevent @mousemove="nib = $event.clientX">
            <textarea ref="ink" v-model="draft" rows="2" placeholder="把种子撒在这里……"
              @focus="typing = true" @blur="typing = false" @keydown.ctrl.enter.prevent="plant($event)"/>
            <svg class="well-rule" :class="{ live: typing || draft }" viewBox="0 0 600 7" preserveAspectRatio="none" aria-hidden="true">
              <path class="base" d="M2 3.5 C 100 2.1, 200 4.7, 300 3.3 C 400 1.9, 500 4.3, 598 2.9"/>
              <path class="ink" pathLength="1" d="M2 3.5 C 100 2.1, 200 4.7, 300 3.3 C 400 1.9, 500 4.3, 598 2.9"/>
            </svg>
            <div class="well-bar">
              <span class="chip"><Glyph :name="dimOf(dim).glyph" :size="15"/> {{ dim }}</span>
              <span class="hint" :class="{ over: draftLen > BODY_MAX }">
                {{ draftLen > BODY_MAX ? '这一层装不下了，再落一层' : 'Ctrl + Enter 落墨' }}
              </span>
              <span class="count" :class="{ over: draftLen > BODY_MAX }">{{ draftLen }} / {{ BODY_MAX }}</span>
              <FenceToggle class="well-fence" :open="vis === 'public'" @toggle="toggleFence"/>
              <button ref="drop" class="drop" type="button" :disabled="!draft.trim()" title="落下去" @click="plant($event)"><Glyph name="leaf" :size="24" draw/></button>
            </div>
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
              <button class="fg-x" title="知道了" @click="closeGuide(false)"><Glyph name="close" :size="12"/></button>
            </div>
          </Transition>
        </div>
      </section>

      <aside class="w-right roll">
        <div class="m-h"><Glyph name="scroll" :size="17"/> 压住的地层</div>
        <MilestoneTimeline :items="milestones" :delable="!finished" @del="delMile"/>
      </aside>
    </main>

    <button v-if="showArchiveBtn" class="arc-fab" @click="showArc = true"><Glyph name="scroll" :size="18"/> 存个档</button>

    <div v-if="grow" class="grow">
      <Glyph class="g1" name="sprout" :size="46" draw/>
      <Glyph class="g2" name="leaf" :size="40" draw/>
      <Glyph class="g3" name="leaf" :size="44" draw/>
      <Glyph class="g4" name="leaf" :size="38" draw/>
    </div>

    <div v-if="showArc" class="mask" @click.self="showArc = false">
      <div class="modal">
        <h3 class="m-h"><Glyph name="scroll" :size="20"/> 在 第 {{ session.level }} 层 压一道地层</h3>
        <div class="f-item">
          <label>标题（留空就叫「第 {{ session.level }} 层」）</label>
          <input v-model="arcTitle" maxlength="10" placeholder="十个字以内"/>
        </div>
        <div class="f-item">
          <label>说一句给未来的自己（可空）</label>
          <textarea v-model="arcNote" rows="2" maxlength="500"/>
        </div>
        <div class="m-acts">
          <button class="btn-ghost" @click="showArc = false">算了</button>
          <button class="btn" @click="archive">压上去</button>
        </div>
      </div>
    </div>

    <div v-if="placing" class="mask" @click.self="placing = false">
      <div class="modal place-modal">
        <h3 class="m-h"><Glyph name="sprout" :size="20"/> 「{{ session.title }}」封好了</h3>
        <p class="place-q">想让它长在哪儿？</p>
        <div class="place-ways">
          <button class="way" :class="{ on: treeOpen }" :disabled="treeFull" @click="treeOpen = !treeOpen">
            <Glyph name="pine" :size="36"/>
            <b>挂在树上</b>
            <span>{{ treeFull ? '树上挂满了，换个地方吧' : '挑一根枝，从那儿长出去' }}</span>
          </button>
          <button class="way" @click="seal('ground')">
            <Glyph name="sprout" :size="36"/>
            <b>种在地上</b>
            <span>落地变成落叶、花瓣或小虫</span>
          </button>
          <button class="way" @click="seal('wind')">
            <Glyph name="fly" :size="36"/>
            <b>交给风</b>
            <span>不挂也不种，飘到哪儿算哪儿</span>
          </button>
        </div>
        <div v-if="treeOpen" class="branch-pick">
          <p class="branch-h"><Glyph name="leaf" :size="14"/> 挑一根枝，叶子就顺着它长</p>
          <div class="branch-rows">
            <div v-for="b in BRANCHES" :key="b.r" class="branch-row">
              <span class="branch-name">{{ b.name }}</span>
              <button v-for="side in SIDES" :key="side" class="branch-way"
                @click="seal('tree', branchCode(b.r, side))">
                <Glyph name="leaf" :size="15" :style="{ transform: side > 0 ? 'scaleX(-1)' : 'none' }"/>
                {{ side < 0 ? '左' : '右' }}
                <i>{{ branchCount(branchCode(b.r, side)) }}</i>
              </button>
            </div>
          </div>
        </div>
        <div class="m-acts"><button class="btn-ghost" @click="placing = false">先不封了</button></div>
      </div>
    </div>

    <div v-if="edit" class="mask" @click.self="edit = null">
      <div class="modal">
        <h3 class="m-h"><Glyph name="pen" :size="20"/> 修一修这一滴</h3>
        <div class="f-item"><DimensionPicker v-model="edit.dimension"/></div>
        <div class="f-item">
          <textarea v-model="edit.content" rows="4"/>
          <p class="edit-count" :class="{ over: [...edit.content].length > BODY_MAX }">
            {{ [...edit.content].length }} / {{ BODY_MAX }}
            <span v-if="[...edit.content].length > BODY_MAX">这一层装不下了，再落一层</span>
          </p>
        </div>
        <div class="m-acts">
          <button class="btn-ghost" @click="edit = null">不改了</button>
          <button class="btn" @click="saveEdit">改好了</button>
        </div>
      </div>
    </div>

    <Toss v-if="gust" :x="gust.x" :y="gust.y" @done="gust = null"/>
    <PenPanel v-if="showPen" @close="showPen = false"/>
  </div>
  <div v-else class="loading">土还在翻</div>
</template>

<style scoped>
/* 一整屏就是这一块地：顶上题头，中间三栏各自滚，页面本身不动 */
.work { position: relative; height: 100vh; height: 100dvh; display: flex; flex-direction: column; overflow: hidden; }

.w-top {
  flex: none; display: flex; align-items: center; gap: 13px; padding: 10px 26px 9px;
  position: relative; z-index: 20; background: rgba(250, 246, 236, .9);
}
.w-top::after { content: ''; position: absolute; left: 3%; right: 3%; bottom: 0; height: 1.4px;
  background: repeating-linear-gradient(90deg, rgba(150, 133, 100, .5) 0 9px, transparent 9px 15px); }
.back { color: var(--ink-soft); transition: transform .4s, color .4s; }
.back:hover { color: var(--wood); transform: translateX(-3px); }
.w-name { display: flex; align-items: center; gap: 8px; font-size: 15px; flex: 1; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.w-topic { color: var(--wood); }
.w-name b { font-weight: normal; letter-spacing: .04em; }
.w-meta { font-size: 13px; color: var(--ink-faint); }
.seal { display: inline-flex; align-items: center; gap: 6px; color: var(--wood); font-size: 13.5px;
  padding: 5px 14px 6px; border-radius: var(--r-c); box-shadow: inset 0 0 0 1.2px rgba(139, 107, 74, .4); transition: .4s; }
.seal:hover { background: rgba(139, 107, 74, .1); }
.w-q { flex: none; text-align: center; color: var(--wood); padding: 8px 22px 0; font-size: 14.5px; }

.w-grid { flex: 1; min-height: 0; display: grid; grid-template-columns: 320px minmax(0, 1fr) 258px; gap: 22px;
  padding: 10px 26px 16px; width: min(1240px, 100%); margin: 0 auto; }

/* 左：视角罗盘 */
.w-left { position: relative; min-height: 0; display: flex; flex-direction: column; gap: 13px; isolation: isolate; }
.wash { position: absolute; left: -18%; top: -6%; width: 136%; height: 62%; pointer-events: none; z-index: -1;
  background: radial-gradient(60% 50% at 40% 40%, var(--c), transparent 72%); opacity: .13; filter: url(#ink-blot);
  animation: washIn 1.5s cubic-bezier(.2, .8, .3, 1) backwards; }
@keyframes washIn { from { opacity: 0; transform: scale(.7) rotate(-4deg); } to { opacity: .13; transform: none; } }
.view-card { padding: 11px 14px 12px; font-size: 13px; color: var(--ink-soft); border-radius: var(--r-b); }
.vc-h { color: var(--wood); margin-bottom: 3px; letter-spacing: .06em; }
.hook-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; font-size: 13.5px;
  color: var(--ink-soft); letter-spacing: .05em; padding: 4px 0 7px;
  border-bottom: 1.2px dashed rgba(150, 133, 100, .5); transition: .4s; }
.hook-btn:hover:not(:disabled) { color: var(--wood); border-bottom-color: rgba(139, 107, 74, .75); }
.hook-btn:disabled { opacity: .45; }
.hook { font-size: 13px; color: var(--ink-soft); background: rgba(230, 216, 186, .35); padding: 9px 12px 10px;
  border-radius: var(--r-a); animation: inkIn .6s ease-out backwards; }

/* 中：思绪长河。河自己在框里滚，笔一直贴在底下 */
.w-main { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.stream { position: relative; flex: 1; min-height: 0; padding-left: 46px; }
.pebble { position: absolute; left: 12px; top: -6px; width: 20px; height: 20px; border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, var(--graphite), rgba(90, 83, 64, .35) 70%, transparent); opacity: .5; }
.pebble::after, .pebble::before { content: ''; position: absolute; left: 50%; top: 50%; width: 46px; height: 22px;
  margin: -11px -23px; border: 1.2px solid rgba(126, 159, 174, .5); border-radius: 50%;
  animation: ripple 2.8s ease-out infinite; }
.pebble::after { animation-delay: 1.1s; }
.w-empty { text-align: center; color: var(--ink-faint); padding: 46px 0 24px; letter-spacing: .1em; }

/* 下种的笔：就是一支笔、一道虚线、一枚叶子，别的什么都不加 */
.mouth { position: relative; flex: none; margin-left: 46px; }
.well { margin: 4px 0 0; padding-bottom: 6px; }
.well textarea { border: none; padding: 6px 2px; font-size: 16px; line-height: 1.9; background: transparent;
  resize: none; overflow: hidden; }
.well textarea::placeholder { font-style: italic; color: #B0A898; }
/* 一落笔，纸边就抽出一道活墨；不写字的时候它只是一条很淡的田埂 */
.well-rule { display: block; width: 100%; height: 7px; overflow: visible; margin-top: -1px; }
.well-rule path { fill: none; stroke-linecap: round; vector-effect: non-scaling-stroke; }
.well-rule .base { stroke: rgba(150, 133, 100, .34); stroke-width: 1.2; }
.well-rule .ink { stroke: var(--grass-deep); stroke-width: 1.5; opacity: .55; stroke-dasharray: 1;
  stroke-dashoffset: 1; transition: stroke-dashoffset .7s cubic-bezier(.2, .8, .25, 1), opacity .4s; }
.well-rule.live .ink { stroke-dashoffset: 0; opacity: .8; }
.penbtn { color: var(--ink-faint); line-height: 0; padding: 3px 5px; transition: color .35s, transform .35s; }
.penbtn:hover { color: var(--wood); transform: rotate(-6deg); }
.well-bar { display: flex; align-items: center; gap: 12px; margin-top: 2px; }
.chip { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; color: var(--ink-soft); }
.hint { font-size: 12px; color: var(--ink-faint); flex: 1; transition: color .3s; }
.hint.over, .count.over { color: var(--clay); }
.count { font-size: 11px; color: var(--ink-faint); letter-spacing: .04em; transition: color .3s; }
.edit-count { margin-top: 5px; font-size: 11px; color: var(--ink-faint); text-align: right; letter-spacing: .04em; }
.edit-count span { margin-right: 8px; color: var(--clay); }
.well-fence { margin-left: 2px; }
.well-fence :deep(.fence-svg) { width: 54px; height: 30px; }
.well-fence :deep(.fence-note) { font-size: 11.5px; letter-spacing: 1px; }
.fence-whisper { font-size: 11.5px; color: var(--ink-faint); letter-spacing: .06em; padding: 1px 0 0 2px; }
.say-enter-active, .say-leave-active { transition: opacity .4s, transform .4s; }
.say-enter-from, .say-leave-to { opacity: 0; transform: translateY(3px); }
.drop { color: var(--grass-deep); line-height: 0; padding: 2px 6px; transition: transform .5s cubic-bezier(.3, .9, .3, 1.2); }
.drop:hover:not(:disabled) { transform: translateY(3px) rotate(-8deg); }
.drop:disabled { color: var(--ink-faint); opacity: .4; }

/* 第一次收礼之后那一句：像谁在旁边小声提了一嘴，不是弹窗 */
.fence-guide { display: flex; align-items: center; gap: 6px; padding: 2px 2px 0; }
.fg-text { font-size: 12px; color: var(--ink-faint); letter-spacing: .04em; text-align: left; }
.fg-text u { color: var(--wood); text-decoration: underline; text-decoration-style: wavy;
  text-decoration-thickness: 1px; text-underline-offset: 3px; }
.fg-text:hover { color: var(--ink-soft); }
.fg-x { color: var(--ink-faint); line-height: 0; padding: 2px; }
.fg-x:hover { color: var(--clay); }
.guide-enter-active, .guide-leave-active { transition: opacity .5s, transform .5s; }
.guide-enter-from, .guide-leave-to { opacity: 0; transform: translateY(5px); }

.crate { margin: 12px 0 0; text-align: center; color: var(--wood); font-size: 13.5px; }
.crate svg { width: 150px; }
.crate path { fill: none; stroke: var(--wood); stroke-width: 2.2; stroke-linecap: round; opacity: .75;
  animation: strokeIn 1.1s ease-out backwards; }

.arc-fab { position: fixed; right: 28px; bottom: 28px; z-index: 25; display: inline-flex; align-items: center; gap: 8px;
  color: var(--wood); background: var(--card); padding: 9px 18px 10px; border-radius: var(--r-c);
  border: 1.4px dashed rgba(139, 107, 74, .45);
  transform: rotate(-1.2deg); animation: fadeUp .5s ease-out backwards; transition: transform .5s, color .4s; }
.arc-fab:hover { transform: rotate(.6deg) translateY(-3px); color: var(--grass-deep); }

.tip-bar { position: fixed; top: 16px; left: 50%; z-index: 60; color: var(--wood); background: var(--card);
  transform: translateX(-50%) rotate(-.8deg); text-align: center; letter-spacing: .12em; font-size: 14px;
  padding: 8px 22px 9px; border-radius: var(--r-c); border: 1.4px dashed rgba(139, 107, 74, .45);
  animation: tipDown .5s ease-out; }
.grow { position: fixed; inset: 0; pointer-events: none; z-index: 55; color: var(--grass-deep); }
.grow :deep(.gl) { position: absolute; opacity: .55; }
.g1 { top: 4%; left: 2%; } .g2 { top: 6%; right: 3%; transform: rotate(24deg); }
.g3 { bottom: 5%; left: 4%; transform: rotate(-18deg); } .g4 { bottom: 4%; right: 2%; transform: rotate(150deg); }

/* 封存之后：水停了，藤枯了 */
.sealed :deep(.river) { stroke: var(--dry); }
.sealed .wash { opacity: .08; }

.m-h { display: flex; align-items: center; gap: 7px; font-size: 14px; color: var(--wood); margin-bottom: 10px; }
/* 地层可以往下滚，标题钉在土面上 */
.w-right > .m-h { position: sticky; top: 0; z-index: 3; margin-bottom: 4px; padding: 3px 0 8px;
  background: var(--paper); }

/* 封存后选在哪儿长：两条土路，挑一条走 */
.place-q { color: var(--ink-soft); margin-bottom: 14px; }
.place-ways { display: flex; gap: 10px; }
.way { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 14px 7px 13px;
  color: var(--wood); border-radius: var(--r-a); box-shadow: inset 0 0 0 1.3px rgba(150, 133, 100, .35);
  transition: background .35s, box-shadow .35s, transform .4s; }
.way b { font-weight: normal; font-size: 15px; color: var(--ink); }
.way span { font-size: 12px; color: var(--ink-faint); text-align: center; line-height: 1.5; }
.way:hover:not(:disabled), .way.on { background: rgba(139, 107, 74, .07); transform: translateY(-2px);
  box-shadow: inset 0 0 0 1.4px rgba(139, 107, 74, .55); }
.way:disabled { opacity: .45; cursor: default; }

/* 挑枝：六层枝，左右各一枚叶，几块地已经落在那儿也顺带写着 */
.branch-pick { margin-top: 16px; padding-top: 12px; border-top: 1.2px dashed rgba(150, 133, 100, .38); }
.branch-h { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ink-soft);
  letter-spacing: .06em; margin-bottom: 7px; }
.branch-rows { display: flex; flex-direction: column; gap: 5px; }
.branch-row { display: flex; align-items: center; gap: 8px; }
.branch-name { flex: none; width: 34px; font-size: 12px; color: var(--ink-faint); letter-spacing: .08em; }
.branch-way { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 4px;
  font-size: 12.5px; color: var(--ink-soft); padding: 2px 8px 3px; border-radius: var(--r-c);
  transition: color .3s, background .3s, transform .3s; }
.branch-way:hover { color: var(--grass-deep); background: rgba(79, 107, 58, .09); transform: translateY(-1px); }
.branch-way i { font-style: normal; font-size: 11px; color: var(--ink-faint); }

@media (max-width: 940px) {
  .w-grid { grid-template-columns: 1fr; gap: 20px; overflow-y: auto; scrollbar-width: none; }
  .w-grid::-webkit-scrollbar { display: none; }
  .w-left, .w-right { min-height: 0; overflow: visible; }
  .wash { position: static; width: 100%; height: 120px; margin-bottom: -30px; }
  .stream { flex: none; min-height: 40vh; overflow: visible; padding-left: 34px; }
  .mouth { margin-left: 34px; }
}

/* 手机：河道收细，顶栏只留必要的，没键盘就不提 Ctrl + Enter */
@media (max-width: 620px) {
  .w-top { gap: 9px; padding: 9px 13px 8px; }
  .w-meta, .hint { display: none; }
  .place-ways { flex-direction: column; }
  .way { flex-direction: row; gap: 9px; padding: 10px 12px; text-align: left; }
  .way span { text-align: left; }
  .seal { padding: 4px 10px 5px; font-size: 12.5px; }
  .w-q { padding: 8px 16px 0; font-size: 13.5px; }
  .w-grid { padding: 8px 14px 14px; gap: 16px; }
  .stream { padding-left: 26px; }
  .mouth { margin-left: 26px; }
  .modal { padding: 20px 18px 18px; }
  .arc-fab { right: 14px; bottom: 14px; padding: 7px 13px 8px; }
}
</style>
