<script setup>
import { computed } from 'vue';
import { GROUND_CAP, WIND_CAP } from '../utils/grove';
import Glyph from './Glyph.vue';
import PlotSign from './PlotSign.vue';

// 种在地上和交给风的那些地：原野和别人的院子里用的是同一把种子、同一阵风
const props = defineProps({
  sessions: { type: Array, default: () => [] },
  roots: { type: Array, default: () => ['var(--tree-x)'] },
  bed: { type: Number, default: 460 },
  fresh: { type: Number, default: 0 }
});
const emit = defineEmits(['open']);

const TONES = ['var(--grass-deep)', 'var(--wood)', 'var(--grass)', 'var(--wheat)', 'var(--grass-deep)',
  'var(--sky)', 'var(--clay)', 'var(--wood)', 'var(--grass)', 'var(--lilac)', 'var(--grass-deep)', 'var(--sakura)'];
const hash = s => [...String(s)].reduce((h, c) => (h * 31 + c.codePointAt(0)) >>> 0, 7);

// 封存时选了「种在地上」的，就分回各自那棵树的根下，前前后后好几行，不挤一条田埂
const multi = computed(() => props.roots.length > 1);
const groundBeds = computed(() => {
  const roots = props.roots.length ? props.roots : ['var(--tree-x)'];
  const beds = roots.map(left => ({ left, list: [] }));
  props.sessions.filter(s => s.placement === 'ground').forEach(s => {
    const i = Number.isInteger(s.branch) && s.branch >= 0 && s.branch < beds.length ? s.branch : 0;
    beds[i].list.push(s);
  });
  return beds.map(b => ({
    ...b,
    // 一块根只留十五棵，超出的不再冒头，但字都还在服务器上
    list: b.list.slice(0, GROUND_CAP),
    w: Math.min(multi.value ? 700 : 1100,
      props.bed + Math.max(0, b.list.length - 4) * (multi.value ? 46 : 160))
  }));
});
function groundStyle(s, i, n) {
  const step = n > 1 ? 94 / (n - 1) : 0;
  const h = hash(s.id + s.title);
  const lane = (h >>> 9) % 5;
  return {
    left: (n > 1 ? 6 + i * step + (h >>> 19) % 45 / 10 - 2.2 : 50) + '%',
    '--dy': ([-46, -16, 10, 34, 54][lane] + (h >>> 27) % 14 - 6.5) + 'px',
    '--rot': ((h >>> 7) % 11 - 5) / 3 + 'deg',
    '--tone': TONES[(h >>> 13) % TONES.length],
    '--in': (.35 + (h >>> 21) % 150 / 100).toFixed(2) + 's'
  };
}
// 地上只长草木瓜果：土里冒不出猫狗和石头
const GROUND_PLANT = ['leaf', 'sprout', 'plant', 'pine', 'potted-plant', 'autumn-tree',
  'blossom', 'daisy', 'sakura', 'flower', 'tulip', 'rose', 'sunflower', 'flower',
  'dandelion', 'dandelion-seed', 'corn', 'pumpkin', 'maple-leaf', 'falling-leaves'];
const groundGlyph = s => GROUND_PLANT[hash('g' + s.id + s.title) % GROUND_PLANT.length];
const plantGlyph = s => GROUND_PLANT.includes(groundGlyph(s));
// 一株一个样：有的刚冒头，有的已经长到腰高，叶子大小和茎的长短都不齐
const seedSize = s => 42 + hash('gs' + s.id + s.title) % 18;
const stemH = s => 16 + Math.min(8, s.level || 1) * 3 + hash('gh' + s.id + s.title) % 22;

// 风里什么都吹得动：草叶、花、菜畦里的瓜菜，还有瓢虫、蝴蝶和跑过田埂的小兽
const WIND_GLYPH = ['leaf', 'leaf', 'sprout', 'plant', 'maple-leaf', 'falling-leaves', 'pine',
  'blossom', 'blossom', 'cherry-blossom', 'sakura', 'flower', 'daisy', 'sunflower', 'tulip', 'rose',
  'dandelion', 'dandelion', 'dandelion-seed', 'dandelion-seed', 'dandelion-seed',
  'corn', 'pumpkin', 'carrot', 'tomato', 'eggplant', 'cabbage',
  'ladybug', 'ladybug', 'ladybug-gold', 'ladybug-gold', 'butterfly', 'butterfly', 'fly', 'bird',
  'rabbit', 'cat', 'dog', 'fish', 'spider', 'turkey', 'clouds', 'rain', 'snowflake'];
