<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api';
import { useUser } from '../store/user';
import { useField } from '../store/field';
import { useNotice } from '../store/notice';
import { useNight } from '../store/night';
import { toast } from '../utils/toast';
import { SEED_CHOICES, ZONE_GLYPH, glyphOf } from '../icons';
import { ask } from '../utils/ask';
import { TREE_MAX, extraTrees, treeCap, treeForm, treeGroups, treeRoots, treeStyle } from '../utils/grove';
import CloudLayer from '../components/CloudLayer.vue';
import WheatField from '../components/WheatField.vue';
import SoulTree from '../components/SoulTree.vue';
import GroundWind from '../components/GroundWind.vue';
import Drift from '../components/Drift.vue';
import Toss from '../components/Toss.vue';
import PenPanel from '../components/PenPanel.vue';
import InboxFence from '../components/InboxFence.vue';
import ProfileFence from '../components/ProfileFence.vue';
import Glyph from '../components/Glyph.vue';
import ModalSprig from '../components/ModalSprig.vue';
import PlotSign from '../components/PlotSign.vue';
import VineScroll from '../components/VineScroll.vue';
import VisitGate from '../components/VisitGate.vue';

const route = useRoute();
const router = useRouter();
const user = useUser();
const field = useField();
const notice = useNotice();
const night = useNight();
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

// 一棵树挂满了就在旁边再冒一棵；五棵各有各的数，小院里最多五棵
const extra = computed(() => extraTrees(user.user?.id, user.user?.extra_trees));
const grove = computed(() => treeGroups(field.sessions
  .filter(s => s.placement === 'tree' || !s.placement)
  .slice().sort((a, b) => a.id - b.id), extra.value));
// 地上有几条土埂就摆几条：新开的地还不算树，不能把种下的七十五棵都挤回一条根下
const groundRoots = computed(() => {
  const beds = field.sessions.reduce((m, s) =>
    s.placement === 'ground' ? Math.max(m, (s.branch ?? 0) + 1) : m, 0);
  return treeRoots(Math.max(grove.value.length, beds) || TREE_MAX, 'home');
});

// 类目横着挂在题头下面的一根野藤上，从左到右依次开花
const VINE_LEFT = 3, VINE_WIDTH = 94, VINE_Y = 10.5, VINE_TOP = 48;
// 撒种的时候还是按四个气候区归堆，只是不再各占一根藤
const ZONES = [{ key: '学科' }, { key: '行业' }, { key: '人群' }, { key: '幻想' }];
const ZONE_TONE = { 学科: 'var(--grass-deep)', 行业: 'var(--wood)', 人群: 'var(--clay)', 幻想: 'var(--lilac)' };
// 藤上只长开源手绘库里的田园记号：叶子打底，花是偶尔开的
const LEAF_TONE = {
  leaf: 'var(--grass-deep)', sprout: 'var(--grass)',
  blossom: 'var(--sakura)', sakura: 'var(--sakura)', daisy: 'var(--wheat)',
  sunflower: 'var(--wheat)', tulip: 'var(--clay)', rose: 'var(--clay)', flower: 'var(--lilac)'
};
const VINE_LEAF = ['leaf', 'sprout', 'leaf', 'leaf', 'blossom', 'leaf', 'sprout', 'leaf',
  'daisy', 'leaf', 'leaf', 'sakura', 'sprout', 'leaf', 'tulip', 'leaf', 'leaf', 'flower',
  'leaf', 'rose', 'leaf', 'sunflower', 'leaf', 'sprout'];
// 记号的颜色从土里长出来，不是统一的墨黑
const TONES = ['var(--grass-deep)', 'var(--wood)', 'var(--grass)', 'var(--wheat)', 'var(--grass-deep)',
  'var(--sky)', 'var(--clay)', 'var(--wood)', 'var(--grass)', 'var(--lilac)', 'var(--grass-deep)', 'var(--sakura)'];

const hash = s => [...String(s)].reduce((h, c) => (h * 31 + c.codePointAt(0)) >>> 0, 7);

// 一根横着的藤：起伏错开，没有哪一段是直的；整条比记号那排再高二十像素，细茎随之拉长
const vineY = (x, seed) => 2
  + Math.sin(x / 15.5 + seed * .63) * 11
  + Math.sin(x / 7.2 + seed * 1.17) * 6.5
  + Math.sin(x / 35 + seed * .31) * 3.4;
