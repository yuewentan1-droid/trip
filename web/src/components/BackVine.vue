<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { iconUri } from '../icons';
import { useUser } from '../store/user';
import Toss from './Toss.vue';

const props = defineProps({ to: { type: String, default: '/' } });
const router = useRouter();
const user = useUser();
const gust = ref(null);
const blowing = ref(false);
const backName = props.to === '/' ? '回原野' : props.to === '/visits' ? '回串门' : '回我的田地';

// 木牌只给头一回进院的人看；之后藤上只留一个小结，别挡住左边那溜
const tipKey = user.user?.username ? 'bvineTip:' + user.user.username : '';
const showTag = ref(!!tipKey && localStorage.getItem(tipKey) === '1');

// 五根藤从左上角垂下来，一根绕着一根走，没有哪一根是直的
const VINES = [
  { d: 'M58 -4 C 30 44, 82 78, 52 118 C 24 155, 78 192, 46 230 C 18 264, 64 302, 38 338 C 18 368, 46 402, 28 456', w: 1.8, o: .6 },
  { d: 'M68 -4 C 92 38, 48 76, 74 114 C 98 151, 54 186, 78 224 C 100 258, 56 292, 82 330 C 102 362, 68 400, 90 456', w: 1.3, o: .48 },
  { d: 'M46 -4 C 34 36, 58 62, 44 96 C 28 134, 54 158, 40 196 C 24 238, 50 268, 36 306 C 22 342, 44 368, 30 414 C 22 438, 32 450, 26 460', w: 1.2, o: .42 },
  { d: 'M80 -4 C 60 30, 90 58, 70 92 C 48 128, 78 156, 58 190 C 38 226, 66 252, 50 288 C 32 326, 60 354, 42 390 C 30 414, 44 438, 38 460', w: 1.55, o: .52 },
  { d: 'M52 16 C 70 52, 38 82, 58 120 C 78 158, 42 188, 62 228 C 80 264, 46 298, 64 336 C 78 364, 52 396, 56 442', w: 1.1, o: .38 }
];
const LEAVES = [
  { x: 32, y: 48, s: 21, rot: -42, g: 'leaf', c: '#4F6B3A' },
  { x: 75, y: 68, s: 18, rot: 38, g: 'sprout', c: '#7E9A5F' },
  { x: 48, y: 104, s: 23, rot: -24, g: 'leaf', c: '#4F6B3A' },
  { x: 88, y: 132, s: 16, rot: 48, g: 'sakura', c: '#C09384' },
  { x: 38, y: 164, s: 19, rot: -50, g: 'leaf', c: '#7E9A5F' },
  { x: 66, y: 204, s: 22, rot: 26, g: 'daisy', c: '#C9A24B' },
  { x: 30, y: 238, s: 17, rot: -38, g: 'sprout', c: '#7E9A5F' },
  { x: 84, y: 272, s: 18, rot: 44, g: 'leaf', c: '#4F6B3A' },
  { x: 46, y: 306, s: 21, rot: -30, g: 'tulip', c: '#B07A55' },
  { x: 70, y: 348, s: 16, rot: 52, g: 'leaf', c: '#4F6B3A' },
  { x: 34, y: 382, s: 19, rot: -44, g: 'sprout', c: '#7E9A5F' },
  { x: 58, y: 420, s: 16, rot: 30, g: 'rose', c: '#B07A55' }
].map((l, i) => ({
  ...l,
  uri: iconUri(l.g, l.c),
  dur: 11 + i % 5 * 2.3,
  delay: -(i * 1.7)
}));
const FLITS = [
  { x: 62, y: 86, s: 18, rot: -8, dur: 22, delay: -4, c: '#8B6B4A' },
  { x: 40, y: 270, s: 14, rot: 12, dur: 27, delay: -13, c: '#B07A55' }
].map((f, i) => ({ ...f, uri: iconUri('fly', f.c), delay: f.delay - i }));

function leave(e) {
  if (blowing.value) return;
  if (tipKey) localStorage.removeItem(tipKey);
  showTag.value = false;
  const r = e.currentTarget.getBoundingClientRect();
  gust.value = { x: e.clientX || r.left + r.width / 2, y: e.clientY || r.top + 20 };
  blowing.value = true;
}
</script>