// 瓜菜和瓢虫照它们本来的颜色长，别的随风换色
const WIND_TONE = {
  ladybug: 'var(--ember)', 'ladybug-gold': 'var(--wheat)', carrot: 'var(--clay)', tomato: 'var(--ember)',
  eggplant: 'var(--lilac)', cabbage: 'var(--grass)', corn: 'var(--wheat)', pumpkin: 'var(--clay)'
};
// 风里一共留二百片；旧地里多出来的不再飘上来，但也不删人家的字
// 风没有篱笆，从这一头到那一头，连题头和导航上头都能歇脚
const windy = computed(() => props.sessions
  .filter(s => s.placement === 'wind')
  .sort((a, b) => a.id - b.id)
  .slice(-WIND_CAP)
  .map(s => {
    const h = hash('w' + s.id + s.title);
    const k = h % 3;
    const left = 2 + (h >>> 4) % 96;
    const glyph = WIND_GLYPH[(h >>> 5) % WIND_GLYPH.length];
    return {
      s,
      glyph,
      tone: WIND_TONE[glyph] || TONES[(h >>> 15) % TONES.length],
      left,
      top: 2 + (h >>> 13) % 91,
      rot: (h >>> 9) % 70 - 35,
      size: 38 + (h >>> 17) % 13,
      dx: 30 + (h >>> 19) % 50,
      dy: 20 + (h >>> 23) % 36,
      dur: ([24, 31, 39][k] + (h >>> 26) % 7) / 3,
      delay: -((h >>> 3) % 14),
      in: (.25 + (h >>> 1) % 90 / 100).toFixed(2) + 's',
      mate: ['fly', 'butterfly', 'bird', 'sakura', 'dandelion-seed', 'daisy',
        'leaf', 'dandelion', 'sunflower', 'clouds'][(h >>> 28) % 10],
      mateSize: 12 + (h >>> 30) % 5,
      mateDur: (8 + (h >>> 24) % 7) / 3,
      mateDelay: -((h >>> 21) % 9),
      align: left > 74 ? 'right' : left < 18 ? 'left' : 'center'
    };
  }));
const windStyle = w => ({
  left: w.left + '%', top: w.top + '%', '--rot': w.rot + 'deg', '--tone': w.tone,
  '--dx': w.dx + 'px', '--dy': w.dy + 'px', '--dur': w.dur + 's', '--delay': w.delay + 's',
  '--in': w.in, '--mdur': w.mateDur + 's', '--mdelay': w.mateDelay + 's'
});
const airLife = [
  { glyph: 'sakura', size: 21, left: 58, top: 23, color: 'var(--sakura)', rot: 12, dx: 52, dy: 24, dur: 22, delay: -8 },
  { glyph: 'dandelion-seed', size: 20, left: 48, top: 34, color: 'var(--dry)', rot: -12, dx: 40, dy: 26, dur: 24, delay: -17 },
  { glyph: 'fly', size: 19, left: 73, top: 45, color: 'var(--clay)', rot: -8, dx: 38, dy: 30, dur: 18, delay: -15 },
  { glyph: 'butterfly', size: 20, left: 44, top: 53, color: 'var(--lilac)', rot: -6, dx: 44, dy: -18, dur: 19, delay: -11 },
  { glyph: 'bird', size: 25, left: 88, top: 17, color: 'var(--wood)', rot: 0, dx: 30, dy: 16, dur: 27, delay: -23 },
  { glyph: 'dandelion', size: 20, left: 81, top: 61, color: 'var(--wheat)', rot: 18, dx: 30, dy: 18, dur: 20, delay: -7 },
  { glyph: 'leaf', size: 18, left: 64, top: 57, color: 'var(--grass-deep)', rot: 22, dx: 58, dy: -22, dur: 21, delay: -4 }
];
const airStyle = (a, i) => ({
  left: a.left + '%', top: a.top + '%', color: a.color,
  '--rot': a.rot + 'deg', '--dx': a.dx + 'px', '--dy': a.dy + 'px',
  '--dur': (a.dur / 3).toFixed(2) + 's', '--delay': a.delay + 's',
  '--in': (.45 + i * .16).toFixed(2) + 's'
});
</script>

