<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';

const emit = defineEmits(['go']);
const seedOut = ref(0);
const gust = ref(false);
const leaving = ref(false);
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
let seedTimer, gustTimer, backTimer;

// 每 18~26 秒被风带一下：绒球脱出去，两秒后新的从字底下升起来
function blown() {
  gust.value = true;
  seedOut.value++;
  gustTimer = setTimeout(() => (gust.value = false), 3500);
  backTimer = setTimeout(() => (seedOut.value = 0), 2000);
  seedTimer = setTimeout(blown, 18000 + Math.random() * 8000);
}
onMounted(() => {
  if (!still) seedTimer = setTimeout(blown, 18000 + Math.random() * 8000);
});
onBeforeUnmount(() => {
  clearTimeout(seedTimer);
  clearTimeout(gustTimer);
  clearTimeout(backTimer);
});

function go() {
  if (leaving.value) return;
  leaving.value = true;
  emit('go');
}
</script>

<template>
  <a href="/visits" class="gate" :class="{ gust, leaving }" role="link"
    aria-label="串门，看看别人公开的心田" @click.prevent="go">
    <span class="ridge" aria-hidden="true">
      <svg viewBox="0 0 88 20" fill="none">
        <path class="ridge-line" d="M3 14 C 18 6.5, 38 4.6, 57 6.2 C 70 7.3, 81 10.4, 85 13.4"/>
        <g class="blades left">
          <path pathLength="1" d="M10 15 C 8.4 10, 7.6 7.4, 6.2 5"/>
          <path pathLength="1" d="M13 15 C 13.2 10.2, 13.8 7.8, 15.2 4.8"/>
          <path pathLength="1" d="M16 15 C 17.2 11.2, 19.4 9.2, 21.8 7.4"/>
        </g>
        <g class="blades right">
          <path pathLength="1" d="M72 12.6 C 73.2 8.8, 74.8 6.6, 77 4.6"/>
          <path pathLength="1" d="M75 13 C 77 10, 79.6 8.4, 82.6 7.2"/>
          <path pathLength="1" d="M78 13.4 C 80 11.8, 82.2 10.8, 84.6 10.4"/>
        </g>
      </svg>
    </span>

    <span class="wind">
      <span class="drift-x">
        <span class="drift-y">
          <span class="tremor">
            <span class="tilt">
              <span class="fluff" aria-hidden="true">
                <svg viewBox="0 0 14 16" fill="none">
                  <path d="M7 6.4 C 5.8 3.8, 3.4 2.6, 1.4 2.8 M7 6.4 C 7.2 3.4, 8.6 1.4, 10.6 1 M7 6.4 C 9.8 4.4, 12 4.4, 13 5.6
                    M7 6.4 C 4.8 4.6, 2.8 4.8, 1.2 6 M7 6.4 C 9.4 6.4, 11.4 7.6, 12.4 9.2 M7 6.4 C 5.2 7.8, 4.4 9.6, 4.4 11.6"/>
                  <circle cx="7" cy="6.6" r="1.1"/>
                </svg>
              </span>
              <span class="word">串门</span>
            </span>
          </span>
        </span>
      </span>
    </span>

    <span v-if="seedOut" :key="seedOut" class="seed-fly" aria-hidden="true">
      <svg viewBox="0 0 14 16" fill="none">
        <path d="M7 6.4 C 5.8 3.8, 3.4 2.6, 1.4 2.8 M7 6.4 C 7.2 3.4, 8.6 1.4, 10.6 1 M7 6.4 C 9.8 4.4, 12 4.4, 13 5.6
          M7 6.4 C 4.8 4.6, 2.8 4.8, 1.2 6 M7 6.4 C 9.4 6.4, 11.4 7.6, 12.4 9.2"/>
        <circle cx="7" cy="6.6" r="1.1"/>
      </svg>
    </span>

    <span class="hint">去看看别人种了什么</span>
  </a>
</template>

<style scoped>
.gate { position: fixed; right: 6vw; top: 38%; z-index: 8; display: inline-block;
  padding: 10px 14px 16px; color: #6B5B4A; transition: opacity .3s, transform .3s;
  cursor: pointer; }
