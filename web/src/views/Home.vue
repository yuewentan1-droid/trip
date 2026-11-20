<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api';
import { useUser } from '../store/user';
import { useField } from '../store/field';
import { useNotice } from '../store/notice';
import { toast } from '../utils/toast';
import { SEED_CHOICES, ZONE_GLYPH, glyphOf } from '../icons';
import { ask } from '../utils/ask';
import CloudLayer from '../components/CloudLayer.vue';
import WheatField from '../components/WheatField.vue';
import SoulTree from '../components/SoulTree.vue';
import VisitGate from '../components/VisitGate.vue';
import Drift from '../components/Drift.vue';
import Toss from '../components/Toss.vue';
import PenPanel from '../components/PenPanel.vue';
import InboxFence from '../components/InboxFence.vue';
import ProfileFence from '../components/ProfileFence.vue';
import Glyph from '../components/Glyph.vue';

const router = useRouter();
const user = useUser();
const field = useField();
const notice = useNotice();
field.refresh();

const inboxOpen = ref(false);
const inboxTab = ref('notes');
const inboxScope = ref('in');
const profileOpen = ref(false);
const openInbox = (tab, scope = 'in') => {
  inboxTab.value = tab;
  inboxScope.value = scope;
  inboxOpen.value = true;
};

// 树开到花期，原野上才许落花；没开花就飘花瓣是假景
const blooming = computed(() => field.sessions.length >= 16 || field.words > 3000);

// 四个气候区收拢成四团，挤在中心那棵树的四角；tag 贴在各自聚落的边缘上方
// 四团收拢在树的左右两侧，标签退到最外头，谁也不压着谁
const ZONES = [
  { key: '学科', tag: '学科 · 往天上蔓延', tx: 20, ty: 3, anchor: [33, 31] },
  { key: '行业', tag: '行当 · 一层压一层', tx: 4.5, ty: 62, anchor: [31, 71] },
  { key: '人群', tag: '人物 · 草地上路过', tx: 73, ty: 3, anchor: [75, 33] },
  { key: '幻想', tag: '幻境 · 水里的倒影', tx: 95.5, ty: 62, anchor: [74, 73] }
];

const hash = s => [...String(s)].reduce((h, c) => (h * 31 + c.codePointAt(0)) >>> 0, 7);
// 哈希是无符号 32 位，取位必须用 >>>，否则一半的数会变负、整块地飞出去。
const seg = (h, s, n) => (h >>> s) % n;

// 系统预置的十六块地：坐标手挑的，同一块地永远长在同一个位置
const SPOTS = {
  哲学: [7.5, 14], 心理学: [33, 7], 经济学: [5, 33], 生物学: [27, 24], 历史学: [14.5, 47],
  互联网: [6.5, 59], 教育: [34, 66], 医疗: [12, 85], 农业: [37, 79],
  学生: [66, 12], 社会人: [86, 10], 老人: [70, 34],
  如果时间可以倒流: [65, 49], 一百年后的城市: [83, 55], 如果动物会说话: [67, 70], 平行世界的我: [84, 66]
};
// 自己撒的种子不排队：每个气候区给一块发散的地界，位置由名字自己推，
// 推出来离邻居太近就换个角度再落一次，落在哪儿就一直在哪儿
const PLOT = { 学科: [8, 36, 8, 46], 行业: [8, 36, 52, 84], 人群: [64, 92, 8, 46], 幻想: [64, 92, 48, 82] };
const FAR = { x: 10.8, y: 8.4 };

function scatter(z, t, taken) {
  const h = hash(t.name);
  const rot = seg(h, 15, 100) / 100 * 5.2 - 2.6;
  const s = .86 + seg(h, 21, 100) / 100 * .24;
  // 手机上化成一行行流式排布时，这几下抖动让它别站成一条直线
  const jx = ((seg(h, 23, 13) - 6) * 1.2).toFixed(1) + 'px';
  const jy = ((seg(h, 27, 9) - 4) * 1.5).toFixed(1) + 'px';
  const ox = ((seg(h, 29, 13) - 6) * 1.1).toFixed(1) + 'px';
  const oy = ((seg(h, 31, 9) - 4) * 1.3).toFixed(1) + 'px';
  const at = SPOTS[t.name];
  if (at) return { x: at[0], y: at[1], rot, s, jx, jy, ox, oy };
  const [x0, x1, y0, y1] = PLOT[z.key];
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  let x = cx, y = cy;
  for (let k = 0; k < 48; k++) {
    const a = ((seg(h, 3, 360) + k * 137.508) * Math.PI) / 180;
    const r = .2 + ((seg(h, 11, 100) + k * 41) % 100) / 100 * .72;
    x = cx + Math.cos(a) * (x1 - x0) / 2 * r;
    y = cy + Math.sin(a) * (y1 - y0) / 2 * r;
    if (taken.every(p => Math.abs(p[0] - x) > FAR.x || Math.abs(p[1] - y) > FAR.y)) break;
  }
  taken.push([x, y]);
  return { x, y, rot, s, jx, jy, ox, oy };
}

