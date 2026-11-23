<script setup>
import Glyph from './Glyph.vue';
import FestoonLights from './FestoonLights.vue';
</script>

<template>
  <span class="m-sprig" aria-hidden="true">
    <svg class="ms-stem" viewBox="0 0 220 96" preserveAspectRatio="none">
      <path class="ms-vine" d="M218 6 C 192 8, 184 30, 158 28 C 132 26, 124 48, 98 46 C 76 44, 64 60, 44 58"/>
      <path class="ms-tendril" d="M158 28 C 154 16, 142 10, 128 13 M98 46 C 104 32, 116 28, 130 31 M44 58 C 40 48, 30 44, 20 46"/>
    </svg>
    <Glyph class="ms-leaf a" name="leaf" :size="16"/>
    <Glyph class="ms-leaf b" name="sakura" :size="13"/>
    <Glyph class="ms-leaf c" name="sprout" :size="14"/>
    <Glyph class="ms-leaf d" name="daisy" :size="12"/>
    <Glyph class="ms-butterfly" name="butterfly" :size="15"/>
    <i class="ms-grass g1"/><i class="ms-grass g2"/><i class="ms-grass g3"/><i class="ms-grass g4"/>
    <Glyph class="ms-bloom" name="daisy" :size="12"/>
    <FestoonLights class="ms-lights" :count="12" :seed="7" :sag="8"/>
  </span>
</template>

<style scoped>
/* 纸角上趴着的一截藤：从边上探进来，不横穿字面；纸脚再冒几根草 */
.m-sprig { position: absolute; inset: 0; z-index: -1; overflow: hidden; border-radius: inherit; pointer-events: none; }
.ms-stem { position: absolute; right: -10px; top: -8px; width: min(230px, 52%); height: 88px; overflow: visible; }
.ms-vine, .ms-tendril { fill: none; stroke: var(--grass-deep); stroke-linecap: round; filter: url(#boil-soft); }
.ms-vine { stroke-width: 1.35; opacity: .36; }
.ms-tendril { stroke-width: 1.05; opacity: .3; }
.ms-leaf { position: absolute; rotate: var(--r); opacity: .56; transform-origin: 50% 100%;
  animation: msSway 8.6s ease-in-out infinite alternate; }
.ms-leaf.a { right: 31%; top: 4px; --r: -26deg; color: var(--grass-deep); }
.ms-leaf.b { right: 15%; top: 14px; --r: 22deg; color: var(--sakura);
  animation-duration: 10.4s; animation-delay: -3.1s; }
.ms-leaf.c { right: 5%; top: 35px; --r: -12deg; color: var(--grass); opacity: .5;
  animation-duration: 9.2s; animation-delay: -5.4s; }
.ms-leaf.d { right: 40%; top: 1px; --r: 16deg; color: var(--wheat); opacity: .62;
  animation-duration: 11.6s; animation-delay: -2.3s; }
.ms-butterfly { position: absolute; right: 19%; top: 42px; color: var(--clay); opacity: .58;
  animation: msFlit 7.6s ease-in-out infinite alternate; }
.ms-grass { position: absolute; left: 20px; bottom: 6px; width: 1.4px; height: 20px;
  border-radius: 50% 50% 0 0; background: var(--grass); opacity: .32; transform-origin: 50% 100%; }
.ms-grass.g1 { rotate: -16deg; height: 15px; }
.ms-grass.g2 { left: 27px; height: 22px; rotate: 7deg; opacity: .26; }
.ms-grass.g3 { left: 34px; height: 17px; rotate: -4deg; opacity: .3; }
.ms-grass.g4 { left: 40px; height: 12px; rotate: 15deg; opacity: .24; }
.ms-bloom { position: absolute; left: 47px; bottom: 3px; color: var(--sakura); opacity: .52;
  rotate: 9deg; }
.ms-lights { inset: 2px 4% auto; height: 38px; opacity: .82; }
@keyframes msSway { from { rotate: calc(var(--r) - 2deg); } to { rotate: calc(var(--r) + 2deg); } }
@keyframes msFlit {
  from { transform: translate(0, 0) rotate(-6deg); }
  to { transform: translate(-4px, -5px) rotate(6deg); }
}
@media (prefers-reduced-motion: reduce) {
  .ms-leaf, .ms-butterfly { animation: none; }
}
</style>