.gate.leaving { opacity: 0; transform: translateY(-8px); }
.wind, .drift-x, .drift-y, .tremor, .tilt { display: inline-block; }
.drift-x { animation: gateX 11s ease-in-out infinite alternate; }
.drift-y { animation: gateY 7.3s ease-in-out infinite alternate; }
.tremor { animation: gateTremor 2.1s linear infinite alternate; }
.tilt { animation: gateTilt 9.7s ease-in-out infinite alternate; }
.wind { position: relative; }
.word { display: inline-block; font-size: 17px; font-weight: 400; letter-spacing: 4px;
  padding-left: 4px; transition: transform .2s, color .2s; }
.fluff { position: absolute; left: 50%; top: -14px; width: 14px; height: 16px; margin-left: -7px;
  opacity: .55; transition: opacity .4s; }
.fluff svg, .seed-fly svg { width: 100%; height: 100%; overflow: visible; }
.fluff path, .fluff circle, .seed-fly path, .seed-fly circle {
  stroke: #8A7A66; stroke-width: 1.5; stroke-linecap: round; }
.gust .fluff { opacity: 0; }
.gust .wind { animation: gateGust 3.5s cubic-bezier(.4, 0, .2, 1); }
.seed-fly { position: absolute; left: calc(50% - 7px); top: -14px; width: 14px; height: 16px;
  animation: seedAway 2s ease-out forwards; pointer-events: none; }

.ridge { position: absolute; left: 50%; bottom: 0; width: 88px; height: 20px;
  margin-left: -44px; opacity: .8; pointer-events: none; }
.ridge svg { width: 100%; height: 100%; overflow: visible; }
.ridge-line { stroke: #C9B99A; stroke-width: 1.5; stroke-linecap: round; }
.blades path { stroke: #7E9A5F; stroke-width: 1.2; stroke-linecap: round;
  stroke-dasharray: 1; stroke-dashoffset: 0; opacity: 0; }
.gate:hover .blades path { animation: bladeIn .3s ease-out backwards; opacity: 1; }
.gate:hover .blades path:nth-child(2) { animation-delay: .05s; }
.gate:hover .blades path:nth-child(3) { animation-delay: .1s; }
.gate:hover .word { color: #B85C38; transform: translateY(2px); }
.hint { position: absolute; left: 50%; top: calc(100% + 6px); white-space: nowrap;
  font-size: 12px; color: #8A7A66; letter-spacing: 1.5px; opacity: 0;
  transform: translate(-50%, 6px); transition: opacity .25s, transform .25s; pointer-events: none; }
.gate:hover .hint { opacity: 1; transform: translate(-50%, 0); }

@keyframes gateX { from { transform: translateX(-14px); } to { transform: translateX(14px); } }
@keyframes gateY { from { transform: translateY(-7px); } to { transform: translateY(7px); } }
@keyframes gateTremor {
  0% { transform: translate(-1.2px, .6px); } 25% { transform: translate(.8px, -1.2px); }
  50% { transform: translate(1.2px, 1px); } 75% { transform: translate(-.6px, -.8px); }
  100% { transform: translate(.4px, 1.2px); }
}
@keyframes gateTilt { from { transform: rotate(-2.5deg); } to { transform: rotate(2.5deg); } }
@keyframes gateGust {
  0%, 100% { transform: none; }
  30%, 58% { transform: translate(22px, -22px); }
}
@keyframes seedAway {
  0% { transform: translate(0, 0) rotate(0); opacity: .8; }
  30% { opacity: .65; }
  100% { transform: translate(34px, -46px) rotate(35deg); opacity: 0; }
}
@keyframes bladeIn { from { stroke-dashoffset: 1; opacity: 0; } to { stroke-dashoffset: 0; opacity: 1; } }

@media (max-width: 767px) {
  .gate { left: 20px; bottom: 96px; right: auto; top: auto; }
  .drift-x { animation-name: gateXm; }
  .drift-y { animation-name: gateYm; }
}
@keyframes gateXm { from { transform: translateX(-7px); } to { transform: translateX(7px); } }
@keyframes gateYm { from { transform: translateY(-3.5px); } to { transform: translateY(3.5px); } }

@media (prefers-reduced-motion: reduce) {
  .drift-x, .drift-y, .tremor, .tilt, .wind, .seed-fly { animation: none !important; }
}
</style>