const byZone = computed(() => ZONES.map(z => {
  const all = field.topics.filter(t => t.category === z.key);
  const taken = all.filter(t => SPOTS[t.name]).map(t => SPOTS[t.name]);
  return { z, list: all.map(t => ({ t, z, ...scatter(z, t, taken) })) };
}));

const meadow = ref(null);
const hover = ref(null);
const vein = ref('');
const at = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

// 藤蔓用像素坐标画，免得非等比缩放把虚线拉变形
function enter(n) {
  hover.value = n;
  const r = meadow.value.getBoundingClientRect();
  const x1 = n.x / 100 * r.width, y1 = n.y / 100 * r.height;
  const x2 = n.z.anchor[0] / 100 * r.width, y2 = n.z.anchor[1] / 100 * r.height;
  const mx = (x1 + x2) / 2 + (y1 - y2) * .2;
  const my = (y1 + y2) / 2 - (x2 - x1) * .12;
  vein.value = `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`
    + ` M${x1} ${y1} q ${-8 - (y1 - y2) * .06} 6 -14 2 M${x1} ${y1} q 9 7 15 3`;
}
function leave() {
  hover.value = null;
  vein.value = '';
}

// 枝头的叶和花就是一块块地：生长中的回地里接着挖，封存了的去回看
const openPlot = s => router.push(s.status === 'running' ? '/think/' + s.id : '/review/' + s.id);

// 封存时选了「种在地上」的，就在树根下排成一条，像沿着田埂点下去的一行豆
const ground = computed(() => field.sessions.filter(s => s.placement === 'ground'));
// 一条土带收在树根下，地多了才慢慢往两边铺，不一下子横满整个原野
const bedW = computed(() => Math.min(900, 460 + Math.max(0, ground.value.length - 4) * 140));
function groundStyle(s, i) {
  const n = ground.value.length;
  const step = n > 1 ? 84 / (n - 1) : 0;
  const h = hash(s.id + s.title);
  return {
    left: (n > 1 ? 8 + i * step + (h >>> 19) % 18 / 10 - .9 : 50) + '%',
    '--dy': ((h >>> 9) % 7) + 'px',
    '--rot': ((h >>> 7) % 9 - 4) / 3 + 'deg'
  };
}
// 落地的不一定都发芽：叶子、花瓣、小虫、路过的猫狗，都由这块地自己抽
const GROUND_GLYPH = ['leaf', 'blossom', 'sakura', 'daisy', 'tulip', 'rose', 'fly', 'pawprint', 'rabbit', 'bird', 'plant'];
const groundGlyph = s => GROUND_GLYPH[hash('g' + s.id + s.title) % GROUND_GLYPH.length];

// 交给风的那些不排队：各飘各的，方向、高低、快慢都由名字自己定
const WIND_GLYPH = ['leaf', 'blossom', 'sakura', 'daisy', 'fly', 'bird'];
const windy = computed(() => field.sessions.filter(s => s.placement === 'wind').map(s => {
  const h = hash('w' + s.id + s.title);
  const k = h % 3;
  return {
    s,
    glyph: WIND_GLYPH[(h >>> 5) % WIND_GLYPH.length],
    left: 5 + (h >>> 4) % 90,
    top: 7 + (h >>> 13) % 80,
    rot: (h >>> 9) % 70 - 35,
    size: 16 + (h >>> 17) % 12,
    dx: 18 + (h >>> 19) % 42,
    dy: 14 + (h >>> 23) % 36,
    dur: [41, 53, 67][k] + (h >>> 26) % 9,
    delay: -((h >>> 3) % 40)
  };
}));
const windStyle = w => ({
  left: w.left + '%', top: w.top + '%', '--rot': w.rot + 'deg',
  '--dx': w.dx + 'px', '--dy': w.dy + 'px', '--dur': w.dur + 's', '--delay': w.delay + 's'
});

/* ——— 下种 ——— */
const topicFor = ref(null);
const sTitle = ref('');
const sQuestion = ref('');
const diving = ref(false);
// 风从点下去的地方起：一把花和叶子被带走，散完了才翻纸
const gust = ref(null);
const showPen = ref(false);
const leaving = ref(false);
function toVisits() {
  if (leaving.value) return;
  leaving.value = true;
  setTimeout(() => router.push('/visits'), 300);
}

function openStart(t) {
  topicFor.value = t;
  sTitle.value = '';
  sQuestion.value = '';
}
async function start(e) {
  const title = sTitle.value.trim();
  if (!title) return toast('总得给这块地起个名');
  if ([...title].length > 10) return toast('名字最多十个字');
  // 风从指尖底下起；键盘触发的点击没有坐标，就落在按钮自己身上
  const at2 = e?.clientX ? { x: e.clientX, y: e.clientY } : at(e.currentTarget);
  const s = await field.dig({ topic_id: topicFor.value.id, title, question: sQuestion.value });
  topicFor.value = null;
  leave();
  diving.value = true;
  gust.value = { ...at2, go: () => router.push('/think/' + s.id) };
}
function blown() {
  const { go } = gust.value;
  gust.value = null;
  go();
}