// 采样点之间用 Catmull-Rom 收圆，手画的线才不会带棱角
function curve(pts) {
  let d = `M${pts[0][0]} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0]} ${p2[1].toFixed(1)}`;
  }
  return d;
}
function vinePath(seed) {
  const pts = [];
  for (let x = 0; x <= 100; x += 4) pts.push([x, vineY(x, seed)]);
  return curve(pts);
}
// 第二股细藤绕在主藤上：一会儿翻过去，一会儿从底下钻出来
function vineBraid(seed) {
  const pts = [];
  for (let x = 0; x <= 100; x += 3.2) {
    pts.push([x, vineY(x, seed) + Math.sin(x / 4.2 + seed * 2.1) * 8.5]);
  }
  return curve(pts);
}
// 叶子一丛一丛地长：有的节点并两片，有的地方空着让藤露出来
function vineSprigs(seed) {
  const xs = [2, 9, 15, 22, 29, 37, 44, 50, 57, 64, 71, 78, 85, 91, 97];
  return xs.flatMap((x, i) => {
    const h = hash(seed + ':' + i);
    if (h % 8 === 0) return [];
    return Array.from({ length: h % 3 ? 1 : 2 }, (_, k) => {
      const px = Math.max(1, Math.min(99, x + (h >>> (3 + k * 4)) % 9 - 4 + k * (2 + h % 3)));
      const g = VINE_LEAF[(i * 5 + (h >>> 5) + k * 7) % VINE_LEAF.length];
      const up = (h >>> k) % 2;
      return {
        x: px, top: vineY(px, seed) + (up ? -1 : 1) * (3 + (h >>> (k * 3)) % 6),
        size: 29 + (h >>> (k * 4)) % 8,
        rot: (h >>> (k * 5)) % 64 - 32, g, c: LEAF_TONE[g],
        dur: 5 + (h >>> (k * 7)) % 5,
        delay: -((h >>> (k * 3)) % 8)
      };
    });
  });
}
// 藤梢探出去的卷须：三种绕法，风向哪边就歪哪边
const TENDRILS = [
  'M10 22 C 9 17, 13 14, 14 9 C 15 5, 10 2.6, 8 6 C 6 9.4, 9.6 12.4, 12.4 10',
  'M10 22 C 12 17, 7 13, 9 8 C 10.6 4, 15 6, 14 10 C 13.2 13, 9.8 13.6, 8.4 11',
  'M10 22 C 8 16, 15 15, 13 9 C 11.6 4.8, 6.8 6, 7.4 9.6 C 8 12.4, 10.8 12.8, 12 10.4'
];
function vineTendrils(seed) {
  return [5, 19, 33, 47, 61, 75, 89, 98].map((x, i) => {
    const h = hash(seed + '~:' + i);
    return {
      x: x + (h % 7) - 3, y: vineY(x, seed), down: !!(h % 2),
      s: 28 + h % 10, rot: (h % 30) - 15, v: h % TENDRILS.length
    };
  });
}
// 藤上停着的蝶和虫：不按网格摆，各有各的落脚处
const VINE_FLITS = [
  { x: 15, y: 6, s: 26, rot: -12, dur: 23, delay: -6, c: 'var(--clay)', fx: 30, fy: -10 },
  { x: 39, y: -14, s: 20, rot: 9, dur: 19, delay: -11, c: 'var(--wheat)', fx: -24, fy: -14 },
  { x: 63, y: 22, s: 22, rot: 16, dur: 27, delay: -3, c: 'var(--wood)', fx: 18, fy: 9 },
  { x: 87, y: -8, s: 18, rot: -6, dur: 31, delay: -9, c: 'var(--sakura)', fx: -16, fy: 8 }
];
// 主藤上再压二十股野藤：有的往上探头，有的垂到类目缝里，长短粗细都不齐
const rnd = seed => {
  let s = seed;
  return () => (s = s * 16807 % 2147483647) / 2147483647;
};
function wildVines(seed) {
  const ra = rnd(seed * 977 + 41);
  return Array.from({ length: 20 }, (_, i) => {
    const x0 = 3 + ra() * 94;
    const base = 71 + vineY(x0, 23);
    const up = ra() < .18;
    const len = up ? 12 + ra() * 38 : 36 + ra() * 120;
    const sway = up ? 3 + ra() * 7 : 2 + ra() * 5;
    const dir = ra() < .5 ? 1 : -1;
    const segs = 4 + Math.floor(ra() * 3);
    const amp = 1 + ra() * 2.5;
    const ph = ra() * Math.PI * 2, ph2 = ra() * Math.PI * 2;
    const pts = [];
    for (let k = 0; k <= segs; k++) {
      const t = k / segs;
      const x = x0 + dir * Math.sin(t * Math.PI * 1.3 + ph) * sway * (.2 + t * .9)
        + Math.sin(t * Math.PI * 1.4 + i) * (ra() * 2 - 1) * t;
      const y = base + (up ? -1 : 1) * len * Math.pow(t, .82)
        + Math.sin(t * Math.PI * 2 + ph2) * amp * (up ? t : Math.sin(t * Math.PI));
      pts.push([Math.max(-4, Math.min(104, x)), Math.max(6, Math.min(214, y))]);
    }
    return {
      i, d: curve(pts), w: [0.9, 1.1, 1.4, 1.8, 2.3, 3][Math.floor(Math.pow(ra(), 1.4) * 6)],
      c: ra() < .34 ? 'var(--grass-deep)' : 'var(--grass)',
      o: .3 + ra() * .26, dur: 9 + ra() * 8, delay: -ra() * 9
    };
  });
}
const WILD_VINES = wildVines(53);

const vine = computed(() => {
  const all = field.topics;
  if (!all.length) return null;
  const icon = all.length > 18 ? 53 : 58;
  const list = all.map((t, i) => {
    const jitter = ((hash('x' + t.name + t.id) % 5) - 2) * .04;
    const x = all.length === 1 ? 50 : Math.min(96, Math.max(4, 4 + i * 92 / (all.length - 1) + jitter));
    const top = VINE_TOP + hash('h' + t.name + t.id) % 10;
    return {
      t, x, top,
      rot: ((hash('r' + t.name) % 5) - 2) * .7,
      s: .96 + (hash('s' + t.name) % 100) / 100 * .04,
      stem: top - vineY(x, 23),
      tone: TONES[hash('c' + t.name + t.id) % TONES.length],
      align: x < 12 ? 'left' : x > 88 ? 'right' : 'center'
    };
  });
  return {
    y: VINE_Y, left: VINE_LEFT, width: VINE_WIDTH, list, icon,
    path: vinePath(23), braid: vineBraid(23), sprigs: vineSprigs(23),
    tendrils: vineTendrils(23), flits: VINE_FLITS
  };
});
// 藤梢还要往上探二十来像素，整行再往下落，别让上面那句话压住藤
const rowStyle = r => ({ left: r.left + '%', top: `calc(${r.y}% - 40px)`, width: r.width + '%' });
// 窄屏把同一根藤竖起来：两股缠着往下走，记号左右交替挂在藤上
const VINE_DOWN = 'M48 0 C 55 6, 41 12, 50 19 C 58 25, 42 31, 49 38 C 56 45, 43 50, 51 58 C 57 64, 44 70, 50 78 C 55 85, 44 92, 50 100';
const VINE_BRAID_DOWN = 'M53 0 C 45 6, 60 12, 51 20 C 43 27, 59 33, 50 41 C 42 49, 57 55, 50 63 C 44 70, 58 76, 50 84 C 44 91, 55 96, 50 100';
const MOBILE_LEAVES = ['leaf', 'sprout', 'blossom', 'leaf', 'sprout', 'leaf', 'sakura', 'leaf',
  'daisy', 'leaf', 'sprout', 'tulip', 'leaf', 'flower', 'leaf', 'rose']
  .map((g, i) => ({
    g, y: 1.5 + i * 6.2, x: (i % 2 ? 56 : 44) + (hash('mx' + i) % 5) - 2,
    s: 24 + hash('mv' + i) % 8, rot: (hash('mr' + i) % 50) - 25,
    dur: 5 + hash('md' + i) % 5, delay: -(hash('ml' + i) % 8)
  }));
