<script setup>
import { computed, ref, watch } from 'vue';
import { DIMS, dimOf } from '../constants/dimensions';
import Glyph from './Glyph.vue';

const props = defineProps({ modelValue: String, disabled: Boolean, center: String });
const emit = defineEmits(['update:modelValue']);

const ticks = DIMS.map((d, i) => {
  const a = (-90 + i * 60) * Math.PI / 180;
  return { ...d, i, x: 50 + 41.5 * Math.cos(a), y: 50 + 41.5 * Math.sin(a) };
});
const on = computed(() => DIMS.findIndex(d => d.key === props.modelValue));
const marks = DIMS.map((_, i) => {
  const a = (-90 + i * 60) * Math.PI / 180;
  return [68, 76].map(r => [100 + r * Math.cos(a), 100 + r * Math.sin(a)]);
});

// 指针走最短弧，配合缓出曲线才有“拨过去”的阻尼感
const spin = ref(Math.max(on.value, 0) * 60);
watch(() => props.modelValue, k => {
  let d = (DIMS.findIndex(x => x.key === k) * 60 - spin.value) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  spin.value += d;
});

function pick(i) {
  if (!props.disabled) emit('update:modelValue', DIMS[i].key);
}

const box = ref(null);
let dragging = false;
function seek(e) {
  if (!box.value) return;
  const r = box.value.getBoundingClientRect();
  const a = Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2) * 180 / Math.PI;
  const i = ((Math.round((a + 90) / 60) % 6) + 6) % 6;
  if (i !== on.value) pick(i);
}
</script>

<template>
  <div ref="box" class="compass" :class="{ off: disabled }"
    :style="{ '--c': dimOf(modelValue).color }"
    @pointerdown="dragging = true; seek($event); box.setPointerCapture($event.pointerId)"
    @pointermove="dragging && seek($event)"
    @pointerup="dragging = false">
    <i class="wash" :key="modelValue"/>
    <svg viewBox="0 0 200 200" class="dial">
      <g class="ink">
        <circle class="ring" cx="100" cy="100" r="66"/>
        <circle class="ring inner" cx="100" cy="100" r="42"/>
        <line v-for="(m, i) in marks" :key="i" :x1="m[0][0]" :y1="m[0][1]" :x2="m[1][0]" :y2="m[1][1]"
          :class="{ hit: i === on }"/>
        <g class="needle" :style="{ transform: `rotate(${spin}deg)` }">
          <path pathLength="1" d="M100 50 C 103.5 66, 103.5 86, 100 100 C 96.5 86, 96.5 66, 100 50 Z"/>
          <path pathLength="1" class="tail" d="M100 100 C 101 110, 100 118, 100 126"/>
        </g>
        <circle class="pivot" cx="100" cy="100" r="3"/>
      </g>
    </svg>
    <button v-for="t in ticks" :key="t.key" class="tick" :class="{ on: t.i === on }"
      :style="{ left: t.x + '%', top: t.y + '%' }" :disabled="disabled" @click="pick(t.i)">
      <Glyph :name="t.glyph" :size="19"/>
      <span>{{ t.key }}</span>
    </button>
    <div class="hub">{{ center }}</div>
  </div>
</template>

<style scoped>
.compass { position: relative; width: 100%; max-width: 226px; aspect-ratio: 1; margin: 4px auto 12px; touch-action: none; }
.compass.off { opacity: .5; }
.wash { position: absolute; inset: -6%; border-radius: 46% 54% 50% 50% / 54% 46% 52% 48%; pointer-events: none;
  background: radial-gradient(circle at 50% 50%, var(--c), transparent 68%); opacity: .1;
  animation: bloom 1.6s cubic-bezier(.2, .8, .3, 1) backwards; filter: url(#ink-blot); }
@keyframes bloom { from { opacity: 0; transform: scale(.6); } to { opacity: .1; transform: none; } }

.dial { position: absolute; inset: 0; width: 100%; height: 100%; }
.ink { filter: url(#boil); }
.ink .ring, .ink line, .ink path { fill: none; stroke: var(--graphite); stroke-linecap: round; }
.ring { stroke-width: 1.4; opacity: .5; }
.inner { stroke-width: 1; opacity: .22; stroke-dasharray: 4 5; }
.ink line { stroke-width: 1.3; opacity: .34; }
.ink line.hit { stroke: var(--c); opacity: .8; stroke-width: 2; }
.needle { transform-origin: 100px 100px; transition: transform 1.15s cubic-bezier(.2, 1.16, .32, 1); }
.needle path { fill: var(--c); fill-opacity: .13; stroke: var(--c); stroke-width: 1.1; }
.needle .tail { stroke-width: 1; opacity: .45; }
.pivot { fill: var(--graphite); stroke: none; opacity: .5; }

.tick { position: absolute; transform: translate(-50%, -50%); display: flex; flex-direction: column;
  align-items: center; gap: 1px; color: var(--ink-faint); font-size: 12px; line-height: 1.3;
  padding: 3px 7px 4px; border-radius: var(--r-b); transition: color .45s, background .45s; }
.tick:hover { color: var(--wood); }
.tick.on { color: var(--ink); }
.tick.on .gl { animation: sprout .75s cubic-bezier(.24, .9, .3, 1.1) backwards; }
.tick.on span { letter-spacing: .1em; }
.hub { position: absolute; left: 50%; top: calc(100% + 3px); transform: translateX(-50%); width: 70%;
  text-align: center; font-size: 12px; line-height: 1.45; color: var(--ink-soft); pointer-events: none; }
</style>