/* ——— 撒种（自定义主题）——— */
const newFor = ref('');
const tName = ref('');
const tIcon = ref('');
const tIntro = ref('');
const tImg = ref('');
const picker = ref(null);

// 四团就是四个象限，点哪儿撒种子按象限认，别再按老地势切
function zoneAt(y, x) {
  if (y < 50) return x < 50 ? '学科' : '人群';
  return x < 50 ? '行业' : '幻想';
}
function openSeed(zone, at) {
  newFor.value = zone || zoneAt(at?.y ?? 65, at?.x ?? 47);
  tName.value = tIntro.value = tImg.value = '';
  tIcon.value = ZONE_GLYPH[newFor.value];
}
function onFieldClick(e) {
  const r = e.currentTarget.getBoundingClientRect();
  openSeed(null, { x: (e.clientX - r.left) / r.width * 100, y: (e.clientY - r.top) / r.height * 100 });
}
// 记号排成一小把撒在桌上的样子，不做整齐的图标面板
const pickStyle = g => {
  const h = hash(g);
  return { '--pdx': ((h >>> 3) % 9 - 4) * 1.7 + 'px', '--pdy': ((h >>> 7) % 7 - 3) * 1.6 + 'px', '--prot': ((h >>> 11) % 25 - 12) + 'deg' };
};
// 刚撒下的那颗要指给用户看：滚到它跟前，脚边再洇开两圈水纹
const justSown = ref(null);
async function addTopic() {
  const name = tName.value.trim();
  if (!name) return toast('名字总得起一个');
  if ([...name].length > 10) return toast('名字最多十个字');
  const t = await field.sow({ category: newFor.value, name, icon: tIcon.value, intro: tIntro.value, img: tImg.value });
  newFor.value = '';
  await nextTick();
  meadow.value.querySelector(`[data-id="${t.id}"]`).scrollIntoView({ block: 'center', behavior: 'smooth' });
  justSown.value = t.id;
  setTimeout(() => (justSown.value = null), 3200);
  toast('种子撒下了');
}
// 自己的一张画，压过手绘的记号
async function attach(e) {
  const f = e.target.files[0];
  const data = await new Promise(done => {
    const fr = new FileReader();
    fr.onload = () => done(fr.result);
    fr.readAsDataURL(f);
  });
  tImg.value = (await api.upload(data)).url;
}
async function delTopic(t) {
  const gone = await ask({
    title: '撤掉这块地？',
    body: `「${t.name}」以后长不出新东西了。已经挖过的历史不受影响。`,
    ok: '撤掉', cancel: '再想想'
  });
  if (!gone) return;
  await api.delTopic(t.id);
  field.uproot(t.id);
}
// 从下种的弹窗里撤：先把这一张收起来再问，免得两张纸叠在一处
async function uprootHere() {
  const t = topicFor.value;
  topicFor.value = null;
  await delTopic(t);
}

function quit() {
  user.logout();
  router.push('/login');
}

// 篱笆上有话就飘来一张纸，没话就只让风过去
onMounted(() => notice.load());
</script>