const MOBILE_FLITS = [
  { x: 41, y: 17, s: 22, rot: -8, dur: 22, delay: -5, c: 'var(--clay)', fx: 16, fy: -12 },
  { x: 59, y: 63, s: 18, rot: 10, dur: 26, delay: -13, c: 'var(--wheat)', fx: -12, fy: -9 }
];

const meadow = ref(null);
// 刚封好的地落在树上、地里还是风里，回来就顺着藤或风去找它
const focusId = Number(route.query.focus) || 0;
const fresh = ref(0);
let findTimer;
async function findPlanted() {
  if (!focusId || !field.ready) return;
  await nextTick();
  const el = meadow.value?.querySelector(`[data-id="${focusId}"]`);
  if (!el) return;
  const inWind = el.classList.contains('wind-seed');
  if (!inWind) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  fresh.value = focusId;
  toast(inWind ? '随风到了，就在这儿' : '顺着藤，找到它了');
  clearTimeout(findTimer);
  findTimer = setTimeout(() => (fresh.value = 0), 4200);
}
watch([() => field.ready, meadow], findPlanted, { immediate: true });
onBeforeUnmount(() => clearTimeout(findTimer));
const hover = ref(null);
const at = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

const enter = n => (hover.value = n);
const leave = () => (hover.value = null);

// 枝头的叶和花就是一块块地：生长中的回地里接着挖，封存了的去回看
const openPlot = s => router.push(s.status === 'running' ? '/think/' + s.id : '/review/' + s.id);

