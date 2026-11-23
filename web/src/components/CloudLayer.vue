<script setup>
const clouds = [
  { top: '10%', s: 1, dur: '60s', delay: '-15s', o: .85 },
  { top: '34%', s: .65, dur: '80s', delay: '-45s', o: .6 },
  { top: '58%', s: 1.2, dur: '100s', delay: '-70s', o: .7 }
];
</script>

<template>
  <div class="sky">
    <div v-for="(c, i) in clouds" :key="i" class="cloud"
      :style="{ top: c.top, animationDuration: c.dur, animationDelay: c.delay, '--day-o': c.o }">
      <div class="cs" :style="{ transform: `scale(${c.s})` }">
        <svg width="150" height="54" viewBox="0 0 115 78">
          <path d="M25 60 Q6 60 6 44 Q6 30 20 28 Q22 12 38 12 Q46 2 58 8 Q66 2 74 10 Q88 8 90 24 Q108 24 110 40 Q112 58 96 60 Z"
            fill="#FFFDF6" stroke="#DCD3BE" stroke-width="2"/>
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sky { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.cloud { position: absolute; left: 0; opacity: var(--day-o);
  animation-name: drift; animation-iteration-count: infinite; animation-timing-function: linear; }
/* 夜里这几朵只是远天的旧云影，别和月亮边上的云抢戏 */
body[data-night="1"] .cloud path { fill: #293536; stroke: #59675F; }
body[data-night="1"] .cloud { opacity: .2; filter: blur(.6px) brightness(.85); }
</style>