<template>
  <div class="bvine" :class="{ blowing }">
    <button class="bvine-hit" :class="{ 'has-tag': showTag }" :title="'顺着藤蔓' + backName"
      :aria-label="backName" @click="leave">
      <i class="bvine-knot"/>
      <span v-if="showTag" class="bvine-tag">{{ backName }}</span>
    </button>
    <svg class="bvine-ink" viewBox="0 0 120 460" preserveAspectRatio="none" aria-hidden="true" @click="leave">
      <g v-for="(v, i) in VINES" :key="i" class="bvine-strand" :style="{ '--d': i * -2.1 + 's' }">
        <path :d="v.d" :style="{ strokeWidth: v.w, opacity: v.o }"/>
      </g>
      <!-- 藤蔓本身接人的手：顺着茎和叶点，空白处照常滚页面 -->
      <g class="bvine-hand">
        <path v-for="(v, i) in VINES" :key="'h' + i" :d="v.d"/>
      </g>
    </svg>
    <span v-for="(l, i) in LEAVES" :key="'l' + i" class="bvine-leaf"
      :style="{ left: l.x / 1.2 + '%', top: l.y / 4.6 + '%', width: l.s + 'px', height: l.s + 'px',
        '--dur': l.dur + 's', '--delay': l.delay + 's', '--r': l.rot + 'deg' }" @click="leave">
      <img :src="l.uri" alt=""/>
    </span>
    <span v-for="(f, i) in FLITS" :key="'f' + i" class="bvine-flit"
      :style="{ left: f.x / 1.2 + '%', top: f.y / 4.6 + '%', width: f.s + 'px', height: f.s + 'px',
        '--dur': f.dur + 's', '--delay': f.delay + 's', '--r': f.rot + 'deg' }">
      <img :src="f.uri" alt=""/>
    </span>
    <Toss v-if="gust" :x="gust.x" :y="gust.y" @done="router.push(to)"/>
  </div>
</template>

<style scoped>
/* 回原野不摆箭头：五根藤缠着从左上垂下来，风一过整把叶子一起摇 */
.bvine { position: absolute; left: 0; top: 0; z-index: 20; width: clamp(88px, 8.4vw, 132px);
  height: 100%; color: var(--wood); transform-origin: 32% 0;
  pointer-events: none;
  animation: bvineSway 23s ease-in-out -7s infinite; }
/* 藤还是整幅垂着；木牌和小结留在梢上，给键盘和头一回进院的人一个明确的落点 */
.bvine-hit { position: absolute; left: 6px; top: calc(env(safe-area-inset-top) + 66px); z-index: 3;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 4px 2px 7px; color: inherit; pointer-events: auto; -webkit-tap-highlight-color: transparent; }
/* 木牌收起来后只剩藤梢上这个小结，给个刚好够手指的地方，别让整幅藤接人的手 */
.bvine-hit:not(.has-tag) { min-width: 30px; min-height: 36px; justify-content: center; }
.bvine-knot { width: 7px; height: 10px; border-radius: 88% 12% 88% 12%;
  background: var(--grass-deep); opacity: .62; transform: rotate(-24deg); }
.bvine-tag { writing-mode: vertical-rl; padding: 7px 3px 8px; font-size: var(--fs-xs);
  letter-spacing: 4px; line-height: 1; color: inherit;
  background: color-mix(in srgb, var(--paper) 74%, transparent);
  border-radius: 3px 11px 4px 10px / 10px 4px 11px 5px;
  box-shadow: inset 0 0 0 1px rgba(150, 133, 100, .34);
  transition: background .3s, box-shadow .3s, color .3s; }
