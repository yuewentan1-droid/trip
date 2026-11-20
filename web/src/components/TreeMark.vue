<script setup>
import { computed } from 'vue';
import { iconUri } from '../icons';

const props = defineProps({
  count: { type: Number, default: 0 },
  level: { type: Number, default: 0 }
});

const BRANCHES = [
  'M60 46 C 48 44, 37 38, 29 30',
  'M60 37 C 71 35, 82 29, 91 21',
  'M60 28 C 50 25, 43 19, 37 12',
  'M60 21 C 69 19, 76 14, 81 8',
  'M60 14 C 54 13, 50 11, 46 8'
];
const LEAVES = [
  [29, 29, -28], [36, 34, 20], [43, 31, -14], [91, 20, 24], [84, 25, -18],
  [77, 29, 8], [37, 11, -22], [45, 16, 16], [81, 7, 26], [72, 12, -12],
  [55, 18, -25], [66, 24, 22], [46, 8, -30], [51, 13, 24]
];
const leaf = iconUri('leaf', '#6B5B4A');
const boughs = computed(() => BRANCHES.slice(0, Math.min(5, 2 + Math.ceil(props.level / 2))));
const leaves = computed(() => LEAVES.slice(0, Math.min(LEAVES.length, 3 + Math.ceil(props.count / 3))));
</script>

<template>
  <svg class="mark" viewBox="0 0 120 60" fill="none" aria-hidden="true">
    <g class="ink">
      <path class="trunk" pathLength="1" d="M60 57 C 57 47, 63 39, 60 29 C 58 21, 60 14, 60 7"/>
      <path v-for="(d, i) in boughs" :key="i" class="bough" pathLength="1" :d="d"
        :style="{ animationDelay: .12 * i + 's' }"/>
    </g>
    <image v-for="(l, i) in leaves" :key="i" :href="leaf" :x="l[0] - 7" :y="l[1] - 7" width="14" height="14"
      :transform="`rotate(${l[2]} ${l[0]} ${l[1]})`"/>
  </svg>
</template>

<style scoped>
.mark { width: 104px; height: 48px; overflow: visible; }
.ink { filter: url(#boil-soft); }
.trunk, .bough { stroke: #6B5B4A; stroke-width: 1.6; stroke-linecap: round; opacity: .72;
  animation: strokeIn .9s ease-out backwards; }
.bough { stroke-width: 1.3; }
image { opacity: .62; }
</style>
