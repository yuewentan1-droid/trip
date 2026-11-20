<script setup>
import { onMounted } from 'vue';
import Glyph from './Glyph.vue';

// 一把花和叶子被风带走：从点下去的地方扬出去，散完就没了
const CAST = ['leaf', 'sakura', 'blossom', 'daisy'];
defineProps({ x: Number, y: Number });
const emit = defineEmits(['done']);

const seeds = Array.from({ length: 7 }, (_, i) => {
  const a = -1.95 + i * .29;
  return {
    g: CAST[i % 4],
    dx: Math.cos(a) * (62 + i * 26),
    dy: Math.sin(a) * (66 + i * 12),
    r: (i % 2 ? 1 : -1) * (55 + i * 24)
  };
});

onMounted(() => setTimeout(() => emit('done'), 1180));
</script>

<template>
  <div class="toss" :style="{ left: x + 'px', top: y + 'px' }">
    <Glyph v-for="(s, i) in seeds" :key="i" class="tz" :name="s.g" :size="19 + i % 3 * 5"
      :style="{ '--dx': s.dx + 'px', '--dy': s.dy + 'px', '--r': s.r + 'deg', animationDelay: i * 45 + 'ms' }"/>
  </div>
</template>

<style scoped>
.toss { position: fixed; z-index: 70; pointer-events: none; }
.tz { position: absolute; margin: calc(var(--s) / -2); color: var(--grass-deep); opacity: .85;
  animation: toss .95s cubic-bezier(.2, .55, .3, 1) forwards; }
</style>