<template>
  <div class="home" :class="{ diving, leaving }">
    <header class="top-nav">
      <div class="logo"><Glyph name="sprout" :size="23"/> 一亩心田</div>
      <nav>
        <button class="nav-link" title="笔风" @click="showPen = true"><Glyph name="pen" :size="17"/> 笔风</button>
        <button class="nav-link" @click="router.push('/mine')"><Glyph name="map" :size="18"/> 我的田地</button>
        <span class="avatar-wrap">
          <button class="avatar" title="改名字、换把钥匙" @click="profileOpen = true">
            {{ (user.user?.nickname || '田')[0] }}
          </button>
          <button v-if="notice.words" class="leaf-msg" :title="`篱笆上有 ${notice.words} 句话`"
            @click="openInbox('notes', notice.messages ? 'in' : 'out')">
            <Glyph name="leaf" :size="18"/>
            <b>{{ notice.words }}</b>
          </button>
          <button v-if="notice.doors" class="door-msg" :title="`门外有 ${notice.doors} 处动静`"
            @click="openInbox('knocks')">
            <Glyph name="bell" :size="12"/>
            <b>{{ notice.doors }}</b>
          </button>
        </span>
        <button class="nav-link quiet" @click="quit">退出</button>
      </nav>
    </header>

    <section class="h-hero">
      <CloudLayer/>
      <h1>今天想琢磨点什么？</h1>
      <p>挑一块地，换个角度往下挖。没人催你，想挖多深挖多深。</p>
    </section>

    <main ref="meadow" class="meadow roll" @click.self="onFieldClick">
      <div v-if="!field.ready" class="loading">土还在翻</div>

      <SoulTree class="tree" :sessions="field.sessions" @open="openPlot"/>
      <Transition name="note">
        <button v-if="notice.drift" class="drift-note"
          @click.stop="openInbox('notes', notice.drift.kind === 'in' ? 'in' : 'out')">
          <span class="paper-in">
            <em><Glyph :name="notice.drift.kind === 'reply' ? 'chat' : notice.drift.kind === 'sent' ? 'pen' : 'leaf'"
              :size="13"/>
              {{ notice.drift.kind === 'in' ? '篱笆上飘来一句'
                : notice.drift.kind === 'reply' ? '篱笆那头回你了' : '你留在篱笆上的话' }}</em>
            <span v-if="notice.drift.kind === 'reply'" class="line">
              <b>{{ notice.drift.nickname }}</b> 在「{{ notice.drift.garden_name }}」回：{{ notice.drift.reply }}
            </span>
            <span v-else-if="notice.drift.kind === 'sent'" class="line">
              <b>{{ notice.drift.garden_name }}</b>：{{ notice.drift.content }}
            </span>
            <span v-else class="line"><b>{{ notice.drift.nickname }}</b>「{{ notice.drift.content }}」</span>
            <span class="more">
              {{ notice.drift.kind === 'in' ? `${notice.messages} 句话 · 点开看看`
                : notice.drift.kind === 'reply' ? '点开看看回音' : '等回音 · 点开看看' }}
            </span>
          </span>
        </button>
      </Transition>
      <div v-if="blooming" class="shed"><Drift/></div>

      <svg class="art strata" viewBox="0 0 100 60" preserveAspectRatio="none">
        <path v-for="i in 5" :key="i" :d="`M2 ${i * 11} C 20 ${i * 11 - 4}, 38 ${i * 11 + 3}, 56 ${i * 11 - 2} C 72 ${i * 11 - 5}, 86 ${i * 11 + 2}, 98 ${i * 11 - 1}`"/>
      </svg>
      <svg class="art water" viewBox="0 0 100 30" preserveAspectRatio="none">
        <path v-for="i in 4" :key="i" :d="`M${4 + i * 3} ${i * 7} C 26 ${i * 7 - 3}, 48 ${i * 7 + 3}, 70 ${i * 7 - 1} C 82 ${i * 7 - 2}, 90 ${i * 7 + 1}, 96 ${i * 7}`"/>
      </svg>

      <svg class="veins">
        <path v-if="vein" :key="hover?.t.id" :d="vein" fill="none"/>
      </svg>

      <template v-for="g in byZone" :key="g.z.key">
        <span class="zone-tag" :style="{ top: g.z.ty + '%', left: g.z.tx + '%' }">
          <Glyph :name="ZONE_GLYPH[g.z.key]" :size="16"/> {{ g.z.tag }}
        </span>

        <button v-for="n in g.list" :key="n.t.id" class="node" :data-id="n.t.id"
          :class="{ on: hover?.t.id === n.t.id, fresh: justSown === n.t.id }"
          :style="{ left: n.x + '%', top: n.y + '%', '--rot': n.rot + 'deg', '--sc': n.s, '--jx': n.jx, '--jy': n.jy, '--ox': n.ox, '--oy': n.oy }"
          @mouseenter="enter(n)" @mouseleave="leave" @click.stop="openStart(n.t)">
          <i v-if="hover?.t.id === n.t.id" class="rip r1"/><i v-if="hover?.t.id === n.t.id" class="rip r2"/>
          <img v-if="n.t.img" class="n-img" :src="n.t.img" alt=""/>
          <Glyph v-else class="n-icon" :name="glyphOf(n.t)" :size="30"/>
          <span class="n-name">{{ n.t.name }}</span>
          <span v-if="n.t.intro" class="n-intro">{{ n.t.intro }}</span>
        </button>
      </template>

      <!-- 种在地上的那些地，沿着树根下排成一条，落地就变成叶子、花瓣或小虫 -->
      <div class="ground-bed" :style="{ '--bed-w': bedW + 'px' }">
        <button v-for="(s, i) in ground" :key="'g' + s.id" class="ground-seed"
          :style="groundStyle(s, i)" @click.stop="openPlot(s)">
          <Glyph :name="groundGlyph(s)" :size="22"/>
          <span>{{ s.title }}</span>
        </button>
      </div>

      <!-- 交给风的那些：没有落点，慢慢飘，风往哪边就偏一点 -->
      <button v-for="w in windy" :key="'w' + w.s.id" class="wind-seed" :style="windStyle(w)"
        :title="w.s.title" @click.stop="openPlot(w.s)">
        <Glyph :name="w.glyph" :size="w.size"/>
        <span>{{ w.s.title }}</span>
      </button>

      <button class="mist" @click.stop="openSeed(null, { x: 48, y: 63 })">
        <Glyph name="flower" :size="20"/>
        <span>这片迷雾还没人开过，<br/>点一下撒颗自己的种子</span>
      </button>

      <WheatField class="h-wheat"/>
    </main>

    <VisitGate @go="toVisits"/>

    <div v-if="topicFor" class="mask" @click.self="topicFor = null">
      <div class="modal">
        <h3 class="m-h"><Glyph :name="glyphOf(topicFor)" :size="22"/> 在「{{ topicFor.name }}」这块地下个种</h3>
        <div class="f-item">
          <label>给这次思考起个题（十个字以内）</label>
          <input v-model="sTitle" maxlength="10" placeholder="比如：我为什么害怕开始"/>
        </div>
        <div class="f-item">
          <label>最想问自己的那句话（可以先空着，五百字以内）</label>
          <textarea v-model="sQuestion" rows="2" maxlength="500"/>
        </div>
        <div class="m-acts">
          <button v-if="topicFor.user_id" class="btn-ghost uproot" @click="uprootHere">
            撤掉这块地
          </button>
          <button class="btn-ghost" @click="topicFor = null">再想想</button>
          <button class="btn" @click="start($event)">开挖</button>
        </div>
      </div>
    </div>

    <div v-if="newFor" class="mask" @click.self="newFor = ''">
      <div class="modal">
        <h3 class="m-h">自己开一块地</h3>
        <div class="f-item">
          <label>长在哪个气候区</label>
          <div class="zone-pick">
            <button v-for="z in ZONES" :key="z.key" :class="{ on: newFor === z.key }" @click="newFor = z.key; tIcon = ZONE_GLYPH[z.key]; tImg = ''">
              <Glyph :name="ZONE_GLYPH[z.key]" :size="16"/> {{ z.key }}
            </button>
          </div>
        </div>
        <div class="f-item">
          <label>叫啥名（十个字以内）</label>
          <input v-model="tName" maxlength="10" placeholder="比如：钓鱼"/>
        </div>
        <div class="f-item">
          <label>挑个记号，或者贴一张自己的画</label>
          <div class="seed-pick">
            <button class="pick up" :class="{ on: !!tImg }" @click="picker.click()">
              <img v-if="tImg" class="thumb" :src="tImg" alt=""/>
              <Glyph v-else name="upload" :size="22"/>
            </button>
            <button v-for="g in SEED_CHOICES" :key="g" class="pick" :class="{ on: !tImg && tIcon === g }" :style="pickStyle(g)"
              @click="tIcon = g; tImg = ''">
              <Glyph :name="g" :size="22"/>
            </button>
          </div>
          <input ref="picker" type="file" accept="image/*" hidden @change="attach"/>
        </div>
        <div class="f-item">
          <label>一句话介绍（可空）</label>
          <input v-model="tIntro" maxlength="200"/>
        </div>
        <div class="m-acts">
          <button class="btn-ghost" @click="newFor = ''">算了</button>
          <button class="btn" @click="addTopic">撒下去</button>
        </div>
      </div>
    </div>

    <Toss v-if="gust" :x="gust.x" :y="gust.y" @done="blown"/>
    <PenPanel v-if="showPen" @close="showPen = false"/>
    <InboxFence :open="inboxOpen" :tab="inboxTab" :scope="inboxScope" @close="inboxOpen = false"/>
    <ProfileFence :open="profileOpen" @close="profileOpen = false"/>
  </div>