<template>
  <div class="gw">
    <div v-for="(bed, k) in groundBeds" :key="'bed' + k" class="ground-bed"
      :style="{ '--bed-w': bed.w + 'px', '--bed-max': multi ? '52vw' : '86vw', '--root-left': bed.left }">
      <button v-for="(s, i) in bed.list" :key="'g' + s.id" class="ground-seed"
        :class="{ fresh: fresh === s.id }" :data-id="s.id"
        :style="groundStyle(s, i, bed.list.length)" :aria-label="s.title" @click.stop="emit('open', s)">
        <Glyph :name="groundGlyph(s)" :size="seedSize(s)"/>
        <svg v-if="plantGlyph(s)" class="g-vine" :style="{ height: stemH(s) + 'px' }"
          viewBox="0 0 12 56" preserveAspectRatio="none" aria-hidden="true">
          <path d="M6 56 C 3.4 44, 8.4 32, 5.2 20 C 4.2 14, 5.6 8, 6 2"/>
          <path class="g-shoot" d="M5.4 38 C 2 33, 1.6 28, 2.6 24"/>
          <path class="g-root" d="M6 56 C 2.6 54.8, 1.2 52.4, 1 49.6 M6 56 C 9.4 54.8, 10.8 52.4, 11 49.6"/>
        </svg>
        <PlotSign class="seed-sign" :text="s.title"/>
      </button>
    </div>

    <button v-for="w in windy" :key="'w' + w.s.id" class="wind-seed"
      :class="{ fresh: fresh === w.s.id }" :data-id="w.s.id" :style="windStyle(w)"
      :aria-label="w.s.title" @click.stop="emit('open', w.s)">
      <svg class="wind-wisp" viewBox="0 0 76 26" aria-hidden="true">
        <path d="M2 19 C 18 9, 33 24, 48 14 C 58 7, 67 10, 74 5"/>
        <path d="M13 10 C 25 3, 37 12, 50 6"/>
      </svg>
      <span class="wind-body">
        <Glyph :name="w.glyph" :size="w.size"/>
        <i class="pollen p1"/><i class="pollen p2"/>
      </span>
      <Glyph class="wind-mate" :name="w.mate" :size="w.mateSize"/>
      <PlotSign class="seed-sign" :text="w.s.title" :align="w.align"/>
    </button>

    <Glyph v-for="(a, i) in airLife" :key="'air' + i" class="air-life" :class="a.glyph"
      :name="a.glyph" :size="a.size" :boil="false" :style="airStyle(a, i)" aria-hidden="true"/>
  </div>
</template>

<style scoped>
/* 不另起一层盒子：地仍旧贴着原野/院子的树根，跟从前的百分比一致 */
.gw { display: contents; }

/* 树根下的一条土带：地就沿着这条线一棵一棵点下去，不另起一行 */
.ground-bed { --w: min(var(--bed-w, 460px), var(--bed-max, 58vw), 100%);
  position: absolute; top: calc(100% - var(--tree-lift));
  left: clamp(calc(var(--w) / 2), calc(var(--root-left, var(--tree-x)) + var(--grove-x, 0px)), calc(100% - var(--w) / 2));
  width: var(--w); height: 0; transform: translateX(-50%); z-index: 16; pointer-events: none; }
/* 花和叶子从土里抽藤，藤有多长看这块地挖到了第几层；小虫和猫狗就贴地待着 */
.ground-seed { position: absolute; bottom: calc(var(--dy) - 2px); transform: translateX(-50%) rotate(var(--rot));
  display: inline-flex; flex-direction: column; align-items: center; justify-content: flex-end;
  min-width: 50px; min-height: 50px; gap: 0; color: var(--tone, var(--grass-deep));
  pointer-events: auto; isolation: isolate; transition: transform .4s, color .4s; }
/* 刷新时地里的东西不一起冒头，按自己的时辰从土里顶出来 */
.ground-seed :deep(.gl) { transform-origin: 50% 100%; animation: sproutIn .9s cubic-bezier(.2, .8, .3, 1) var(--in) backwards; }
.g-vine { display: block; width: 18px; margin-top: -3px; overflow: visible; color: var(--grass-deep);
  transform-origin: 50% 100%; animation: stemGrow 1.2s cubic-bezier(.3, .7, .3, 1) calc(var(--in) + .18s) backwards; }
.g-vine path { fill: none; stroke: currentColor; stroke-width: 2.8; stroke-linecap: round;
  vector-effect: non-scaling-stroke; opacity: .62; }
.g-vine .g-shoot { stroke: var(--grass); stroke-width: 2.4; opacity: .55; }
.g-vine .g-root { stroke-width: 3; opacity: .5; }
.ground-seed::before { content: ''; position: absolute; bottom: -3px; left: 50%; width: 30px; height: 7px;
  margin-left: -15px; border-radius: 50%; background: rgba(120, 96, 62, .2); z-index: -1; }
