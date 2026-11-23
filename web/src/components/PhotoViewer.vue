<script setup>
import Glyph from './Glyph.vue';

defineProps({
  src: String,
  title: { type: String, default: '' }
});
defineEmits(['close']);

// 篱笆根下歇着的萤火：各按各的时辰亮，不排成一条线
const flies = [
  { left: '2%', top: '24%', dx: '16px', dy: '-14px', dur: 8.6, pd: 3.2, delay: -1.4 },
  { left: '94%', top: '18%', dx: '-20px', dy: '12px', dur: 10.4, pd: 4.1, delay: -3.7 },
  { left: '6%', top: '70%', dx: '22px', dy: '-20px', dur: 9.2, pd: 2.7, delay: -5.1 },
  { left: '90%', top: '62%', dx: '-16px', dy: '-16px', dur: 11.3, pd: 3.8, delay: -2.2 },
  { left: '28%', top: '3%', dx: '-12px', dy: '18px', dur: 10.8, pd: 4.6, delay: -6.3 },
  { left: '72%', top: '89%', dx: '18px', dy: '-12px', dur: 9.8, pd: 3.4, delay: -.8 }
];
const styleOf = f => ({
  left: f.left, top: f.top, '--dx': f.dx, '--dy': f.dy,
  '--dur': f.dur / 2 + 's', '--pd': f.pd + 's', '--delay': f.delay + 's'
});
</script>

<template>
  <Teleport to="body">
    <Transition name="pv">
      <div v-if="src" class="pv-mask" @click.self="$emit('close')">
        <figure class="pv-frame">
          <span class="pv-vine v-left" aria-hidden="true">
            <svg viewBox="0 0 120 520" preserveAspectRatio="none">
              <path class="vine-ink"
                d="M20 518 C 2 438, 44 372, 24 304 C 6 242, 48 188, 28 126 C 16 88, 34 48, 26 6"/>
              <path class="vine-ink thin"
                d="M28 430 C 50 402, 52 370, 44 344 M24 300 C 2 274, 2 246, 12 228 M28 126 C 54 106, 58 78, 52 52"/>
            </svg>
            <Glyph class="pv-leaf l1" name="leaf" :size="21"/>
            <Glyph class="pv-leaf l2" name="sakura" :size="17"/>
            <Glyph class="pv-leaf l3" name="sprout" :size="18"/>
            <Glyph class="pv-leaf l4" name="daisy" :size="19"/>
            <Glyph class="pv-butterfly" name="butterfly" :size="24"/>
          </span>
          <span class="pv-vine v-right" aria-hidden="true">
            <svg viewBox="0 0 120 520" preserveAspectRatio="none">
              <path class="vine-ink"
                d="M100 518 C 118 434, 76 374, 96 306 C 114 244, 72 186, 92 124 C 104 86, 86 46, 94 8"/>
              <path class="vine-ink thin"
                d="M92 438 C 70 408, 68 376, 78 350 M96 306 C 118 280, 118 252, 108 234 M92 124 C 66 104, 62 76, 68 50"/>
            </svg>
            <Glyph class="pv-leaf l1" name="leaf" :size="20"/>
            <Glyph class="pv-leaf l2" name="flower" :size="17"/>
            <Glyph class="pv-leaf l3" name="sakura" :size="18"/>
            <Glyph class="pv-leaf l4" name="leaf" :size="19"/>
            <Glyph class="pv-butterfly" name="butterfly" :size="21"/>
          </span>

          <div class="pv-shot">
            <img :src="src" :alt="title || '田里的一张照片'"/>
          </div>
          <figcaption v-if="title"><Glyph name="leaf" :size="16"/> {{ title }}</figcaption>
          <button class="pv-close" title="合上" @click="$emit('close')"><Glyph name="close" :size="15"/></button>

          <svg class="pv-fence" viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true">
            <g class="fence-ink">
              <path class="post" d="M42 18 C 40.4 44, 41.8 84, 41 112"/>
              <path class="post" d="M500 16 C 501.4 42, 499.6 84, 500.8 112"/>
              <path class="post" d="M958 18 C 959.4 44, 957.6 84, 958.8 112"/>
              <path class="rail" d="M26 40 C 160 36, 330 43, 500 39 C 670 35, 840 43, 974 38"/>
              <path class="rail" d="M26 72 C 170 76, 336 68, 502 73 C 672 78, 842 70, 974 74"/>
              <path class="rail" d="M26 103 C 164 99, 334 106, 504 102 C 674 98, 844 106, 974 101"/>
            </g>
            <path class="fence-vine"
              d="M6 108 C 54 82, 92 112, 140 84 C 190 54, 232 92, 282 64 C 332 36, 374 74, 424 48 C 474 22, 516 58, 566 36 C 616 14, 658 52, 708 30 C 758 8, 800 40, 850 22 C 900 4, 940 32, 994 16"/>
            <path class="fence-tendril"
              d="M140 84 C 136 68, 124 60, 108 60 M424 48 C 420 32, 408 26, 392 26 M708 30 C 712 14, 724 8, 740 9"/>
          </svg>

          <i v-for="(f, i) in flies" :key="i" class="pv-fly" :style="styleOf(f)" aria-hidden="true"/>
        </figure>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pv-mask { position: fixed; inset: 0; z-index: 120; display: grid; place-items: center;
  padding: calc(3vh + env(safe-area-inset-top)) calc(3vw + env(safe-area-inset-right))
    calc(3vh + env(safe-area-inset-bottom)) calc(3vw + env(safe-area-inset-left));
  background: rgba(58, 52, 41, .46); }