/* ——— 下种 ——— */
const topicFor = ref(null);
const sTitle = ref('');
const sQuestion = ref('');
// 类目名多长，纸就裁多宽；题头不折行
const topicW = computed(() => Math.min(760, Math.max(540, 200 + [...(topicFor.value?.name || '')].length * 33)));
const diving = ref(false);
// 风从点下去的地方起：一把花和叶子被带走，散完了才翻纸
const gust = ref(null);
const showPen = ref(false);

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
  return {
    '--pdx': ((h >>> 3) % 9 - 4) * 1.7 + 'px', '--pdy': ((h >>> 7) % 7 - 3) * 1.6 + 'px',
    '--prot': ((h >>> 11) % 25 - 12) + 'deg', '--tone': TONES[(h >>> 15) % TONES.length]
  };
};
// 刚撒下的那颗要指给用户看：滚到它跟前，脚边再洇开两圈水纹
const justSown = ref(null);
async function addTopic() {
  const name = tName.value.trim();
  if (!name) return toast('名字总得起一个');
  if ([...name].length > 10) return toast('名字最多十个字');
  if ([...tIntro.value.trim()].length > 30) return toast('一句话介绍最多三十个字');
  const t = await field.sow({ category: newFor.value, name, icon: tIcon.value, intro: tIntro.value, img: tImg.value });
  newFor.value = '';
  await nextTick();
  meadow.value.querySelector(`[data-id="${t.id}"]`).scrollIntoView({ block: 'center', behavior: 'smooth' });
  justSown.value = t.id;
  setTimeout(() => (justSown.value = null), 3200);
  toast('种子撒下了');
}
// 自己的一张画，压过手绘的记号；文件直接递，别先读进内存
const IMG_MAX = 300 * 1024 * 1024;
async function pickTopicPhoto() {
  const yes = await ask({
    title: '照片会公开', icon: 'image',
    body: '这块地的照片会挂在主页上，别人能看、能下载，也可能被截图。存在被盗用或拿去商用的风险。愿意公开再传。',
    ok: '愿意，挑一张', cancel: '先不传'
  });
  if (yes) picker.value.click();
}
async function attach(e) {
  const f = e.target.files[0];
  if (!f) return;
  if (f.size > IMG_MAX) {
    e.target.value = '';
    return toast('照片不能超过 300M');
  }
  tImg.value = (await api.upload(f)).url;
  e.target.value = '';
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

// 出门：整页轻轻抬一下，像人抬起头往远处看
const leaving = ref(false);
function leaveTo(path) {
  if (leaving.value) return;
  leaving.value = true;
  setTimeout(() => router.push(path), 300);
}

function quit() {
  user.logout();
  router.push('/login');
}

// 篱笆上有话就飘来一张纸，没话就只让风过去
onMounted(() => {
  notice.load();
  user.load();
});
</script>

<template>
  <div class="home" :class="{ diving, leaving }">
    <header class="top-nav">
      <nav>
        <button class="nav-link night-link" :title="night.on ? '把天叫亮' : '把天关暗'"
          @click="night.toggle()">
          <Glyph :name="night.on ? 'sun' : 'moon'" :size="16"/> {{ night.on ? '天亮' : '天黑' }}
        </button>
        <button class="nav-link" title="笔风和字号" @click="showPen = true">笔风</button>
        <button class="nav-link" @click="router.push('/mine')">我的田地</button>
        <router-link v-if="user.user?.id" class="nav-link" title="小院里的花草都记得你"
          :to="'/garden/' + user.user.id">回我的小院</router-link>
        <span v-if="notice.words || notice.doors || notice.approvals || notice.declined" class="notice-line">
          <button v-if="notice.words" @click="openInbox('notes')">
            篱上 {{ notice.words }} 句
          </button>
          <i v-if="notice.words && (notice.doors || notice.approvals || notice.declined)">·</i>
          <button v-if="notice.doors" @click="openInbox('knocks')">
            门外 {{ notice.doors }} 处
          </button>
          <i v-if="notice.doors && (notice.approvals || notice.declined)">·</i>
          <button v-if="notice.approvals" title="有人给你开了门" @click="openInbox('knocks')">
            门开了 {{ notice.approvals }} 处
          </button>
          <i v-if="notice.approvals && notice.declined">·</i>
          <button v-if="notice.declined" title="门那边递来一句话" @click="openInbox('knocks')">
            门外回音 {{ notice.declined }} 句
          </button>
        </span>
        <button class="avatar" title="改名字、换把钥匙" @click="profileOpen = true">
          {{ (user.user?.nickname || '田')[0] }}
        </button>
        <button class="nav-link quiet" @click="quit">退出</button>
      </nav>
    </header>

    <section class="h-hero">
      <CloudLayer/>
      <h1>今天想琢磨点什么？</h1>
      <p>挑一块地，换个角度往下挖。没人催你，想挖多深挖多深。</p>
    </section>

    <div class="meadow-wrap">
    <main ref="meadow" class="meadow roll" @click.self="onFieldClick">
      <div v-if="!field.ready" class="loading">土还在翻</div>

      <SoulTree v-for="(tree, i) in grove" :key="'tree' + i" class="tree" :class="'tree-' + i"
        :style="treeStyle(i, 'home', tree.length, treeCap(i))" :sessions="tree" :cap="treeCap(i)"
        :fresh="fresh" :variant="treeForm(user.user?.id, i)"
        :seed="(user.user?.id || 0) * 37 + i * 101" @open="openPlot"/>
      <div v-if="blooming" class="shed"><Drift/></div>

      <svg class="art strata" viewBox="0 0 100 60" preserveAspectRatio="none">
        <path v-for="i in 5" :key="i" :d="`M2 ${i * 11} C 20 ${i * 11 - 4}, 38 ${i * 11 + 3}, 56 ${i * 11 - 2} C 72 ${i * 11 - 5}, 86 ${i * 11 + 2}, 98 ${i * 11 - 1}`"/>
      </svg>
      <svg class="art water" viewBox="0 0 100 30" preserveAspectRatio="none">
        <path v-for="i in 4" :key="i" :d="`M${4 + i * 3} ${i * 7} C 26 ${i * 7 - 3}, 48 ${i * 7 + 3}, 70 ${i * 7 - 1} C 82 ${i * 7 - 2}, 90 ${i * 7 + 1}, 96 ${i * 7}`"/>
      </svg>

      <div v-if="vine" class="vine-field">
        <div class="vine-row" :class="{ lit: hover }" :style="rowStyle(vine)">
          <svg class="vine-wild" viewBox="0 0 100 220" preserveAspectRatio="none" aria-hidden="true">
            <path v-for="w in WILD_VINES" :key="w.i" :d="w.d"
              :style="{ strokeWidth: w.w, stroke: w.c, opacity: w.o,
                animationDuration: w.dur + 's', animationDelay: w.delay + 's' }"/>
          </svg>
          <svg class="vine-ink" viewBox="0 0 100 78" preserveAspectRatio="none" aria-hidden="true">
            <path class="vine-line" :d="vine.path"/>
            <path class="vine-braid" :d="vine.braid"/>
          </svg>
          <svg class="vine-down" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path :d="VINE_DOWN"/>
            <path class="vine-braid-down" :d="VINE_BRAID_DOWN"/>
          </svg>
          <svg v-for="(c, k) in vine.tendrils" :key="'t' + k" class="vine-tendril" :class="{ down: c.down }"
            viewBox="0 0 20 22" aria-hidden="true"
            :style="{ left: c.x + '%', top: c.y + 'px', '--ts': c.s + 'px', '--rot': c.rot + 'deg' }">
            <path :d="TENDRILS[c.v]"/>
          </svg>
          <Glyph v-for="(sp, k) in vine.sprigs" :key="k" class="vine-sprig" :name="sp.g" :size="sp.size"
            :style="{ left: sp.x + '%', top: sp.top + 'px', color: sp.c, '--rot': sp.rot + 'deg',
              '--dur': sp.dur + 's', '--delay': sp.delay + 's' }"/>
          <Glyph v-for="(sp, k) in MOBILE_LEAVES" :key="'m' + k" class="vm-leaf" :name="sp.g" :size="sp.s"
            :style="{ left: sp.x + '%', top: sp.y + '%', color: LEAF_TONE[sp.g], '--rot': sp.rot + 'deg',
              '--dur': sp.dur + 's', '--delay': sp.delay + 's' }"/>
          <Glyph v-for="(f, k) in vine.flits" :key="'f' + k" class="vine-flit" name="fly" :size="f.s"
            :style="{ left: f.x + '%', top: f.y + 'px', color: f.c, '--rot': f.rot + 'deg',
              '--fx': f.fx + 'px', '--fy': f.fy + 'px', '--dur': f.dur + 's', '--delay': f.delay + 's' }"/>
          <Glyph v-for="(f, k) in MOBILE_FLITS" :key="'mf' + k" class="vm-flit" name="fly" :size="f.s"
            :style="{ left: f.x + '%', top: f.y + '%', color: f.c, '--rot': f.rot + 'deg',
              '--fx': f.fx + 'px', '--fy': f.fy + 'px', '--dur': f.dur + 's', '--delay': f.delay + 's' }"/>
          <button v-for="(n, k) in vine.list" :key="n.t.id" class="node" :data-id="n.t.id"
            :class="{ on: hover?.t.id === n.t.id, fresh: justSown === n.t.id, right: k % 2 }"
            :style="{ left: n.x + '%', top: n.top + 'px', '--rot': n.rot + 'deg', '--sc': n.s,
              '--icon': vine.icon + 'px', '--tone': n.tone }"
            :aria-label="n.t.name" @mouseenter="enter(n)" @focus="enter(n)"
            @mouseleave="leave" @blur="leave" @click.stop="openStart(n.t)">
            <svg class="stem" :style="{ height: `calc(${n.stem}px / var(--fit, 1))` }" viewBox="0 0 8 40" preserveAspectRatio="none" aria-hidden="true">
              <path d="M4 40 C 2.6 27, 5.4 13, 4 0"/>
              <circle cx="4" cy="1" r="1.5" fill="currentColor" opacity=".7"/>
            </svg>
            <i v-if="hover?.t.id === n.t.id" class="rip r1"/><i v-if="hover?.t.id === n.t.id" class="rip r2"/>
            <img v-if="n.t.img" class="n-img" :src="n.t.img" alt=""/>
            <Glyph v-else class="n-icon" :name="glyphOf(n.t)" :size="vine.icon"/>
            <PlotSign class="node-sign" :text="n.t.name" :align="n.align"/>
          </button>
        </div>
      </div>

      <!-- 种在地上的和交给风的那些，和别人的院子里共用同一套生长 -->
      <GroundWind :sessions="field.sessions" :roots="groundRoots" :fresh="fresh" @open="openPlot"/>

      <button class="mist" @click.stop="openSeed(null, { x: 48, y: 63 })">
        <Glyph name="flower" :size="22"/>
        <span>这片迷雾还没人开过，<br/>点一下撒颗自己的种子</span>
      </button>

      <WheatField class="h-wheat"/>
    </main>
    <VineScroll :el="meadow"/>
    </div>

    <VisitGate @go="leaveTo('/visits')" @town="leaveTo('/town')"/>

    <div v-if="topicFor" class="mask" @click.self="topicFor = null">
      <div class="modal topic-modal" :style="{ width: topicW + 'px' }">
        <ModalSprig/>
        <h3 class="m-h"><Glyph :name="glyphOf(topicFor)" :size="27"/> 在「{{ topicFor.name }}」这块地下个种</h3>
        <div class="f-item">
          <label>给这次思考起个题</label>
          <input v-model="sTitle" placeholder="比如：我为什么害怕开始"/>
        </div>
        <div class="f-item">
          <label>最想问自己的那句话（可以先空着，三十字以内）</label>
          <textarea v-model="sQuestion" rows="2" maxlength="30"/>
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
      <div class="modal seed-modal">
        <ModalSprig/>
        <h3 class="m-h"><Glyph name="flower" :size="30"/> 自己开一块地</h3>
        <div class="f-item">
          <label>长在哪个气候区</label>
          <div class="zone-pick">
            <button v-for="z in ZONES" :key="z.key" :class="{ on: newFor === z.key }"
              :style="{ '--tone': ZONE_TONE[z.key] }"
              @click="newFor = z.key; tIcon = ZONE_GLYPH[z.key]; tImg = ''">
              <Glyph :name="ZONE_GLYPH[z.key]" :size="27"/> {{ z.key }}
            </button>
          </div>
        </div>
        <div class="f-item">
          <label>叫啥名</label>
          <input v-model="tName" placeholder="比如：钓鱼"/>
        </div>
        <div class="f-item">
          <label>挑个记号，或者贴一张自己的画</label>
          <div class="seed-pick">
            <button class="pick up" :class="{ on: !!tImg }" @click="pickTopicPhoto">
              <img v-if="tImg" class="thumb" :src="tImg" alt=""/>
              <Glyph v-else name="upload" :size="32"/>
            </button>
            <button v-for="g in SEED_CHOICES" :key="g" class="pick" :class="{ on: !tImg && tIcon === g }" :style="pickStyle(g)"
              @click="tIcon = g; tImg = ''">
              <Glyph :name="g" :size="32"/>
            </button>
          </div>
          <input ref="picker" type="file" accept="image/*" hidden @change="attach"/>
        </div>
        <div class="f-item">
          <label>一句话介绍（可空）</label>
          <input v-model="tIntro" maxlength="30"/>
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
.home { position: relative; display: flex; flex-direction: column; height: 100vh; height: 100dvh;
  overflow: hidden; padding-bottom: env(safe-area-inset-bottom); }
