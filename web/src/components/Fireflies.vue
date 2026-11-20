<script setup>
const flies = Array.from({ length: 7 }, () => ({
  left: (5 + Math.random() * 90) + 'vw',
  top: (25 + Math.random() * 65) + 'vh',
  animationDuration: (12 + Math.random() * 8) + 's',
  animationDelay: (-Math.random() * 20) + 's'
}));
</script>

<template>
  <i v-for="(f, i) in flies" :key="i" class="ffly" :style="f"/>
</template>

<style scoped>
.ffly {
  position: fixed;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: radial-gradient(circle, #F7E8A4 0%, rgba(230, 200, 110, .5) 60%, transparent 100%);
  pointer-events: none;
  z-index: 30;
  animation-name: fly;
  animation-iteration-count: infinite;
  animation-timing-function: ease-in-out;
}
</style>
