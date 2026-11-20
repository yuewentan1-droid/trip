<script setup>
import { useFontStyle } from '../utils/font';

// 成段的手写字：想法卡、回看页都套这一层，笔风一改，字立刻跟着改
defineProps({ text: String });
const { runs } = useFontStyle();
</script>

<template>
  <span class="pen-text"><i v-for="(r, i) in runs(text)" :key="i" :class="r.cls">{{ r.t }}</i></span>
</template>

<style scoped>
.pen-text { white-space: pre-wrap; word-break: break-word; }
.pen-text i {
  font-style: normal;
  font-family: var(--pen-fam);
  font-weight: var(--pen-w);
  letter-spacing: var(--pen-sp);
  color: var(--pen-ink);
  filter: var(--pen-tex, none);
}
</style>
