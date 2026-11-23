<script setup>
import { useNight } from '../store/night';

const night = useNight();
// 白天还是原来那几只，不添不减；天黑之后草丛里再多一群，闪法各不相同
const flies = Array.from({ length: 7 }, () => ({
  left: (5 + Math.random() * 90) + 'vw',
  top: (25 + Math.random() * 65) + 'vh',
  animationDuration: (12 + Math.random() * 8) + 's',
  animationDelay: (-Math.random() * 20) + 's'
}));
const nightFlies = Array.from({ length: 18 }, () => ({
  left: (3 + Math.random() * 94) + 'vw',
  top: (32 + Math.random() * 62) + 'vh',
  '--dx': (Math.random() * 90 - 45).toFixed(0) + 'px',
  '--dy': (-(30 + Math.random() * 90)).toFixed(0) + 'px',
  '--drift': (16 + Math.random() * 16).toFixed(1) + 's',
  '--pulse': (2.4 + Math.random() * 3.4).toFixed(2) + 's',
  '--pd': (-Math.random() * 7).toFixed(2) + 's',
  '--sz': (5 + Math.random() * 3).toFixed(1) + 'px'
}));
</script>

<template>
  <i v-for="(f, i) in flies" :key="'d' + i" class="ffly" :style="f"/>
  <template v-if="night.on">
    <i v-for="(f, i) in nightFlies" :key="'n' + i" class="nfly" :style="f"/>
  </template>
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
/* 夜里的萤火：一边慢慢挪，一边自己明灭，不跟谁齐步 */
.nfly {
  position: fixed;
  width: var(--sz);
  height: var(--sz);
  border-radius: 50%;
  background: #F4E59A;
  box-shadow: 0 0 6px 2px rgba(232, 214, 130, .55), 0 0 18px 6px rgba(197, 213, 128, .2);
  pointer-events: none;
  z-index: 31;
  animation: nightDrift var(--drift) ease-in-out infinite alternate,
    nightPulse var(--pulse) ease-in-out var(--pd) infinite;
}
@keyframes nightDrift {
  from { transform: translate(0, 0); }
  to { transform: translate(var(--dx), var(--dy)); }
}
@keyframes nightPulse {
  0%, 100% { opacity: .12; filter: brightness(.65); }
  38% { opacity: .95; filter: brightness(1.2); }
  52% { opacity: .45; }
  68% { opacity: 1; filter: brightness(1.3); }
  84% { opacity: .3; }
}
</style>