.home .top-nav nav { margin-left: auto; }
.home .top-nav, .home .h-hero { transition: transform .3s, opacity .3s; }
/* 去串门：整页轻轻抬一下，像人抬起头往远处看 */
.home.leaving .top-nav, .home.leaving .h-hero { transform: translateY(-8px); opacity: 0; }
.home.leaving .meadow { transform: translateY(-8px); opacity: 0;
  transition: transform .3s, opacity .3s; }

.nav-link { display: inline-flex; align-items: center; gap: 6px; color: var(--ink-soft); font-size: var(--fs-head); transition: color .3s; }
.nav-link:hover { color: var(--wood); }
.nav-link.quiet { color: var(--ink-faint); }

/* 题头只是纸上的字，别挡住风里飘到这儿歇脚的种子 */
.h-hero { position: relative; z-index: 20; pointer-events: none; flex: none; text-align: center; padding: 16px 20px 4px; }
.h-hero h1 { font-size: var(--fs-hero); font-weight: normal; letter-spacing: .1em; filter: url(#ink-grain); }
.h-hero p { color: var(--ink-soft); margin-top: 2px; font-size: var(--fs-base); }

/* 类目弹窗跟着名字长短裁纸，题头一行写完 */
.topic-modal { max-width: 92vw; }
.topic-modal .m-h { font-size: clamp(20px, 4.6vw, var(--fs-title)); white-space: nowrap; gap: 9px; }
.topic-modal label { font-size: var(--fs-base); }

/* 一整片原野，地势从树冠到水面。页面不滚，原野自己在框里滚，滚条换成一根藤 */
.meadow-wrap { position: relative; flex: 1; min-height: 0; display: flex; margin: 0 2vw; }
.meadow { --tree-w: min(45vw, 640px); --tree-lift: 120px; --tree-x: calc(24.5% - 160px);
  /* 树往高里长：树干和根占了整整一竖，根仍旧扎在这条土线上 */
  --tree-h: min(calc(var(--tree-w) * 1.4), calc(100% - var(--tree-lift)));
  position: relative; flex: 1; min-width: 0; min-height: 0; cursor: crosshair;
  overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none;
  transition: transform .9s cubic-bezier(.2, .7, .3, 1), opacity .8s .04s; }
.meadow::-webkit-scrollbar { display: none; }
/* 树长在原野左边，高过藤和类目，枝梢一直伸到风里去 */
.tree { position: absolute; left: var(--tree-x); bottom: calc(var(--tree-lift) - var(--tree-drop, 0px)); top: auto;
  width: auto; aspect-ratio: 300 / 420; height: calc(var(--tree-h) * var(--tree-grow, 1) * var(--tree-boost, 1));
  z-index: 12; transform: translateX(-50%); pointer-events: none;
  transition: height .9s cubic-bezier(.2, .8, .3, 1); }
/* 挂满一棵后新冒出来的树：挨着最高的那棵，一株株矮一点，根还落在同一条土线上 */
.tree:not(.tree-0) { left: var(--tree-left); bottom: calc(var(--tree-lift) - var(--tree-drop, 0px));
  height: calc((var(--tree-h) * var(--tree-scale) * var(--tree-grow, 1) + var(--tree-extra, 0px)) * var(--tree-boost, 1)); width: auto;
  z-index: 11; opacity: .94; }
/* 落花只罩在树冠那一带：花瓣是从开了花的枝头上掉的，不是从天上掉的 */
.shed { position: absolute; left: var(--tree-x); bottom: calc(var(--tree-lift) + var(--tree-h) * .34 - var(--tree-drop, 0px));
  width: calc(var(--tree-h) * .56); height: calc(var(--tree-h) * .34);
  transform: translateX(-50%); pointer-events: none; z-index: 14; }
.shed :deep(.drift) { inset: 0; height: auto; }

/* 一根横藤从原野这头长到那头，类目一左一右垂在藤下 */
.vine-field { position: absolute; inset: 0; z-index: 21; pointer-events: none; }
.vine-row { position: absolute; height: 78px; pointer-events: none; }
/* 压在下面那二十股，不抢主藤，只是让它看起来是长出来的，不是画出来的 */
.vine-wild { position: absolute; left: 0; top: 50%; width: 100%; height: 220px;
  transform: translateY(-50%); overflow: visible;
  fill: none; stroke: var(--grass); stroke-linecap: round; opacity: .82;
  filter: url(#boil-soft); }
.vine-wild path { vector-effect: non-scaling-stroke; transform-box: fill-box; transform-origin: 50% 60%;
  animation-name: wildSway; animation-timing-function: ease-in-out; animation-iteration-count: infinite;
  animation-direction: alternate; }
@keyframes wildSway {
  from { transform: rotate(-.32deg); }
  to { transform: rotate(.38deg); }
}
.vine-ink { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible;
  fill: none; stroke: var(--grass-deep); stroke-width: 4.2; stroke-linecap: round; opacity: .64;
  filter: url(#boil-soft);
  animation: vineBreathe 17s ease-in-out infinite alternate, vineSway 11s ease-in-out infinite alternate; }
.vine-ink path { vector-effect: non-scaling-stroke; }
/* 第二股藤比主线浅，缠着走才像活的 */
.vine-braid { stroke: var(--grass); stroke-width: 2.6; opacity: .9; }
.vine-row.lit .vine-ink { stroke: var(--grass-deep); opacity: .96; }
/* 窄屏那根竖藤，平时藏着 */
.vine-down, .vm-leaf, .vm-flit { display: none; }
.vine-tendril { position: absolute; width: var(--ts); height: calc(var(--ts) * 1.1); overflow: visible;
  fill: none; stroke: var(--grass-deep); stroke-width: 2.2; stroke-linecap: round; opacity: .58;
  transform: translate(-50%, -100%) rotate(var(--rot)); transform-origin: 50% 100%;
  pointer-events: none; transition: opacity .4s;
  animation: tendrilBreathe 6.5s ease-in-out infinite alternate; }
.vine-tendril.down { transform: translate(-50%, 0) scaleY(-1) rotate(var(--rot)); transform-origin: 50% 0; }
.vine-row.lit .vine-tendril { opacity: .9; }
.vine-sprig { position: absolute; opacity: .9;
  transform: translate(-50%, -50%) rotate(var(--rot)); pointer-events: none; transition: opacity .4s;
  animation: sprigSway var(--dur, 7s) ease-in-out var(--delay, 0s) infinite alternate; }
.vine-row.lit .vine-sprig { opacity: 1; }
/* 停在藤上的蝶和虫：不是贴图，翅膀一开一合，身子随风挪一点 */
.vine-flit { position: absolute; z-index: 0; opacity: .85; pointer-events: none;
  transform: translate(-50%, -50%) rotate(var(--rot));
  animation: vineFlit var(--dur) ease-in-out var(--delay) infinite alternate; }
.vine-flit :deep(svg) { transform-box: fill-box; transform-origin: center;
  animation: wingBeat 1.4s ease-in-out infinite alternate; }
@keyframes sprigSway {
  from { transform: translate(-50%, -50%) rotate(calc(var(--rot) - 3deg)); }
  to { transform: translate(-50%, -50%) rotate(calc(var(--rot) + 3deg)); }
}
@keyframes vineFlit {
  from { transform: translate(-50%, -50%) translate(calc(var(--fx) * -.45), calc(var(--fy) * -.4)) rotate(calc(var(--rot) - 8deg)); }
  to { transform: translate(-50%, -50%) translate(calc(var(--fx) * .45), calc(var(--fy) * .4)) rotate(calc(var(--rot) + 10deg)); }
}
@keyframes wingBeat { from { transform: scaleX(1); } to { transform: scaleX(.78); } }
@keyframes vineBreathe { from { opacity: .58; } to { opacity: .8; } }
@keyframes vineSway { from { rotate: -.28deg; } to { rotate: .28deg; } }
@keyframes tendrilBreathe { from { opacity: .42; } to { opacity: .74; } }
.art { position: absolute; fill: none; stroke: var(--graphite); stroke-width: 1; opacity: .16;
  stroke-linecap: round; pointer-events: none; }
.art path { vector-effect: non-scaling-stroke; }
.strata { left: 1%; top: 36%; width: 46%; height: 28%; }
.water { left: 4%; top: 66%; width: 92%; height: 22%; stroke: var(--sky); opacity: .3; }

/* 类目是垂在藤蔓下的记号：脚上不落地，靠一根细藤吊着 */
.node {
  position: absolute; z-index: 1;
  transform: translateX(-50%) rotate(var(--rot)) scale(calc(var(--sc) * var(--fit, 1)));
  transform-origin: 50% 0;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  padding: 2px; background: none; pointer-events: auto;
}
.node.on { z-index: 22; }
.stem { position: absolute; left: 50%; bottom: 100%; width: 8px; color: rgba(79, 107, 58, .42);
  transform: translateX(-50%); overflow: visible; pointer-events: none; transition: color .4s; }
.stem path { fill: none; stroke: currentColor; stroke-width: 1.15; vector-effect: non-scaling-stroke; }
.node:hover .stem, .node.on .stem { color: var(--grass-deep); }
.n-icon { color: var(--tone, var(--graphite)); transition: filter .4s, transform .5s cubic-bezier(.3, .9, .3, 1); }
.n-img { width: var(--icon, 48px); height: var(--icon, 48px); object-fit: cover;
  border-radius: 46% 54% 50% 50% / 54% 46% 52% 48%;
  box-shadow: inset 0 0 0 1.3px rgba(139, 107, 74, .45); transition: transform .5s cubic-bezier(.3, .9, .3, 1); }
.node:hover .n-icon, .node.on .n-icon { filter: saturate(1.18) brightness(.95); transform: translateY(-3px) rotate(-3deg); }
.node:hover .n-img, .node.on .n-img { transform: translateY(-3px) rotate(-4deg) scale(1.07); }
/* 手放上去才露出这块地的名：挂一块木牌，横着长，话多长牌子就多宽 */
.node-sign { top: calc(100% + 2px); opacity: 0; visibility: hidden; translate: 0 3px;
  transition: opacity .35s, translate .35s, visibility .35s; }
.node:hover .node-sign, .node.on .node-sign, .node:focus-visible .node-sign {
  opacity: 1; visibility: visible; translate: 0 0; }
/* 水波纹 */
.rip { position: absolute; left: 50%; top: 50%; width: 96px; height: 58px; margin: -29px -48px;
  border: 1.2px solid rgba(126, 159, 174, .5); border-radius: 50%; pointer-events: none;
  animation: ripple 1.6s ease-out infinite; }
.r2 { animation-delay: .55s; }
/* 刚撒下的那颗：脚边洇开两圈水纹，告诉用户它长在这儿了 */
.node.fresh { z-index: 14; }
.node.fresh::after { content: ''; position: absolute; left: 50%; top: 50%; width: 96px; height: 58px; margin: -29px -48px;
  border: 1.4px solid rgba(126, 159, 174, .65); border-radius: 50%; pointer-events: none;
  animation: ripple 1.5s ease-out 2; }

.mist { position: absolute; z-index: 18; right: 3%; bottom: 150px;
  display: flex; align-items: center; gap: 9px; padding: 8px 15px 9px; color: var(--ink-faint);
  font-size: var(--fs-base); text-align: left; line-height: 1.5; border-radius: var(--r-c);
  background: color-mix(in srgb, var(--paper) 92%, transparent);
  box-shadow: inset 0 0 0 1.3px dashed rgba(167, 156, 133, .45); transition: color .4s, box-shadow .4s, transform .4s; }
.mist:hover { color: var(--wood); box-shadow: inset 0 0 0 1.4px rgba(139, 107, 74, .5); transform: rotate(-.8deg); }

/* 头像旁边直接写着今天的动静，不藏着等 hover */
.notice-line { display: inline-flex; align-items: center; gap: 5px; color: var(--wood);
  font-size: var(--fs-head); letter-spacing: .02em; white-space: nowrap; }
.notice-line button { display: inline-flex; align-items: center; gap: 3px; color: inherit; font-size: inherit;
  text-decoration: underline wavy rgba(139, 107, 74, .38) 1px; text-underline-offset: 4px; }
.notice-line button:hover { color: var(--clay); }
.notice-line i { font-style: normal; opacity: .45; }
.home .avatar { width: 41px; height: 43px; font-size: var(--fs-head); transition: transform .35s, background .35s; }
.avatar:hover { background: rgba(79, 107, 58, .24); transform: rotate(-4deg); }
.h-wheat { position: absolute; left: 0; right: 0; bottom: -6px; }

/* 开挖：原野轻轻往后退一步，让风把那把叶子带走 */
.home.diving .meadow { transform: translateY(-12px); opacity: 0; }
.home.diving .h-hero, .home.diving .top-nav { opacity: 0; transition: opacity .45s; }

.m-h { display: flex; align-items: center; gap: 9px; }
/* 撤掉这块地跟开挖不是一路人，靠在左边、离远一点 */
.uproot { margin-right: auto; display: inline-flex; align-items: center; gap: 5px; color: var(--ink-faint); }
.uproot:hover { color: var(--clay); }
.seed-modal { width: min(640px, 94vw); padding: 30px 38px 26px; }
.seed-modal .m-h { font-size: var(--fs-title); font-weight: normal; margin-bottom: 18px; }
.seed-modal .f-item { margin-bottom: 16px; }
.seed-modal input { font-size: var(--fs-read); }
.zone-pick { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px; }
.zone-pick button { display: inline-flex; align-items: center; gap: 8px; font-size: var(--fs-read); color: var(--tone, var(--ink-soft));
  padding: 6px 17px 7px; border-radius: var(--r-c); box-shadow: inset 0 0 0 1.3px color-mix(in srgb, var(--tone, #968564) 38%, transparent);
  transition: color .3s, background .3s, transform .3s; }
.zone-pick button:hover { transform: translateY(-2px); background: color-mix(in srgb, var(--tone, #968564) 9%, transparent); }
.zone-pick button.on { color: var(--tone, var(--grass-deep));
  box-shadow: inset 0 0 0 1.6px color-mix(in srgb, var(--tone, #4f6b3a) 64%, transparent);
  background: color-mix(in srgb, var(--tone, #4f6b3a) 12%, transparent); }
.seed-pick { display: flex; flex-wrap: wrap; gap: 11px 9px; margin: 10px 2px 4px; }
.pick { color: var(--tone, var(--wood)); padding: 5px; border-radius: 40% 55% 48% 52% / 52% 46% 54% 48%;
  transform: translate(var(--pdx), var(--pdy)) rotate(var(--prot)); transition: color .3s, background .3s, transform .3s; }
.pick:hover { color: var(--grass-deep); background: rgba(139, 107, 74, .1); }
.pick.on { color: var(--grass-deep); background: rgba(79, 107, 58, .14);
  transform: translate(var(--pdx), var(--pdy)) rotate(calc(var(--prot) - 4deg)) scale(1.12); }
/* 贴自己那张画：摆在头一个，选上了就压过手绘记号 */
.pick.up { --pdx: 0px; --pdy: 0px; --prot: -3deg; --tone: var(--ink-faint); line-height: 0;
  box-shadow: inset 0 0 0 1.2px dashed rgba(150, 133, 100, .5); }
.pick.up.on { box-shadow: inset 0 0 0 1.5px rgba(79, 107, 58, .6); }
.thumb { width: 38px; height: 38px; object-fit: cover; border-radius: 44% 56% 52% 48% / 52% 46% 54% 48%; }

/* 宽屏整根藤都铺得下，原野不滚动，页面也不跟着滚 */
@media (min-width: 1001px) {
  .meadow { overflow: hidden; }
}
/* 桌子窄一点时，藤不拆行，记号略收小，仍旧一路横着挂过去 */
@media (min-width: 1001px) and (max-width: 1199px) {
  .node { --fit: .9; }
}
@media (min-width: 1001px) and (max-width: 1100px) {
  .node { --fit: .82; }
}

/* 窄屏：藤竖起来，记号左右交替挂在藤上，树接在下面 */
@media (max-width: 1000px) {
  .top-nav { padding: max(10px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) 6px
    max(16px, env(safe-area-inset-left)); }
  .h-hero { padding: 10px 16px 2px; }
  .h-hero h1 { font-size: var(--fs-title); }
  .h-hero p { font-size: var(--fs-md); }
  .meadow { display: flex; flex-wrap: wrap; align-content: flex-start; justify-content: center;
    gap: 2px 6px; padding: 2px 3vw calc(14px + env(safe-area-inset-bottom)); cursor: default; }
  /* 藤先走完，树再接在下面；不再钉在窗口上压着类目 */
  .tree { position: relative; order: 2; flex: 0 0 auto; width: calc(260px * var(--tree-grow, 1) * var(--tree-boost, 1)); height: auto;
    margin: 12px auto 0 5vw; top: auto; bottom: auto; left: auto; opacity: .75; transform: none; }
  .tree:not(.tree-0) { left: auto; top: auto; bottom: auto; width: calc(210px * var(--tree-grow, 1) * var(--tree-boost, 1)); height: auto; margin: 22px 5vw 0 0; order: 2; }
  .shed { display: none; }
  /* 藤走满整行，两列记号顺着藤垂下来 */
  .vine-field { position: relative; inset: auto; flex: 0 0 100%; width: 100%; padding-top: 2px; }
  .vine-row { position: relative; left: auto !important; top: auto !important;
    width: min(620px, 92%) !important; height: auto; margin: 0 auto; padding: 10px 0 6px;
    display: grid; grid-template-columns: 1fr 1fr; column-gap: 84px; row-gap: 18px;
    align-items: center; }
  .vine-ink, .vine-tendril, .vine-sprig, .vine-flit { display: none; }
  .vine-down { display: block; position: absolute; inset: 0; width: 100%; height: 100%;
    overflow: visible; fill: none; stroke: var(--grass); stroke-width: 2.7; stroke-linecap: round;
    opacity: .7; filter: url(#boil-soft); }
  .vine-down path { vector-effect: non-scaling-stroke; }
  .vine-braid-down { stroke: var(--grass); stroke-width: 2; opacity: .9; }
  .vine-row.lit .vine-down { stroke: var(--grass-deep); opacity: .92; }
  .vm-leaf { display: inline-block; position: absolute; z-index: 1; opacity: .82;
    transform: translate(-50%, -50%) rotate(var(--rot)); pointer-events: none;
    animation: sprigSway var(--dur, 7s) ease-in-out var(--delay, 0s) infinite alternate; }
  .vm-flit { display: inline-block; position: absolute; z-index: 0; opacity: .85; pointer-events: none;
    transform: translate(-50%, -50%) rotate(var(--rot));
    animation: vineFlit var(--dur, 22s) ease-in-out var(--delay, 0s) infinite alternate; }
  .vm-flit :deep(svg) { transform-box: fill-box; transform-origin: center;
    animation: wingBeat 1.4s ease-in-out infinite alternate; }
  .node { left: auto !important; top: auto !important; position: relative;
    transform: rotate(var(--rot)) scale(var(--sc)); transform-origin: 50% 50%; }
  .node:not(.right) { grid-column: 1; justify-self: end; }
  .node.right { grid-column: 2; justify-self: start; }
  .node::before { content: ''; position: absolute; top: 50%; width: 42px; height: 1.5px;
    background: var(--grass); opacity: .5; pointer-events: none; }
  .node:not(.right)::before { right: -42px; }
  .node.right::before { left: -42px; }
  .stem { display: none; }
  .mist { position: static; order: -1; right: auto; transform: none; margin: 4px auto 0; }
  .mist:hover { transform: none; }
  /* 麦子收进队尾，别在中间压住类目 */
  .h-wheat { position: relative; order: 4; flex: 0 0 100%; height: 120px; bottom: auto; margin-top: -18px; }
}
@media (max-width: 620px) {
  .home .top-nav nav { width: 100%; justify-content: flex-start; }
  .notice-line { flex-wrap: wrap; white-space: normal; font-size: var(--fs-md); }
  .seed-modal { padding: 18px 16px 16px; }
  .seed-modal .m-h { font-size: var(--fs-head); white-space: normal; margin-bottom: 12px; }
  .seed-modal .f-item { margin-bottom: 11px; }
  .seed-modal input { font-size: var(--fs-base); }
  .zone-pick { gap: 6px; margin-top: 4px; }
  .zone-pick button { gap: 4px; font-size: var(--fs-sm); padding: 4px 7px 5px; }
  .zone-pick button :deep(.gl) { --s: 21px !important; }
  .seed-pick { gap: 6px 4px; margin: 7px 0 2px; }
  .pick { padding: 3px; }
  .pick :deep(.gl) { --s: 26px !important; }
  .thumb { width: 26px; height: 26px; }
  .seed-modal .m-acts { margin-top: 10px; }
}
@media (max-width: 420px) {
  .h-hero { padding: 6px 10px 0; }
  .h-hero h1 { font-size: var(--fs-head); letter-spacing: .06em; }
  .h-hero p { font-size: var(--fs-sm); line-height: 1.55; }
  .home .top-nav { padding-bottom: 2px; }
  .home .top-nav nav { gap: 7px; }
  .home .top-nav .night-link { font-size: var(--fs-md); }
  .home .avatar { width: 36px; height: 38px; }
  .tree { width: calc(230px * var(--tree-grow, 1) * var(--tree-boost, 1)); }
  .tree:not(.tree-0) { width: calc(190px * var(--tree-grow, 1) * var(--tree-boost, 1)); }
  .mist { font-size: var(--fs-sm); padding: 7px 11px 8px; }
}
</style>
