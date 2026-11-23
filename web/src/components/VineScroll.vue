<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Glyph from './Glyph.vue';

// 纸里那些要滚的地方不挂铁条：两根细藤顺着纸边缠下去，叶子就是读到哪儿
const props = defineProps({ el: { type: Object, default: null } });
const p = ref(0);
const tall = ref(false);
let ro, mo;

function track() {
  const e = props.el;
  if (!e) return;
  const oy = getComputedStyle(e).overflowY;
  const max = e.scrollHeight - e.clientHeight;
  tall.value = (oy === 'auto' || oy === 'scroll') && max > 6;
  p.value = max > 0 ? Math.min(1, Math.max(0, e.scrollTop / max)) : 0;
}
function bind() {
  if (!props.el) return;
  props.el.addEventListener('scroll', track, { passive: true });
  props.el.addEventListener('input', track);
  ro = new ResizeObserver(track);
  ro.observe(props.el);
  [...props.el.children].forEach(c => ro.observe(c));
  mo = new MutationObserver(track);
  mo.observe(props.el, { childList: true, subtree: true });
  track();
}
onMounted(async () => {
  await nextTick();
  bind();
});
onBeforeUnmount(() => {
  props.el?.removeEventListener('scroll', track);
  props.el?.removeEventListener('input', track);
  ro?.disconnect();
  mo?.disconnect();
});
watch(() => props.el, async () => {
  await nextTick();
  bind();
});
</script>

<template>
  <div v-show="tall" class="vine-scroll" aria-hidden="true">
    <svg viewBox="0 0 24 100" preserveAspectRatio="none">
      <path class="vs-main" d="M12 -2 C 6 14, 18 29, 11 46 C 4 63, 17 79, 10 102"/>
      <path class="vs-braid" d="M10 1 C 16 15, 6 31, 12 47 C 18 63, 7 78, 13 101"/>
      <path class="vs-twig" d="M11 19 C 17 17, 19 13, 20 9 M11 57 C 5 55, 3 50, 2 46 M10 82 C 16 80, 18 76, 19 72"/>
    </svg>
    <Glyph class="vs-fixed f1" name="leaf" :size="14" :boil="false"/>
    <Glyph class="vs-fixed f2" name="sprout" :size="12" :boil="false"/>
    <Glyph class="vs-bud" name="sakura" :size="12" :boil="false"/>
    <Glyph class="vs-marker" name="leaf" :size="20" :boil="false" :style="{ top: p * 100 + '%' }"/>
  </div>
</template>

<style scoped>
.vine-scroll { position: absolute; right: 0; top: 14px; bottom: 14px; width: 26px;
  z-index: 5; pointer-events: none; }
.vine-scroll svg { display: block; width: 100%; height: 100%; overflow: visible;
  fill: none; stroke: var(--grass-deep); stroke-linecap: round;
  transform-origin: 50% 0; animation: vsSway 11s ease-in-out infinite alternate; }
.vs-main { stroke-width: 1.5; opacity: .5; }
.vs-braid { stroke-width: 1.15; opacity: .7; }
.vs-twig { stroke-width: 1; opacity: .55; }
.vs-fixed { position: absolute; left: 7px; color: var(--grass-deep); opacity: .62; }
.f1 { top: 21%; transform: rotate(24deg); }
.f2 { top: 64%; transform: rotate(-18deg); color: var(--grass); }
.vs-bud { position: absolute; left: 15px; bottom: 7%; color: var(--sakura); opacity: .82;
  transform: translateX(-50%) rotate(15deg); }
.vs-marker { position: absolute; left: 11px; color: var(--grass-deep); opacity: .9;
  transform: translate(-50%, -50%) rotate(22deg);
  transition: top .18s ease-out; animation: vsLeaf 6.5s ease-in-out infinite alternate; }
@keyframes vsSway {
  from { transform: rotate(-.35deg); }
  to { transform: rotate(.45deg); }
}
@keyframes vsLeaf {
  from { transform: translate(-50%, -50%) rotate(14deg); }
  to { transform: translate(-50%, -50%) rotate(30deg); }
}
</style>
