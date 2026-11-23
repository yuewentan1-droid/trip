<template>
  <BoilFilter/>
  <MountainVeil/>
  <Transition name="night">
    <NightSky v-if="night.on"/>
  </Transition>
  <router-view />
  <Fireflies />
  <PastureTip />
</template>

<script setup>
import { onBeforeUnmount, onMounted } from 'vue';
import BoilFilter from './components/BoilFilter.vue';
import MountainVeil from './components/MountainVeil.vue';
import NightSky from './components/NightSky.vue';
import Fireflies from './components/Fireflies.vue';
import PastureTip from './components/PastureTip.vue';
import { usePen } from './store/pen';
import { useNight } from './store/night';
import { useNotice } from './store/notice';

usePen().wear();
const night = useNight();
night.init();

// 篱笆外的动静自己会来：隔一会儿问一声，切回这页也立刻问
const notice = useNotice();
let beat;
const knockBeat = () => notice.load();
const onVisible = () => { if (document.visibilityState === 'visible') knockBeat(); };
onMounted(() => {
  knockBeat();
  beat = setInterval(knockBeat, 12000);
  addEventListener('focus', knockBeat);
  document.addEventListener('visibilitychange', onVisible);
});
onBeforeUnmount(() => {
  clearInterval(beat);
  removeEventListener('focus', knockBeat);
  document.removeEventListener('visibilitychange', onVisible);
});
</script>

<style>
/* 天黑不是一下扣下来：纸、墨、木色一起慢慢沉 */
.night-enter-active, .night-leave-active { transition: opacity 1.8s ease; }
.night-enter-from, .night-leave-to { opacity: 0; }
</style>
