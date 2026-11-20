<script setup>
defineProps({ river: String, twigs: Array });
</script>

<template>
  <svg class="flow" aria-hidden="true">
    <path v-if="river" class="river" :d="river" fill="none"/>
    <path v-for="t in twigs" :key="t.k" class="twig" :d="t.d" :style="{ '--c': t.c }" fill="none"/>
  </svg>
</template>

<style scoped>
.flow { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
.river { stroke: var(--graphite); stroke-width: 1.7; opacity: .22; stroke-linecap: round; stroke-linejoin: round;
  filter: url(#boil-soft); }
.twig { stroke: var(--c); stroke-width: 1.3; opacity: .55; stroke-linecap: round;
  stroke-dasharray: 5 4; filter: url(#boil-soft); animation: fadeUp .7s ease-out backwards; }
</style>
