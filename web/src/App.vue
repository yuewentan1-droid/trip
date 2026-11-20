<template>
  <BoilFilter/>
  <MountainVeil/>
  <router-view />
  <Fireflies />
</template>

<script setup>
import BoilFilter from './components/BoilFilter.vue';
import MountainVeil from './components/MountainVeil.vue';
import Fireflies from './components/Fireflies.vue';
import { usePen } from './store/pen';

usePen().wear();
</script>
