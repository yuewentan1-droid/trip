<script setup>
import Glyph from './Glyph.vue';

// 星子、月亮和落叶都按自己的性子走，不排成一张表
const hash = (n, s) => {
  let h = n * 374761393 + s * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
// 星星分远近两层：远天只剩灰白一点，近处才亮，亮的那几颗带一圈晕
const stars = Array.from({ length: 54 }, (_, i) => {
  const far = hash(i, 9) < .62;
  const size = far ? 3.4 + hash(i, 3) * 4.8 : 6 + hash(i, 3) * 9;
  const high = hash(i, 8) < .72;
  return {
    left: (high ? 42 + hash(i, 1) * 56 : 2 + hash(i, 1) * 64) + 'vw',
    top: (high ? 2 + hash(i, 2) * 50 : 7 + hash(i, 2) * 70) + 'vh',
    w: size.toFixed(1) + 'px',
    dur: (6 + hash(i, 4) * 9).toFixed(1) + 's',
    delay: (-hash(i, 5) * 16).toFixed(1) + 's',
    o: (far ? .14 + hash(i, 6) * .24 : .38 + hash(i, 6) * .42).toFixed(2),
    rot: ((hash(i, 7) * 40) - 20).toFixed(0) + 'deg',
    far,
    glow: !far && hash(i, 10) > .58
  };
});
// 碎星屑比星子还小，铺在远天，给夜空留一点颗粒
const dust = Array.from({ length: 62 }, (_, i) => ({
  left: (hash(i, 21) * 100).toFixed(2) + '%',
  top: (hash(i, 22) * 84).toFixed(2) + '%',
  s: (1 + hash(i, 23) * 1.7).toFixed(1) + 'px',
  o: (.1 + hash(i, 24) * .28).toFixed(2)
}));
const leaves = Array.from({ length: 5 }, (_, i) => ({
  left: (4 + hash(i, 11) * 92) + 'vw',
  glyph: ['leaf', 'maple-leaf', 'autumn-tree', 'leaf', 'sakura'][i],
  size: 11 + Math.round(hash(i, 12) * 9),
  dur: (34 + hash(i, 13) * 26).toFixed(0) + 's',
  delay: (-hash(i, 14) * 50).toFixed(1) + 's',
  sway: (14 + hash(i, 15) * 40).toFixed(0) + 'px'
}));
// 流星划得快：一颗只在半秒上下走完，尾巴拖在身后，方向和长短各不一样
const meteors = [
  { left: '84%', top: '5%', period: '19s', delay: '3s', dx: '-46vw', dy: '24vh', angle: '-27deg', len: '170px' },
  { left: '63%', top: '12%', period: '29s', delay: '13s', dx: '-38vw', dy: '21vh', angle: '-32deg', len: '145px' },
  { left: '76%', top: '2%', period: '41s', delay: '24s', dx: '-30vw', dy: '17vh', angle: '-24deg', len: '120px' }
];
</script>

<template>
  <div class="night-sky" aria-hidden="true">
    <svg class="defs"><defs>
      <path id="cloud-puff" d="M6 80 C-4 64 4 46 24 44 C24 26 42 14 60 20 C68 4 94 0 108 14 C120 -2 148 0 156 18 C178 14 196 28 194 48 C212 52 218 68 208 80 C200 88 180 86 166 84 L28 84 C14 84 8 83 6 80 Z"/>
      <path id="cloud-rim" d="M6 80 C-4 64 4 46 24 44 C24 26 42 14 60 20 C68 4 94 0 108 14 C120 -2 148 0 156 18 C178 14 196 28 194 48 C212 52 218 68 208 80"/>
    </defs></svg>
    <div class="sky-wash"/>
    <div class="moon-cast"/>

    <!-- 月亮后头先压一层远云，再让月亮从云缝里探出来 -->
    <div class="veil back">
      <svg viewBox="0 0 600 190" preserveAspectRatio="none">
        <use class="body" href="#cloud-puff" transform="translate(18 58) scale(1.45 1.05)"/>
        <use class="body soft" href="#cloud-puff" transform="translate(34 76) scale(1.3 .8)"/>
        <use class="body" href="#cloud-puff" transform="translate(318 36) scale(1.25 1.15)"/>
        <use class="rim" href="#cloud-rim" transform="translate(318 36) scale(1.25 1.15)"/>
      </svg>
    </div>

    <div class="moon">
      <svg viewBox="0 0 120 120">
        <defs>
          <clipPath id="moon-cut">
            <path d="M76 12 C46 20 33 45 38 68 C43 91 65 105 88 101 C66 112 39 101 27 79 C13 53 25 22 52 13 C60 10 69 10 76 12 Z"/>
          </clipPath>
        </defs>
        <circle class="earthshine" cx="60" cy="60" r="33"/>
        <path class="face" d="M76 12 C46 20 33 45 38 68 C43 91 65 105 88 101 C66 112 39 101 27 79 C13 53 25 22 52 13 C60 10 69 10 76 12 Z"/>
        <g class="spots" clip-path="url(#moon-cut)">
          <circle cx="57" cy="40" r="4.4"/>
          <circle cx="68" cy="57" r="2.8"/>
          <circle cx="55" cy="70" r="2.2"/>
          <circle cx="72" cy="31" r="1.8"/>
        </g>
      </svg>
      <i class="moon-halo"/>
      <i class="moon-halo far"/>
    </div>

    <!-- 近云从月亮下沿慢慢擦过去，像有人抬手拨开一层雾 -->
    <div class="veil front">
      <svg viewBox="0 0 470 160" preserveAspectRatio="none">
        <use class="body soft" href="#cloud-puff" transform="translate(162 72) scale(1.17 .9)"/>
        <use class="body" href="#cloud-puff" transform="translate(150 54) scale(1.25 1.02)"/>
        <use class="body soft" href="#cloud-puff" transform="translate(40 86) scale(.95 .7)"/>
        <use class="rim" href="#cloud-rim" transform="translate(150 54) scale(1.25 1.02)"/>
        <path class="wisp" d="M40 128 C 104 118, 166 128, 230 120 C 292 112, 348 120, 432 112"/>
      </svg>
    </div>
    <div class="veil thin">
      <svg viewBox="0 0 360 70" preserveAspectRatio="none">
        <use class="body" href="#cloud-puff" transform="translate(96 18) scale(1.18 .42)"/>
        <path d="M-8 46 C 52 36, 102 46, 160 38 C 218 30, 262 40, 368 30"/>
        <path d="M24 58 C 86 50, 132 58, 198 51 C 252 45, 300 51, 350 45"/>
      </svg>
    </div>
    <div class="veil low">
      <svg viewBox="0 0 900 150" preserveAspectRatio="none">
        <use class="body" href="#cloud-puff" transform="translate(0 66) scale(1.9 .8)"/>
        <use class="body" href="#cloud-puff" transform="translate(360 78) scale(2.1 .75)"/>
        <use class="body" href="#cloud-puff" transform="translate(650 60) scale(1.7 .85)"/>
        <use class="rim" href="#cloud-rim" transform="translate(650 60) scale(1.7 .85)"/>
      </svg>
    </div>

    <i v-for="(d, i) in dust" :key="'d' + i" class="n-dust"
      :style="{ left: d.left, top: d.top, width: d.s, height: d.s, opacity: d.o }"/>

    <svg v-for="(s, i) in stars" :key="'s' + i" class="n-star" :class="{ far: s.far, near: !s.far, glow: s.glow }" :style="{
      left: s.left, top: s.top, width: s.w, height: s.w, opacity: s.o,
      '--dur': s.dur, animationDelay: s.delay, transform: 'rotate(' + s.rot + ')'
    }" viewBox="0 0 20 20">
      <path d="M10 1 C10.7 6 11.3 7.3 19 10 C11.3 12.7 10.7 14 10 19 C9.3 14 8.7 12.7 1 10 C8.7 7.3 9.3 6 10 1 Z"/>
    </svg>

    <i v-for="(m, i) in meteors" :key="'m' + i" class="n-meteor"
      :style="{ left: m.left, top: m.top, '--period': m.period, '--dx': m.dx, '--dy': m.dy,
        '--angle': m.angle, '--len': m.len, animationDelay: m.delay }"/>

    <div class="ground-haze"/>

    <Glyph v-for="(l, i) in leaves" :key="'l' + i" class="n-leaf" :name="l.glyph" :size="l.size"
      :style="{
        left: l.left, '--dur': l.dur, animationDelay: l.delay, '--sway': l.sway
      }"/>
  </div>
