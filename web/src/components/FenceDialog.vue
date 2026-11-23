<script setup>
import { ref } from 'vue';
import Glyph from './Glyph.vue';
import VineScroll from './VineScroll.vue';
import FestoonLights from './FestoonLights.vue';

const fBody = ref(null);

defineProps({
  open: Boolean,
  title: { type: String, default: '' },
  note: { type: String, default: '' },
  wide: Boolean,
  keepClose: Boolean
});
defineEmits(['close']);
</script>

<template>
  <Teleport to="body">
    <Transition name="fence">
      <div v-if="open" class="fence-mask" @click.self="$emit('close')">
        <section class="fence-box" :class="{ wide }" role="dialog" :aria-label="title">
          <header class="f-hat">
            <svg class="rails" viewBox="0 0 520 78" preserveAspectRatio="none" aria-hidden="true">
              <g class="fence-ink">
                <path class="post" pathLength="1" d="M54 8 C 52.4 26, 53.8 52, 53 73"/>
                <path class="post" pathLength="1" d="M260 8.6 C 261.2 27, 259.4 52.4, 260.6 73"/>
                <path class="post" pathLength="1" d="M466 8.2 C 467.4 27, 465.6 52, 466.8 73.2"/>
                <path class="rail" pathLength="1" d="M40 24 C 100 21.6, 162 26, 222 23.4 C 306 20.4, 390 26, 480 23"/>
                <path class="rail" pathLength="1" d="M40 47 C 104 49.6, 168 44.8, 230 47.4 C 316 50.4, 398 44.6, 480 47.6"/>
                <path class="rail" pathLength="1" d="M40 70 C 100 67.8, 164 72, 224 69.4 C 310 66.2, 394 72, 480 69"/>
              </g>
              <path class="vine" pathLength="1"
                d="M8 66 C 34 46, 50 72, 78 52 C 104 33, 122 58, 150 42 C 178 26, 202 48, 232 30 C 262 12, 290 40, 318 24 C 348 7, 378 34, 410 18 C 438 4, 470 26, 512 12"/>
              <path class="vine" pathLength="1"
                d="M78 52 C 72 42, 64 38, 52 38 M232 30 C 228 20, 220 16, 208 16 M410 18 C 416 8, 425 5, 438 7"/>
            </svg>
            <Glyph class="hv v1" name="leaf" :size="15"/>
            <Glyph class="hv v2" name="sakura" :size="13"/>
            <Glyph class="hv v3" name="sprout" :size="14"/>
            <Glyph class="hv v4" name="daisy" :size="13"/>
            <FestoonLights class="hat-lights" :count="16" :seed="3" :sag="6"/>
            <div class="f-title">
              <h3>{{ title }}</h3>
              <p v-if="note">{{ note }}</p>
            </div>
            <button v-if="keepClose" class="f-close" title="合上" @click="$emit('close')"><Glyph name="close" :size="14"/></button>
          </header>
          <div class="f-body-wrap">
            <div ref="fBody" class="f-body roll"><slot/></div>
            <VineScroll :el="fBody"/>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fence-mask { position: fixed; inset: 0; z-index: 70; display: grid; place-items: center; padding: 24px;
  background: rgba(63, 58, 47, .3); }
.fence-box { position: relative; width: min(980px, 94vw); max-height: 90vh; display: flex; flex-direction: column;
  --fs-xs: 17px; --fs-sm: 19px; --fs-md: 21px; --fs-base: 23px; --fs-read: 25px;
  --fs-head: 28px; --fs-title: 31px; font-size: var(--fs-base);
  background: var(--paper); border: 1.5px dashed rgba(150, 133, 100, .55);
  border-radius: 26px 14px 30px 12px / 14px 28px 12px 30px;
  box-shadow: 0 18px 44px rgba(63, 58, 47, .16); overflow: hidden;
  transform: rotate(-.28deg); }
.fence-box.wide { width: min(1180px, 94vw); }
body[data-night="1"] .fence-box { border-color: rgba(148, 160, 176, .22);
  box-shadow: 0 18px 44px rgba(5, 9, 15, .34), 0 0 26px rgba(130, 156, 130, .05); }
.f-hat { position: relative; flex: none; min-height: 82px; display: flex; align-items: center;
  justify-content: center; padding: 13px 54px 5px; }
.rails { position: absolute; inset: 0; width: 100%; height: 78px; overflow: visible; opacity: .38; }
.hat-lights { position: absolute; inset: 0 0 auto; height: 78px; z-index: 1; opacity: .92; }
.fence-ink { filter: url(#boil-soft); }
.post, .rail { fill: none; stroke: #8B6B4A; stroke-width: 1.5; stroke-linecap: round; }
.rail { stroke-width: 1.2; }
.vine { fill: none; stroke: var(--grass-deep); stroke-width: 1.15; stroke-linecap: round; opacity: .42;
  filter: url(#boil-soft); animation: vineBreathe 13s ease-in-out infinite alternate; }
.v2, .v4 { color: var(--sakura); }
.hv { position: absolute; color: var(--grass-deep); opacity: .78; transform-origin: 50% 100%;
  animation: leafSway 7.9s ease-in-out infinite alternate; }
.v1 { left: 7%; top: 39%; }
.v2 { left: 20%; top: 26%; animation-duration: 11.3s; animation-delay: -3s; }
.v3 { left: 78%; top: 29%; animation-duration: 9.1s; animation-delay: -5s; }
.v4 { left: 88%; top: 42%; animation-duration: 12.7s; animation-delay: -7s; }
.f-title { position: relative; text-align: center; z-index: 2; }
.f-title h3 { font-size: var(--fs-read); font-weight: normal; letter-spacing: .12em; color: var(--ink);
  padding: 1px 14px 2px; background: color-mix(in srgb, var(--paper) 86%, transparent); }
.f-title p { margin-top: 1px; font-size: var(--fs-sm); letter-spacing: .08em; color: var(--ink-faint); }
.f-close { position: absolute; right: 15px; top: 13px; color: var(--ink-faint); line-height: 0; padding: 5px; }
.f-close:hover { color: var(--wood); }
.f-body-wrap { position: relative; flex: 1; min-height: 0; display: flex; flex-direction: column; }
.f-body { flex: 1; min-height: 0; padding: 2px 30px 22px 24px; overflow-y: auto; scrollbar-width: none; }
.f-body::-webkit-scrollbar { display: none; }

.fence-enter-active, .fence-leave-active { transition: opacity .35s, transform .35s; }
.fence-enter-from, .fence-leave-to { opacity: 0; }
.fence-enter-from .fence-box, .fence-leave-to .fence-box { transform: rotate(-.28deg) translateY(10px) scale(.985); }
@keyframes leafSway { from { transform: rotate(-7deg); } to { transform: rotate(8deg); } }
@keyframes vineBreathe { from { opacity: .34; } to { opacity: .5; } }

@media (max-width: 620px) {
  .fence-mask { padding: 12px; }
  .f-hat { padding: 13px 42px 4px; }
  .f-body { padding: 2px 14px 16px; }
  .v2 { left: 14%; }
}
</style>
