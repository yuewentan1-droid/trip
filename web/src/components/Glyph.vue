<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { ICONS } from '../icons';

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 24 },
  stroke: { type: [Number, String], default: null },
  draw: Boolean,
  // 手绘的墨一律要沸：一屋子记号里只有几笔在抖，看着像别处捡来的
  boil: { type: Boolean, default: true },
  delay: { type: Number, default: 0 }
});

const el = ref(null);
const raw = computed(() => ICONS[props.name] || ICONS.leaf);

// 官方 animated 版的做法：给每笔标 pathLength=1，好让 dash 动画与笔画长短无关
function prime() {
  if (!props.draw || !el.value) return;
  el.value.querySelectorAll('path').forEach((p, i) => {
    p.setAttribute('pathLength', 1);
    p.style.animationDelay = (props.delay + i * 0.26) + 's';
  });
}
onMounted(prime);
watch(raw, prime);
</script>

<template>
  <i ref="el" class="gl" :class="{ draw, boil }" :style="{ '--s': size + 'px', '--w': stroke }" v-html="raw"/>
</template>

<style scoped>
.gl { display: inline-block; width: var(--s); height: var(--s); line-height: 0; flex: none; }
.gl :deep(svg) { display: block; width: 100%; height: 100%; overflow: visible; }
.gl.draw :deep(path) { animation: strokeIn .62s cubic-bezier(.62, .04, .35, 1) backwards; }
.gl.boil :deep(svg) { filter: url(#boil); }
</style>