.pv-frame { position: relative; display: flex; flex-direction: column; align-items: center;
  min-width: min(480px, 92vw); max-width: 94vw; margin: 0; padding: 15px 15px 54px;
  max-height: calc(100dvh - 6vh - env(safe-area-inset-top) - env(safe-area-inset-bottom));
  background: var(--paper); border: 1.5px dashed rgba(150, 133, 100, .55);
  border-radius: 30px 16px 32px 14px / 16px 30px 14px 32px;
  box-shadow: 0 22px 54px rgba(48, 43, 34, .26); transform: rotate(-.35deg); }
.pv-shot { display: flex; max-width: min(86vw, 1180px);
  max-height: min(76dvh, calc(100dvh - 6vh - 90px - env(safe-area-inset-top) - env(safe-area-inset-bottom))); }
.pv-shot img { display: block; max-width: 100%; width: auto; height: auto;
  max-height: min(76dvh, calc(100dvh - 6vh - 90px - env(safe-area-inset-top) - env(safe-area-inset-bottom)));
  object-fit: contain; border-radius: 14px 8px 16px 9px / 9px 15px 8px 14px;
  box-shadow: 0 0 0 1.2px rgba(150, 133, 100, .38), 0 8px 22px rgba(70, 61, 47, .12); }
.pv-frame figcaption { position: absolute; left: 22px; bottom: 19px; z-index: 4; display: flex;
  align-items: center; gap: 6px; max-width: 70%; color: var(--ink-soft); font-size: var(--fs-sm);
  letter-spacing: .05em; line-height: 1.4; }
.pv-frame figcaption :deep(.gl) { flex: none; color: var(--grass-deep); opacity: .8; }

/* 两条藤从画框边上绕下来，叶子各摇各的 */
.pv-vine { position: absolute; top: 5%; bottom: 8%; width: 62px; z-index: 3; pointer-events: none;
  color: var(--grass-deep); }
.pv-vine.v-left { left: -25px; }
.pv-vine.v-right { right: -25px; }
.pv-vine svg { width: 100%; height: 100%; overflow: visible; }
.vine-ink { fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; opacity: .52;
  vector-effect: non-scaling-stroke; animation: vineSway 9s ease-in-out infinite alternate; }
.vine-ink.thin { stroke-width: 1.2; opacity: .38; animation-duration: 11.4s; animation-delay: -3.4s; }
.pv-leaf { position: absolute; transform-origin: 50% 100%; opacity: .8;
  animation: leafSway 7.6s ease-in-out infinite alternate; }
.pv-leaf.l1 { left: 1%; top: 9%; }
.pv-leaf.l2 { right: -4%; top: 27%; color: var(--sakura); animation-duration: 9.8s; animation-delay: -2.6s; }
.pv-leaf.l3 { left: -2%; top: 47%; animation-duration: 8.4s; animation-delay: -4.9s; }
.pv-leaf.l4 { right: 2%; top: 66%; color: var(--wheat); animation-duration: 10.6s; animation-delay: -1.7s; }
.v-right .pv-leaf.l2 { color: var(--lilac); }
.pv-butterfly { position: absolute; left: 24%; top: 37%; color: var(--clay); opacity: .72;
  transform-origin: 60% 60%; animation: flit 6.2s ease-in-out infinite alternate; }
.v-right .pv-butterfly { left: auto; right: 20%; top: 56%; animation-duration: 7.4s; animation-delay: -2.3s; }

