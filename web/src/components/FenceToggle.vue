<script setup>
defineProps({ open: Boolean });
defineEmits(['toggle']);
const RAILS = [
  { d: 'M10 11 C 26 9.4, 48 12.2, 69 10.4' },
  { d: 'M10.5 19 C 30 20.6, 45 17.8, 68.6 19.4', mid: true },
  { d: 'M10 27 C 25 25.8, 49 28.2, 69 26.6', mid: true },
  { d: 'M10.6 35 C 29 36.4, 47 33.8, 68.4 35.3' }
];
</script>

<template>
  <button type="button" class="fence" :class="{ open }" :aria-pressed="open"
    aria-label="篱笆，公开或私密" @click="$emit('toggle')">
    <svg class="fence-svg" viewBox="0 0 80 44" fill="none" aria-hidden="true">
      <g class="ink">
        <path class="post" pathLength="1" d="M14 5 C 12.7 14.2, 13.6 26, 12.9 39"/>
        <path class="post" pathLength="1" d="M64 5.4 C 65.4 14, 64.2 25.6, 65 39.2"/>
        <path v-for="(r, i) in RAILS" :key="i" class="rail" :class="{ mid: r.mid }"
          pathLength="1" :d="r.d"/>
      </g>
    </svg>
    <span class="fence-note">{{ open ? '敞着门' : '围起来了' }}</span>
  </button>
</template>

<style scoped>
.fence { display: inline-flex; align-items: center; gap: 10px; color: var(--ink-soft);
  transition: color .4s; }
.fence:hover { color: var(--wood); }
.fence-svg { width: 76px; height: 42px; overflow: visible; }
.ink { filter: url(#boil-soft); }
.post { stroke: #8B6B4A; stroke-width: 1.5; stroke-linecap: round; opacity: .78;
  animation: strokeIn .7s ease-out backwards; }
.rail { stroke: #8A7A66; stroke-width: 1.5; stroke-linecap: round;
  transform-box: fill-box; transform-origin: left center;
  transition: transform .4s cubic-bezier(.25, .1, .25, 1), opacity .4s, stroke .4s; }
.fence.open .rail { stroke: #B08A5E; }
.fence.open .rail.mid { transform: scaleX(0); opacity: 0; }
.fence-note { font-size: 12px; letter-spacing: 1.5px; color: var(--ink-soft); transition: color .4s; }
.fence.open .fence-note { color: var(--wood); }
</style>
