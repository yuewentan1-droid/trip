<script setup>
// 手绘的横向波浪线：两层存档之间那道分界，笔锋一路抖过去
defineProps({ n: { type: Number, default: 3 } });
</script>

<template>
  <div class="wavy" aria-hidden="true">
    <svg viewBox="0 0 200 12" preserveAspectRatio="none">
      <path v-for="i in n" :key="i"
        :d="`M2 ${3 + i * 2.4} C 26 ${i * 2.4}, 48 ${7 + i * 1.6}, 74 ${3 + i * 2.2} C 100 ${i * 2}, 124 ${8 + i}, 150 ${4 + i * 2} C 170 ${2 + i * 2}, 186 ${6 + i}, 198 ${3 + i * 2.4}`"/>
    </svg>
  </div>
</template>