.bvine-ink { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
.bvine-strand path { fill: none; stroke: currentColor; stroke-linecap: round; filter: url(#boil-soft);
  vector-effect: non-scaling-stroke;
  animation: strandSway 17s ease-in-out var(--d, 0s) infinite alternate; transform-origin: 50% 0; }
.bvine-strand:nth-child(2n) path { stroke: var(--grass-deep); }
.bvine-strand:nth-child(3n) path { stroke: var(--grass); }
/* 藤茎铺一条透明的抓手，只有茎和叶接人的手，藤外的空白还能滚 */
.bvine-hand path { fill: none; stroke: transparent; stroke-width: 20; stroke-linecap: round;
  vector-effect: non-scaling-stroke; pointer-events: stroke; cursor: pointer; }
/* 叶片和飞虫挂在藤上，不跟着藤一道拉长，只在自己的位置上摇 */
.bvine-leaf, .bvine-flit { position: absolute; translate: -50% -50%; transform-origin: center;
  pointer-events: none; }
.bvine-leaf img, .bvine-flit img { display: block; width: 100%; height: 100%; object-fit: contain;
  transform: rotate(var(--r, 0deg)); }
.bvine-leaf { pointer-events: auto; cursor: pointer;
  animation: bvineLeaf var(--dur, 13s) ease-in-out var(--delay, 0s) infinite alternate; }
.bvine-flit { animation: bvineFlit var(--dur, 22s) ease-in-out var(--delay, 0s) infinite alternate; }
.bvine:has(.bvine-hit:hover), .bvine:has(.bvine-hand path:hover), .bvine:has(.bvine-leaf:hover) { color: var(--clay); }
.bvine:has(.bvine-hit:hover) .bvine-strand path,
.bvine:has(.bvine-hand path:hover) .bvine-strand path,
.bvine:has(.bvine-leaf:hover) .bvine-strand path { stroke: var(--clay); }
.bvine-hit:hover .bvine-tag { background: color-mix(in srgb, var(--paper) 92%, transparent);
  box-shadow: inset 0 0 0 1px rgba(139, 107, 74, .58); }
.bvine-hit:active .bvine-tag { transform: translateY(1px) rotate(-1deg); }

/* 点下去先起一阵风：藤甩一下，叶和花被卷走，人才跟着风回原野 */
.bvine.blowing { animation: bvineGust .75s cubic-bezier(.3, .8, .3, 1) forwards; }
.bvine.blowing .bvine-strand path { animation: strandWhip .7s cubic-bezier(.3, .8, .3, 1) forwards; }
.bvine.blowing .bvine-leaf { animation: leafBlow .9s ease-out forwards; }
.bvine.blowing .bvine-flit { animation: flitBlow .8s ease-out forwards; }

@keyframes bvineSway {
  0%, 100% { transform: rotate(-.3deg) translateX(0); }
  23% { transform: rotate(.7deg) translateX(2px); }
  49% { transform: rotate(-.12deg) translateX(-1px); }
  72% { transform: rotate(.52deg) translateX(3px); }
  89% { transform: rotate(.1deg) translateX(1px); }
}
@keyframes strandSway {
  from { transform: rotate(-.9deg); }
  to { transform: rotate(1.1deg); }
}
@keyframes bvineLeaf {
  0%, 100% { transform: rotate(-6deg) translateY(0); }
  34% { transform: rotate(5deg) translateY(-2px); }
  69% { transform: rotate(-2deg) translateY(1px); }
  86% { transform: rotate(9deg) translateY(-1px); }
}
@keyframes bvineFlit {
  from { transform: translate(-4px, 2px) rotate(-8deg) scaleX(.92); }
  to { transform: translate(5px, -5px) rotate(10deg) scaleX(1.06); }
}
@keyframes bvineGust {
  0% { transform: rotate(0) skewX(0); }
  30% { transform: rotate(2.4deg) skewX(-2deg); }
  58% { transform: rotate(-1.6deg) skewX(1.4deg); }
  100% { transform: rotate(1.2deg) skewX(-.6deg); opacity: .8; }
}
@keyframes strandWhip {
  0% { transform: rotate(0); }
  35% { transform: rotate(4deg); }
  65% { transform: rotate(-3deg); }
  100% { transform: rotate(2deg); }
}
@keyframes leafBlow {
  0% { transform: translate(0, 0) rotate(0); opacity: 1; }
  55% { transform: translate(30px, -20px) rotate(46deg); opacity: .85; }
  100% { transform: translate(96px, -48px) rotate(128deg); opacity: 0; }
}
@keyframes flitBlow {
  0% { transform: translate(0, 0) rotate(0); opacity: 1; }
  100% { transform: translate(70px, -54px) rotate(60deg); opacity: 0; }
}

@media (max-width: 720px) {
  .bvine { width: 56px; }
  .bvine-hit { left: 3px; top: calc(env(safe-area-inset-top) + 58px); gap: 2px; }
  .bvine-tag { font-size: calc(var(--fs-xs) - 3px); letter-spacing: 2px; padding: 6px 2px 7px; }
  .bvine-leaf { scale: .8; }
  .bvine-flit { display: none; }
}
</style>
