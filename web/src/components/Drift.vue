<script setup>
import Glyph from './Glyph.vue';

// 八九片，慢到几乎察觉不到，才不像满屏弹幕
const G = ['blossom', 'leaf', 'daisy'];
const bits = Array.from({ length: 9 }, (_, i) => ({
  g: G[i % 3],
  s: 12 + (i * 5) % 10,
  x: 3 + (i * 11.3) % 93,
  w: 20 + (i * 13) % 46,
  o: .3 + (i % 3) * .07,
  dur: 15 + (i * 3.7) % 11,
  dl: -(i * 2.9) % 24
}));
</script>

<template>
  <div class="drift" aria-hidden="true">
    <Glyph v-for="(b, i) in bits" :key="i" class="bit" :name="b.g" :size="b.s"
      :style="{ left: b.x + '%', '--w': b.w + 'px', '--o': b.o, animationDuration: b.dur + 's', animationDelay: b.dl + 's' }"/>
  </div>
</template>

<style scoped>
.drift { position: absolute; left: -4px; right: -4px; bottom: calc(100% - 26px); height: 148px;
  overflow: hidden; pointer-events: none; }
.bit { position: absolute; top: 0; color: var(--wood); animation: petalFall linear infinite; }
</style>