</template>

<style scoped>
.home { position: relative; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
.home .top-nav, .home .h-hero { transition: transform .3s, opacity .3s; }
/* 去串门：整页轻轻抬一下，像人抬起头往远处看 */
.home.leaving .top-nav, .home.leaving .h-hero { transform: translateY(-8px); opacity: 0; }
.home.leaving .meadow { transform: translateY(-8px); opacity: 0;
  transition: transform .3s, opacity .3s; }

.nav-link { display: inline-flex; align-items: center; gap: 6px; color: var(--ink-soft); font-size: 14px; transition: color .3s; }
.nav-link:hover { color: var(--wood); }
.nav-link.quiet { font-size: 13px; color: var(--ink-faint); }

.h-hero { position: relative; flex: none; text-align: center; padding: 16px 20px 4px; }
.h-hero h1 { font-size: 29px; font-weight: normal; letter-spacing: .1em; filter: url(#ink-grain); }
.h-hero p { color: var(--ink-soft); margin-top: 2px; font-size: 14.5px; }

/* 一整片原野，地势从树冠到水面。页面不滚，原野自己在框里滚，滚条藏起来 */
.meadow { position: relative; flex: 1; min-height: 0; margin: 0 2vw; cursor: crosshair;
  overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none;
  transition: transform .9s cubic-bezier(.2, .7, .3, 1), opacity .8s .04s; }
.meadow::-webkit-scrollbar { display: none; }
/* 树是这片原野的正主：底下的枝最长，往上越收越窄 */
.tree { position: absolute; left: 50%; top: 47%; width: 30%; max-width: 450px; aspect-ratio: 1;
  height: auto; z-index: 2; transform: translate(-50%, -50%); pointer-events: none; }
/* 落花只罩在树冠那一带：花瓣是从开了花的枝头上掉的，不是从天上掉的 */
.shed { position: absolute; left: 50%; top: 18%; width: 28%; max-width: 430px; height: 38%;
  transform: translateX(-50%); pointer-events: none; }
.shed :deep(.drift) { inset: 0; height: auto; }

/* 篱笆上的话变成一张纸，从田埂那头慢慢飘进来，落了也不停地晃 */
.drift-note { position: absolute; left: 47%; top: 9%; z-index: 9; width: min(248px, 58vw);
  text-align: left; transform: rotate(-1.1deg); }
.paper-in { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; width: 100%;
  padding: 10px 13px 9px; background: var(--card);
  border: 1.3px dashed rgba(139, 107, 74, .42); box-shadow: 0 5px 14px rgba(94, 83, 64, .09);
  border-radius: 3px 7px 4px 6px; animation: noteDrift 23s ease-in-out -7s infinite; }
.drift-note em { display: inline-flex; align-items: center; gap: 4px; font-style: normal; font-size: 11px;
  color: var(--grass-deep); letter-spacing: .08em; }
.drift-note .line { width: 100%; font-size: 12.5px; line-height: 1.75; color: #5C5044;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.drift-note .line b { font-weight: normal; color: var(--wood); margin-right: 3px; }
.drift-note .more { font-size: 10.5px; color: var(--ink-faint); letter-spacing: .05em; }
.drift-note:hover .paper-in { border-color: rgba(139, 107, 74, .62); }
@keyframes noteDrift {
  0%, 100% { transform: rotate(-1.1deg) translate(0, 0); }
  19% { transform: rotate(-2.3deg) translate(-5px, 4px); }
  41% { transform: rotate(-.2deg) translate(4px, -5px); }
  63% { transform: rotate(-1.8deg) translate(-3px, -2px); }
  84% { transform: rotate(-.7deg) translate(2px, 3px); }
}
.note-enter-active, .note-leave-active { transition: opacity .5s, transform .5s; }
.note-enter-from, .note-leave-to { opacity: 0; transform: rotate(-3deg) translate(18px, -7px); }
.note-leave-active { animation: none; }
.home.leaving .drift-note { opacity: 0; transition: opacity .3s; }
.zone-tag { position: absolute; transform: translateX(-50%); white-space: nowrap;
  font-size: 12.5px; color: #5F513F; opacity: .92; letter-spacing: .14em;
  display: inline-flex; align-items: center; gap: 5px; pointer-events: none; }
.art { position: absolute; fill: none; stroke: var(--graphite); stroke-width: 1; opacity: .16;
  stroke-linecap: round; pointer-events: none; }
.art path { vector-effect: non-scaling-stroke; }
.strata { left: 1%; top: 36%; width: 46%; height: 28%; }
.water { left: 4%; top: 66%; width: 92%; height: 22%; stroke: var(--sky); opacity: .3; }

.veins { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
.veins path { stroke: var(--grass); stroke-width: 1.25; stroke-linecap: round; opacity: .55;
  stroke-dasharray: 5 4; filter: url(#boil-soft);
  animation: dashflow 3.2s linear infinite, fadeUp .45s ease-out backwards; }
@keyframes dashflow { to { stroke-dashoffset: -18; } }

/* 类目就是纸上写的一小块地名：没有框、没有底，靠字和记号自己站着 */
.node {
  position: absolute; z-index: 3;   /* 麦子长在字前面会糊，让地块压过麦梢 */
  transform: translate(calc(-50% + var(--ox, 0px)), calc(-50% + var(--oy, 0px)))
    rotate(var(--rot)) scale(var(--sc));
  display: flex; flex-direction: column; align-items: center; gap: 1px; cursor: pointer;
  padding: 5px 6px 7px; background: none;
}
.node.on { z-index: 12; }
.n-icon { color: var(--graphite); transition: color .4s, transform .5s cubic-bezier(.3, .9, .3, 1); }
.n-img { width: 34px; height: 34px; object-fit: cover; border-radius: 46% 54% 50% 50% / 54% 46% 52% 48%;
  box-shadow: inset 0 0 0 1.3px rgba(139, 107, 74, .45); transition: transform .5s cubic-bezier(.3, .9, .3, 1); }
.node:hover .n-icon, .node.on .n-icon { color: var(--grass-deep); transform: translateY(-3px) rotate(-3deg); }
.node:hover .n-img, .node.on .n-img { transform: translateY(-3px) rotate(-4deg) scale(1.07); }
.n-name { font-size: 15.5px; letter-spacing: .04em; white-space: nowrap; }
.node:hover .n-name, .node.on .n-name { color: var(--wood);
  text-decoration: underline wavy rgba(139, 107, 74, .5) 1px; text-underline-offset: 5px; }
.n-intro {
  position: absolute; top: calc(100% + 4px); left: 50%; transform: translate(-50%, 4px);
  font-size: 12.5px; color: var(--ink-soft); white-space: nowrap; max-width: 240px; overflow: hidden;
  text-overflow: ellipsis; opacity: 0; pointer-events: none; transition: opacity .4s .12s, transform .4s .12s;
  padding: 0 9px 1px; border-radius: var(--r-c); background: rgba(250, 246, 236, .93);
}
.node.on .n-intro { opacity: .95; transform: translate(-50%, 0); }
/* 水波纹 */
.rip { position: absolute; left: 50%; top: 34%; width: 84px; height: 52px; margin: -26px -42px;
  border: 1.2px solid rgba(126, 159, 174, .5); border-radius: 50%; pointer-events: none;
  animation: ripple 1.6s ease-out infinite; }
.r2 { animation-delay: .55s; }
/* 刚撒下的那颗：脚边洇开两圈水纹，告诉用户它长在这儿了 */
.node.fresh { z-index: 14; }
.node.fresh::after { content: ''; position: absolute; left: 50%; top: 34%; width: 84px; height: 52px; margin: -26px -42px;
  border: 1.4px solid rgba(126, 159, 174, .65); border-radius: 50%; pointer-events: none;
  animation: ripple 1.5s ease-out 2; }

/* 树根下的一条土带：地就沿着这条线一棵一棵点下去，不另起一行 */
.ground-bed { position: absolute; left: 50%; top: calc(47% + min(14.4vw, 225px));
  width: var(--bed-w, 460px); max-width: 92%; height: 0;
  transform: translateX(-50%); z-index: 6; pointer-events: none; }
.ground-seed { position: absolute; top: calc(var(--dy) - 2px); transform: translateX(-50%) rotate(var(--rot));
  display: inline-flex; flex-direction: column; align-items: center; gap: 0; color: var(--grass-deep);
  pointer-events: auto; transition: transform .4s, color .4s; }
.ground-seed::before { content: ''; position: absolute; top: 17px; left: 50%; width: 26px; height: 7px;
  margin-left: -13px; border-radius: 50%; background: rgba(120, 96, 62, .2); z-index: -1; }
.ground-seed span { font-size: 11px; max-width: 112px; white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis; color: var(--ink-soft); opacity: .74; transform: translateY(1px);
  transition: opacity .35s, transform .35s, background .35s; pointer-events: none;
  padding: 0 4px; border-radius: 3px; background: rgba(250, 246, 236, .62); }
.ground-seed:hover { transform: translateX(-50%) rotate(0deg) translateY(-3px); color: var(--wood); }
.ground-seed:hover span { opacity: 1; transform: none; background: rgba(250, 246, 236, .92); }

/* 风里的那些：各借一阵风，绕的圈子、快慢、转身都不一样 */
.wind-seed { position: absolute; z-index: 4; display: inline-flex; align-items: center; gap: 3px;
  color: rgba(95, 81, 63, .62); transform: rotate(var(--rot));
  animation: windFloat var(--dur) ease-in-out var(--delay) infinite; }
.wind-seed span { font-size: 10.5px; letter-spacing: .03em; color: var(--ink-soft); opacity: 0;
  padding: 0 3px; border-radius: 2px; background: rgba(250, 246, 236, .8); transition: opacity .5s; }
.wind-seed:hover { z-index: 12; color: var(--wood); }
.wind-seed:hover span { opacity: .9; }
@keyframes windFloat {
  0%, 100% { transform: translate(0, 0) rotate(var(--rot)); }
  17% { transform: translate(calc(var(--dx) * .42), calc(var(--dy) * -.55)) rotate(calc(var(--rot) + 7deg)); }
  39% { transform: translate(calc(var(--dx) * .86), calc(var(--dy) * .24)) rotate(calc(var(--rot) - 4deg)); }
  58% { transform: translate(calc(var(--dx) * .28), calc(var(--dy) * .82)) rotate(calc(var(--rot) + 11deg)); }
  79% { transform: translate(calc(var(--dx) * -.34), calc(var(--dy) * .36)) rotate(calc(var(--rot) - 8deg)); }
}

.mist { position: absolute; z-index: 1; left: 50%; top: 88%; transform: translate(-50%, -50%);
  display: flex; align-items: center; gap: 9px; padding: 8px 15px 9px; color: var(--ink-faint);
  font-size: 12.5px; text-align: left; line-height: 1.5; border-radius: var(--r-c);
  box-shadow: inset 0 0 0 1.3px dashed rgba(167, 156, 133, .45); transition: color .4s, box-shadow .4s, transform .4s; }
.mist:hover { color: var(--wood); box-shadow: inset 0 0 0 1.4px rgba(139, 107, 74, .5); transform: translate(-50%, -50%) rotate(-.8deg); }

/* 头像旁边：一片叶记着留言，一枚小铃记着门外；都不点红点 */
.avatar-wrap { position: relative; display: inline-flex; }
.avatar-wrap .avatar { transition: transform .35s, background .35s; }
.avatar-wrap .avatar:hover { background: rgba(79, 107, 58, .24); transform: rotate(-4deg); }
.leaf-msg { position: absolute; right: -14px; bottom: -10px; display: inline-flex; align-items: center;
  gap: 0; color: var(--grass-deep); line-height: 0; transform: rotate(-8deg); cursor: pointer; }
.leaf-msg b { font-size: 10.5px; font-weight: normal; letter-spacing: 0; transform: translate(-7px, 1px); }
.door-msg { position: absolute; left: -13px; top: -10px; display: inline-flex; align-items: center; gap: 0;
  color: var(--wood); line-height: 0; transform: rotate(7deg); cursor: pointer; }
.door-msg b { font-size: 10px; font-weight: normal; transform: translate(-2px, 1px); }
.door-msg:hover, .leaf-msg:hover { color: var(--clay); }
.h-wheat { position: absolute; left: 0; right: 0; bottom: -6px; }

/* 开挖：原野轻轻往后退一步，让风把那把叶子带走 */
.home.diving .meadow { transform: translateY(-12px); opacity: 0; }
.home.diving .h-hero, .home.diving .top-nav { opacity: 0; transition: opacity .45s; }

.m-h { display: flex; align-items: center; gap: 9px; }
/* 撤掉这块地跟开挖不是一路人，靠在左边、离远一点 */
.uproot { margin-right: auto; display: inline-flex; align-items: center; gap: 5px; color: var(--ink-faint); }
.uproot:hover { color: var(--clay); }
.zone-pick { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
.zone-pick button { display: inline-flex; align-items: center; gap: 5px; font-size: 13.5px; color: var(--ink-soft);
  padding: 3px 12px 4px; border-radius: var(--r-c); box-shadow: inset 0 0 0 1.2px rgba(150, 133, 100, .35); transition: .3s; }
.zone-pick button.on { color: var(--grass-deep); box-shadow: inset 0 0 0 1.4px rgba(79, 107, 58, .5); background: rgba(79, 107, 58, .08); }
.seed-pick { display: flex; flex-wrap: wrap; gap: 9px 7px; margin: 8px 2px 4px; }
.pick { color: var(--ink-faint); padding: 4px; border-radius: 40% 55% 48% 52% / 52% 46% 54% 48%;
  transform: translate(var(--pdx), var(--pdy)) rotate(var(--prot)); transition: color .3s, background .3s; }
.pick:hover { color: var(--wood); background: rgba(139, 107, 74, .1); }
.pick.on { color: var(--grass-deep); background: rgba(79, 107, 58, .14);
  transform: translate(var(--pdx), var(--pdy)) rotate(calc(var(--prot) - 4deg)) scale(1.08); }
/* 贴自己那张画：摆在头一个，选上了就压过手绘记号 */
.pick.up { --pdx: 0px; --pdy: 0px; --prot: -3deg; line-height: 0;
  box-shadow: inset 0 0 0 1.2px dashed rgba(150, 133, 100, .5); }
.pick.up.on { box-shadow: inset 0 0 0 1.5px rgba(79, 107, 58, .6); }
.thumb { width: 26px; height: 26px; object-fit: cover; border-radius: 44% 56% 52% 48% / 52% 46% 54% 48%; }

/* 窄屏：别再按百分比往画布上钉，改成一行行散落着贴，怎么缩都不重叠 */
@media (max-width: 1000px) {
  .top-nav { padding: 10px 16px 6px; }
  .h-hero { padding: 10px 16px 2px; }
  .h-hero h1 { font-size: 22px; }
  .h-hero p { font-size: 13px; }
  .meadow { display: flex; flex-wrap: wrap; align-content: flex-start; justify-content: center;
    gap: 2px 6px; padding: 2px 3vw 240px; cursor: default; }
  /* 流式排布时树不跟节点抢地方：固定大小沉在地平线上，底下留出一条带子给它和麦子 */
  .tree { width: 220px; top: auto; bottom: 70px; left: 3%; opacity: .6; transform: none; }
  .shed { left: 3%; width: 220px; max-width: none; top: auto; bottom: 70px; height: 220px; transform: none; opacity: .8; }
  .ground-bed { left: 3%; top: auto; bottom: 62px; width: 220px; height: auto; transform: none;
    display: flex; flex-wrap: wrap; justify-content: center; gap: 0 6px; }
  .ground-seed { position: static; transform: rotate(var(--rot)); }
  .ground-seed:hover { transform: rotate(0deg) translateY(-3px); }
  .drift-note { position: relative; left: auto; top: auto; order: -1; flex: 0 0 auto;
    width: min(286px, 86vw); margin: 6px auto 3px; }
  .wind-seed { opacity: .72; }
  .zone-tag { position: static; transform: none; flex: 0 0 100%; justify-content: center; margin: 14px 0 2px; opacity: .9; }
  /* 绝对定位那半格回中位移在这儿会把节点拽歪，连 left/top 一起放掉；
     但得认个 position，刚撒下那颗的水纹才有地方落脚 */
  .node { position: relative; left: auto !important; top: auto !important;
    transform: translate(var(--jx), var(--jy)) rotate(var(--rot)) scale(var(--sc)); padding: 4px 8px 6px; }
  .n-name { font-size: 13.5px; }
  .n-intro { display: none; }
  .mist { position: static; transform: none; margin: 16px auto 0; }
  .mist:hover { transform: none; }
}
</style>