/* 牌上的字比正文小三号：宽屏十七，窄屏十六，不跟着字号倍率再放大 */
.seed-sign :deep(.board) { font-size: 17px; }
.ground-seed .seed-sign { top: calc(100% + 2px); opacity: 0; visibility: hidden; translate: 0 3px;
  transition: opacity .35s, translate .35s, visibility .35s; }
.ground-seed:hover { z-index: 12; transform: translateX(-50%) rotate(0deg) translateY(-3px); color: var(--wood); }
.ground-seed:hover .seed-sign, .ground-seed:focus-visible .seed-sign {
  opacity: 1; visibility: visible; translate: 0 0; }

/* 风里的那些：不拴在田里，整扇窗子都是它的路，题头上头也去得 */
.wind-seed { position: fixed; z-index: 17; display: inline-flex; align-items: center; gap: 3px;
  color: var(--tone, rgba(139, 107, 74, .9)); filter: drop-shadow(0 3px 3px rgba(94, 83, 64, .14));
  transform-origin: 50% 70%; animation: windAppear .85s ease-out var(--in) backwards; }
/* 只有记号跟着风转，牌子钉在原地，始终是平的 */
.wind-body { position: relative; display: inline-flex; transform: rotate(var(--rot));
  animation: windFloat var(--dur) ease-in-out var(--delay) infinite; }
/* 风过留痕：一道很淡的弧，从记号旁边抽出去 */
.wind-wisp { position: absolute; right: calc(100% - 3px); top: 50%; width: 48px; height: 22px;
  margin-top: -11px; overflow: visible; fill: none; stroke: var(--sky); stroke-width: 1.1;
  stroke-linecap: round; opacity: .32; pointer-events: none; }
.wind-wisp path { stroke-dasharray: 30 13; animation: wisp 3s linear infinite; }
/* 跟着飘的花粉、碎叶：不是装饰框，是风里本来就有的东西 */
.pollen { position: absolute; width: 4px; height: 4px; border-radius: 50%; background: var(--wheat);
  opacity: 0; pointer-events: none; animation: pollen 1.95s ease-in-out infinite; }
.pollen.p1 { left: -9px; top: -6px; }
.pollen.p2 { right: -10px; bottom: -4px; width: 3px; height: 3px; background: var(--sakura);
  animation-delay: -.8s; animation-duration: 2.4s; }
/* 一只小虫绕着它飞：田园里没有一样东西是悬着不动的 */
.wind-mate { position: absolute; left: -13px; top: -11px; color: var(--clay); opacity: .68;
  transform-origin: 60% 60%; pointer-events: none;
  animation: windMate var(--mdur) ease-in-out var(--mdelay) infinite alternate; }
.wind-mate :deep(svg) { transform-box: fill-box; transform-origin: center;
  animation: wingBeat 1.1s ease-in-out infinite alternate; }
.wind-seed .seed-sign { top: calc(100% + 2px);
  opacity: 0; visibility: hidden; translate: 0 3px;
  transition: opacity .35s, translate .35s, visibility .35s; }
.wind-seed:hover { z-index: 12; color: var(--wood); }
.wind-seed:hover .seed-sign, .wind-seed:focus-visible .seed-sign {
  opacity: 1; visibility: visible; translate: 0 0; }
/* 刚从封存里种回来：虚线绕一圈，牌子也亮出来 */
.ground-seed.fresh, .wind-seed.fresh { z-index: 19; color: var(--wood); }
.ground-seed.fresh .seed-sign, .wind-seed.fresh .seed-sign {
  opacity: 1; visibility: visible; translate: 0 0; }
.ground-seed.fresh::after, .wind-seed.fresh::after {
  content: ''; position: absolute; inset: -9px; border-radius: 50%;
  border: 1.3px dashed color-mix(in srgb, var(--wood) 55%, transparent);
  pointer-events: none; animation: findRing 1.4s ease-in-out infinite alternate; }