</template>

<style scoped>
.night-sky { position: fixed; inset: 0; z-index: 2; overflow: hidden; pointer-events: none;
  animation: skyIn 2s ease both; }
.defs { position: absolute; width: 0; height: 0; overflow: hidden; }
/* 月色不是一层蓝：高处沉，近地平线泛一点青灰，月边再洇开暖光 */
.sky-wash { position: absolute; inset: 0;
  background:
    radial-gradient(46% 58% at 84% 10%, rgba(239, 228, 197, .12), rgba(239, 228, 197, .035) 38%, transparent 68%),
    linear-gradient(180deg, rgba(9, 15, 18, .34), transparent 44%),
    linear-gradient(0deg, rgba(66, 86, 82, .16), transparent 42%); }
.sky-wash::before { content: ''; position: absolute; left: -14%; top: -16%; width: 92%; height: 84%;
  background: linear-gradient(118deg, transparent 36%, rgba(188, 204, 202, .045) 47%,
    rgba(216, 224, 218, .06) 53%, transparent 64%);
  filter: blur(10px); transform: rotate(-5deg); }
.sky-wash::after { content: ''; position: absolute; left: 6%; top: 20%; width: 64%; height: 44%;
  background: linear-gradient(124deg, transparent 34%, rgba(216, 222, 210, .035) 49%, transparent 64%);
  filter: blur(14px); transform: rotate(8deg); }
