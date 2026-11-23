<script setup>
import { computed } from 'vue';

const props = defineProps({
  count: { type: Number, default: 12 },
  seed: { type: Number, default: 1 },
  vertical: Boolean,
  sag: { type: Number, default: 7 }
});

const COLORS = ['#E7B759', '#D98263', '#93B27A', '#7FA7BB', '#C79AAF', '#E3CE8D'];
const rand = n => {
  let h = (n * 2654435761) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 2246822519);
  h ^= h >>> 13; h = Math.imul(h, 3266489917);
  return ((h ^= h >>> 16) >>> 0) / 4294967296;
};

const bulbs = computed(() => Array.from({ length: props.count }, (_, i) => {
  const t = (i + .5) / props.count;
  // 四段弧，灯沿着弧垂下去；每个灯自己的呼吸快慢不一样，才像真的
  const wave = Math.sin(Math.PI * ((t * 4) % 1)) * props.sag;
  const jitter = (rand(i + props.seed * 31) - .5) * 2.2;
  const h = rand(i * 7 + props.seed);
  return {
    i,
    x: props.vertical ? 6 + wave + jitter : t * 100,
    y: props.vertical ? t * 100 : 8 + wave + jitter,
    c: COLORS[Math.floor(h * COLORS.length)],
    delay: -(h * 6.5).toFixed(2),
    dur: (2.6 + rand(i * 13 + props.seed) * 3.1).toFixed(2),
    size: 5.4 + Math.round(rand(i * 17 + props.seed) * 2.2)
  };
}));

const wire = computed(() => {
  const pts = [];
  for (let i = 0; i <= 120; i++) {
    const t = i / 120;
    const wave = Math.sin(Math.PI * ((t * 4) % 1)) * props.sag;
    pts.push(props.vertical ? `${(6 + wave).toFixed(2)} ${(t * 1000).toFixed(1)}`
      : `${(t * 1000).toFixed(1)} ${(8 + wave).toFixed(2)}`);
  }
  return 'M' + pts.join(' L');
});
</script>

<template>
  <div class="festoon" :class="{ vertical }" aria-hidden="true">
    <svg :viewBox="vertical ? '0 0 100 1000' : '0 0 1000 100'" preserveAspectRatio="none">
      <path class="f-wire" :d="wire"/>
    </svg>
    <i v-for="b in bulbs" :key="b.i" class="f-bulb"
      :style="{ left: b.x + '%', top: b.y + '%', '--c': b.c, '--sz': b.size + 'px',
        animationDelay: b.delay + 's', animationDuration: b.dur + 's' }"/>
  </div>
</template>

<style scoped>
.festoon { display: none; position: absolute; inset: 0; pointer-events: none; }
body[data-night="1"] .festoon { display: block; }
.festoon svg { width: 100%; height: 100%; overflow: visible; }
.f-wire { fill: none; stroke: rgba(154, 166, 170, .5); stroke-width: 1.1; vector-effect: non-scaling-stroke; }
.f-bulb { position: absolute; width: var(--sz); height: var(--sz); margin: calc(var(--sz) / -2) 0 0 calc(var(--sz) / -2);
  border-radius: 50%; background: var(--c);
  box-shadow: 0 0 6px 2px color-mix(in srgb, var(--c) 55%, transparent),
    0 0 16px 5px color-mix(in srgb, var(--c) 22%, transparent);
  animation-name: bulbGlow; animation-timing-function: ease-in-out; animation-iteration-count: infinite;
  animation-direction: alternate; }
@keyframes bulbGlow {
  from { opacity: .48; filter: brightness(.82); transform: scale(.92); }
  to { opacity: 1; filter: brightness(1.16); transform: scale(1.06); }
}
</style>