@keyframes findRing { from { opacity: .2; transform: scale(.94); } to { opacity: .85; transform: scale(1.02); } }
@keyframes windFloat {
  0%, 100% { transform: translate(0, 0) rotate(var(--rot)) scale(1); }
  17% { transform: translate(calc(var(--dx) * .42), calc(var(--dy) * -.55)) rotate(calc(var(--rot) + 7deg)) scale(1.04); }
  39% { transform: translate(calc(var(--dx) * .86), calc(var(--dy) * .24)) rotate(calc(var(--rot) - 4deg)) scale(.97); }
  58% { transform: translate(calc(var(--dx) * .28), calc(var(--dy) * .82)) rotate(calc(var(--rot) + 11deg)) scale(1.05); }
  79% { transform: translate(calc(var(--dx) * -.34), calc(var(--dy) * .36)) rotate(calc(var(--rot) - 8deg)) scale(.98); }
}
@keyframes wisp { to { stroke-dashoffset: -86; } }
@keyframes pollen {
  0%, 100% { opacity: 0; transform: translate(0, 0) scale(.6); }
  22% { opacity: .75; }
  68% { opacity: .38; transform: translate(13px, -11px) scale(1.1); }
  90% { opacity: 0; transform: translate(21px, -3px) scale(.7); }
}
@keyframes windMate {
  from { transform: translate(0, 0) rotate(-14deg) scale(.92); }
  40% { transform: translate(9px, -8px) rotate(10deg) scale(1.05); }
  to { transform: translate(-4px, 9px) rotate(22deg) scale(.96); }
}
/* 天上零散的小东西：不跟风里的地抢位置，自己飘自己的 */
.air-life { position: absolute; z-index: 17; opacity: .6; pointer-events: none; transform-origin: 50% 70%;
  animation: airDrift var(--dur) ease-in-out var(--delay) infinite alternate,
    airAppear .9s ease-out var(--in) backwards; }
.air-life.fly :deep(svg), .air-life.butterfly :deep(svg) { transform-box: fill-box; transform-origin: center;
  animation: wingBeat 1.15s ease-in-out infinite alternate; }
@keyframes airDrift {
  from { transform: translate(0, 0) rotate(var(--rot)) scale(.94); }
  52% { transform: translate(calc(var(--dx) * .58), calc(var(--dy) * -.72)) rotate(calc(var(--rot) + 24deg)) scale(1.06); }
  to { transform: translate(var(--dx), var(--dy)) rotate(calc(var(--rot) + 46deg)) scale(.97); }
}
@keyframes sproutIn {
  from { opacity: 0; transform: scale(.06) translateY(3px); }
  to { opacity: 1; transform: none; }
}
@keyframes stemGrow {
  from { transform: scaleY(.04); }
  to { transform: scaleY(1); }
}
@keyframes windAppear {
  from { opacity: 0; scale: .12; }
  to { opacity: 1; scale: 1; }
}
@keyframes airAppear {
  from { opacity: 0; scale: .2; }
  to { opacity: .6; scale: 1; }
}
@keyframes wingBeat { from { transform: scaleX(1); } to { transform: scaleX(.78); } }

/* 天黑：地里和风里的记号退进月色，但不沉成黑块，月照到哪儿哪儿还认得出 */
body[data-night="1"] .ground-seed { color: color-mix(in srgb, var(--tone, var(--grass-deep)) 58%, #B9C4B4); }
body[data-night="1"] .ground-seed :deep(.gl) { opacity: .72; filter: brightness(.78) saturate(.62); }
body[data-night="1"] .ground-seed::before { background: rgba(8, 14, 12, .26); }
body[data-night="1"] .g-vine { color: #53625B; }
body[data-night="1"] .wind-seed { color: color-mix(in srgb, var(--tone, var(--wood)) 48%, #AEB9AC); }
body[data-night="1"] .wind-seed :deep(.gl) { opacity: .68; filter: brightness(.74) saturate(.58); }
body[data-night="1"] .wind-wisp { opacity: .22; }
body[data-night="1"] .air-life { opacity: .34; filter: brightness(.68) saturate(.55); }

/* 窄屏：别再按百分比往画布上钉，改成一行行散落着贴，怎么缩都不重叠 */
@media (max-width: 1000px) {
  .ground-bed { position: relative; left: auto; top: auto; bottom: auto;
    width: 260px; height: auto; margin: -30px auto 0 5vw; transform: none;
    display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: center; gap: 0 6px; }
  .ground-seed { position: static; transform: rotate(var(--rot)); }
  .ground-seed:hover { transform: rotate(0deg) translateY(-3px); }
  /* 手机屏放不下整片风：只留一小把，缩成花粉那么轻，落在字和树的后头 */
  .wind-seed { opacity: .58; z-index: 1; }
  .seed-sign :deep(.board) { font-size: 16px; }
  .wind-seed:nth-of-type(n+25) { display: none; }
  .wind-seed :deep(.gl) { --s: 20px !important; }
  .wind-wisp, .wind-mate { display: none; }
}
</style>