/* 月亮照下来的一束：不画硬光柱，只在纸上留一层很淡的亮 */
.moon-cast { position: absolute; inset: 0; mix-blend-mode: screen;
  background:
    radial-gradient(44% 34% at 82% 18%, rgba(240, 229, 198, .10), transparent 66%),
    linear-gradient(103deg, transparent 36%, rgba(236, 226, 196, .045) 47%, transparent 59%),
    radial-gradient(56% 26% at 72% 100%, rgba(188, 202, 190, .09), transparent 72%); }
.ground-haze { position: absolute; left: 0; right: 0; bottom: 0; height: 36vh;
  background: linear-gradient(0deg, rgba(154, 174, 168, .09), rgba(154, 174, 168, .025) 44%, transparent 80%);
  filter: blur(7px); }

.moon { position: absolute; right: 8vw; top: 7vh; width: clamp(74px, 8vw, 118px); aspect-ratio: 1; }
.moon svg { position: relative; width: 100%; height: 100%; filter: url(#boil-soft);
  transform: rotate(-8deg); }
.earthshine { fill: #A9B7AF; opacity: .09; }
.face { fill: #F2E7C6; opacity: .95; }
.spots { fill: #A79E86; opacity: .2; }
.moon-halo { position: absolute; inset: -46%; border-radius: 50%;
  background: radial-gradient(circle, rgba(242, 231, 198, .17), rgba(238, 226, 188, .055) 44%, transparent 68%);
  animation: halo 11s ease-in-out infinite; }
.moon-halo.far { inset: -92%;
  background: radial-gradient(circle, rgba(238, 226, 188, .075), rgba(201, 211, 203, .025) 46%, transparent 72%);
  animation-delay: -4s; }

.veil { position: absolute; pointer-events: none;
  animation: veilDrift 92s ease-in-out infinite alternate; }
.veil svg { display: block; width: 100%; height: 100%; overflow: visible; }
.veil .body { fill: rgba(34, 49, 56, .58); }
.veil .body.soft { fill: rgba(42, 60, 64, .42); }
.veil .rim { fill: none; stroke: #EFE4C2; stroke-width: 1.3; stroke-linecap: round; opacity: .13; }
/* 背后那层远云压在月亮下头，轮廓虚，颜色也退 */
.veil.back { right: -8vw; top: 12vh; width: 50vw; height: 22vh; opacity: .58; filter: blur(1.4px); }
/* 擦过月亮的那层近一点、实一点，走得也慢 */
.veil.front { right: -4vw; top: 5vh; width: 40vw; height: 20vh; opacity: .72; filter: blur(.7px);
  animation-duration: 74s; animation-delay: -18s; }
.veil.front .body { fill: rgba(34, 50, 54, .55); }
.veil.front .body.soft { fill: rgba(42, 58, 60, .38); }
.veil.front .rim { opacity: .3; }
.veil.front .wisp { fill: none; stroke: rgba(214, 224, 218, .1); stroke-width: 2.2; stroke-linecap: round; }
/* 一缕更薄的雾，横在月亮腰上 */
.veil.thin { right: 3vw; top: 10vh; width: 30vw; height: 8vh; opacity: .6; filter: blur(1.2px);
  animation-duration: 63s; animation-delay: -32s; }
.veil.thin .body { fill: rgba(110, 126, 120, .5); }
.veil.thin path { fill: none; stroke: rgba(226, 231, 216, .16); stroke-width: 1.6; stroke-linecap: round; }
/* 贴地的低云：只给地平线一点起伏，不抢月亮 */
.veil.low { left: -6vw; right: -6vw; bottom: 17vh; height: 22vh; opacity: .34; filter: blur(2.4px);
  animation-duration: 132s; animation-delay: -64s; }
.veil.low .body { fill: rgba(48, 66, 68, .62); }
.veil.low .rim { opacity: .08; }

.n-dust { position: absolute; border-radius: 50%; background: #D9E4E2; filter: blur(.2px); }
.n-star { position: absolute; fill: #DCE4DE; filter: url(#boil-soft);
  animation: starBreath var(--dur) ease-in-out infinite; }
.n-star.far { filter: url(#boil-soft) blur(.6px); animation: none; }
.n-star.near { fill: #E7E9DA; }
.n-star.glow { filter: url(#boil-soft) drop-shadow(0 0 5px rgba(218, 230, 222, .58)); }
.n-meteor { position: absolute; width: var(--len); height: 1.4px; opacity: 0;
  background: linear-gradient(90deg, rgba(240, 246, 240, .95), rgba(226, 233, 232, .45) 22%, rgba(226, 233, 232, 0));
  transform: rotate(var(--angle)); transform-origin: 0 50%;
  animation: meteor var(--period) linear infinite; }
.n-meteor::after { content: ''; position: absolute; left: -1px; top: -.8px; width: 3px; height: 3px;
  border-radius: 50%; background: #FCFDF9; opacity: .95;
  box-shadow: 0 0 5px 1.5px rgba(226, 238, 236, .7); }
.n-leaf { position: absolute; top: -6vh; color: #C0B190; opacity: 0;
  animation: nightLeaf var(--dur) linear infinite; }
@keyframes skyIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes halo { 0%, 100% { opacity: .55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.06); } }
@keyframes starBreath { 0%, 100% { opacity: .12; } 42% { opacity: .78; } 62% { opacity: .3; } }
/* 云不是飘过去，是慢慢拨开：只挪一两步，月亮一会儿露一会儿藏 */
@keyframes veilDrift {
  from { transform: translateX(-1.6vw) scaleY(.97); }
  to { transform: translateX(1.8vw) scaleY(1.03); }
}
/* 流星只占一瞬：亮起来到熄灭不到六成秒，其余时候天上什么也没发生 */
@keyframes meteor {
  0%, 91.4% { opacity: 0; transform: translate(0, 0) rotate(var(--angle)); }
  91.8% { opacity: .9; }
  92.6% { opacity: .72; }
  93.6%, 100% { opacity: 0; transform: translate(var(--dx), var(--dy)) rotate(var(--angle)); }
}
/* 夜里的叶子不赶路，落一片要小半分钟 */
@keyframes nightLeaf {
  0% { opacity: 0; transform: translate(0, 0) rotate(0); }
  8% { opacity: .5; }
  35% { transform: translate(calc(var(--sway) * -.6), 36vh) rotate(110deg); }
  68% { opacity: .38; transform: translate(var(--sway), 74vh) rotate(228deg); }
  100% { opacity: 0; transform: translate(calc(var(--sway) * .5), 110vh) rotate(330deg); }
}
@media (max-width: 720px) {
  .moon { right: 6vw; top: 5vh; }
  .veil.back { width: 72vw; right: -16vw; }
  .veil.front { width: 60vw; right: -10vw; }
  .veil.thin { width: 44vw; }
  .n-leaf { display: none; }
}
</style>