.pv-close { position: absolute; right: 16px; bottom: 12px; z-index: 5; display: grid; place-items: center;
  width: 30px; height: 30px; color: var(--ink-faint); line-height: 0; border-radius: 50%;
  border: 1px dashed rgba(150, 133, 100, .5); background: var(--paper); transition: color .3s, border-color .3s; }
.pv-close:hover { color: var(--wood); border-color: rgba(139, 107, 74, .7); }

/* 画框下沿一道旧篱笆，藤从篱笆上过 */
.pv-fence { position: absolute; left: -2%; bottom: -4px; width: 104%; height: 92px; z-index: 2;
  pointer-events: none; overflow: visible; opacity: .82; }
.fence-ink { filter: url(#boil-soft); }
.post, .rail { fill: none; stroke: #7E5E3E; stroke-linecap: round; stroke-width: 2; opacity: .9; }
.rail { stroke-width: 1.6; opacity: .78; }
.fence-vine, .fence-tendril { fill: none; stroke: var(--grass-deep); stroke-linecap: round;
  vector-effect: non-scaling-stroke; stroke-width: 1.6; opacity: .56; }
.fence-tendril { stroke-width: 1.2; opacity: .44; }

.pv-fly { position: absolute; z-index: 4; width: 5px; height: 5px; border-radius: 50%;
  background: #F4E59A; pointer-events: none;
  box-shadow: 0 0 6px 2px rgba(232, 214, 130, .55), 0 0 15px 5px rgba(197, 213, 128, .2);
  animation: flyDrift var(--dur) ease-in-out var(--delay) infinite alternate,
    flyPulse var(--pd) ease-in-out var(--delay) infinite; }

.pv-enter-active, .pv-leave-active { transition: opacity .35s, transform .35s; }
.pv-enter-from, .pv-leave-to { opacity: 0; }
.pv-enter-from .pv-frame, .pv-leave-to .pv-frame { transform: rotate(-.35deg) translateY(12px) scale(.985); }
@keyframes vineSway { from { transform: rotate(-.6deg); } to { transform: rotate(.8deg); } }
@keyframes leafSway { from { transform: rotate(-8deg); } to { transform: rotate(9deg); } }
@keyframes flit {
  from { transform: translate(0, 0) rotate(-14deg) scale(.94); }
  48% { transform: translate(10px, -9px) rotate(10deg) scale(1.06); }
  to { transform: translate(-5px, 10px) rotate(22deg) scale(.97); }
}
@keyframes flyDrift { from { transform: translate(0, 0); } to { transform: translate(var(--dx), var(--dy)); } }
@keyframes flyPulse {
  0%, 100% { opacity: .16; filter: brightness(.7); }
  40% { opacity: .92; filter: brightness(1.2); }
  62% { opacity: .4; }
  80% { opacity: 1; filter: brightness(1.3); }
}

body[data-night="1"] .pv-frame { border-color: rgba(148, 160, 176, .26);
  box-shadow: 0 22px 54px rgba(5, 9, 15, .44), 0 0 30px rgba(130, 156, 130, .05); }
body[data-night="1"] .pv-shot img { box-shadow: 0 0 0 1.2px rgba(148, 160, 176, .2), 0 8px 22px rgba(0, 0, 0, .3); }
body[data-night="1"] .pv-vine, body[data-night="1"] .fence-vine, body[data-night="1"] .fence-tendril { opacity: .3; }
body[data-night="1"] .pv-fence { opacity: .4; }

@media (max-width: 620px) {
  .pv-mask { padding: calc(12px + env(safe-area-inset-top)) calc(12px + env(safe-area-inset-right))
    calc(12px + env(safe-area-inset-bottom)) calc(12px + env(safe-area-inset-left)); }
  .pv-frame { width: 100%; max-width: 100%; padding: 9px 9px 42px;
    max-height: calc(100dvh - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom)); }
  .pv-shot { max-width: 100%;
    max-height: min(70dvh, calc(100dvh - 104px - env(safe-area-inset-top) - env(safe-area-inset-bottom))); }
  .pv-shot img { max-height: min(70dvh, calc(100dvh - 104px - env(safe-area-inset-top) - env(safe-area-inset-bottom))); }
  .pv-vine { width: 42px; }
  .pv-vine.v-left { left: -16px; }
  .pv-vine.v-right { right: -16px; }
  .pv-fence { height: 70px; }
  .pv-frame figcaption { left: 14px; bottom: 14px; max-width: 78%; }
}
</style>
