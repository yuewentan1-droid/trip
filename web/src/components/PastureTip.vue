<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import Glyph from './Glyph.vue';

const tip = ref(null);
const box = ref(null);
let anchor = null;

const style = computed(() => tip.value && {
  left: tip.value.x + 'px',
  top: tip.value.y + 'px',
  transform: `translate(-50%, ${tip.value.below ? '0' : '-100%'}) rotate(-.8deg)`
});

// title 原生的那口气太硬，换成一块从纸角剪下来的小签，叶子压在字前头
// 签子跟着指尖走：藤蔓整条都是热区时，也不会把签挂到屏幕外头去
async function show(t, cx, cy) {
  tip.value = { text: t.dataset.tip, x: -999, y: -999, below: false };
  await nextTick();
  if (!box.value || anchor !== t) return;
  const r = t.getBoundingClientRect(), b = box.value.getBoundingClientRect();
  const px = cx ?? r.left + r.width / 2, py = cy ?? r.top + r.height / 2;
  const below = py - b.height - 13 < 8;
  const x = Math.max(10 + b.width / 2, Math.min(innerWidth - 10 - b.width / 2, px));
  const y = below
    ? Math.min(innerHeight - 8 - b.height, py + 16)
    : Math.min(innerHeight - 8, py - 13);
  tip.value = { text: t.dataset.tip, x, y, below };
}

function hide() {
  if (anchor?.dataset.tip) {
    anchor.title = anchor.dataset.tip;
    delete anchor.dataset.tip;
  }
  anchor = null;
  tip.value = null;
}

function onOver(e) {
  const t = e.target.closest?.('[title]');
  if (!t || t === anchor) return;
  hide();
  const text = t.getAttribute('title');
  if (!text) return;
  t.dataset.tip = text;
  t.removeAttribute('title');
  anchor = t;
  show(t, e.clientX, e.clientY);
}

function onOut(e) {
  if (!anchor || e.target.closest?.('[data-tip]') !== anchor) return;
  if (e.relatedTarget && anchor.contains(e.relatedTarget)) return;
  hide();
}

const onKey = e => { if (e.key === 'Escape') hide(); };

onMounted(() => {
  document.addEventListener('pointerover', onOver, true);
  document.addEventListener('pointerout', onOut, true);
  document.addEventListener('pointerdown', hide, true);
  addEventListener('scroll', hide, true);
  addEventListener('resize', hide);
  addEventListener('blur', hide);
  addEventListener('keydown', onKey);
});
onBeforeUnmount(() => {
  document.removeEventListener('pointerover', onOver, true);
  document.removeEventListener('pointerout', onOut, true);
  document.removeEventListener('pointerdown', hide, true);
  removeEventListener('scroll', hide, true);
  removeEventListener('resize', hide);
  removeEventListener('blur', hide);
  removeEventListener('keydown', onKey);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="tip">
      <div v-if="tip" ref="box" class="pasture-tip" :class="{ below: tip.below }" :style="style" role="tooltip">
        <Glyph name="leaf" :size="13"/>
        <span>{{ tip.text }}</span>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pasture-tip { position: fixed; z-index: 140; pointer-events: none;
  display: flex; align-items: flex-start; gap: 6px;
  max-width: min(320px, 72vw); padding: 5px 12px 6px 9px;
  color: var(--ink-soft); font-size: var(--fs-sm); line-height: 1.55; letter-spacing: .04em;
  background:
    radial-gradient(120% 90% at 10% 0%, rgba(126, 154, 95, .08), transparent 60%),
    var(--card);
  border: 1.2px dashed rgba(150, 133, 100, .58);
  border-radius: 7px 15px 8px 14px / 14px 7px 15px 8px;
  box-shadow: 0 7px 18px rgba(63, 58, 47, .14),
    inset 0 0 0 3px var(--card), inset 0 0 0 4px rgba(150, 133, 100, .16);
  transform-origin: 50% 100%; }
.pasture-tip :deep(.gl) { flex: none; margin-top: 2px; color: var(--grass-deep); opacity: .78; }
.pasture-tip::after { content: ''; position: absolute; left: 50%; bottom: -5px; width: 9px; height: 9px;
  background: var(--card); border-right: 1.2px dashed rgba(150, 133, 100, .58);
  border-bottom: 1.2px dashed rgba(150, 133, 100, .58);
  transform: translateX(-50%) rotate(45deg); }
.pasture-tip.below { transform-origin: 50% 0; }
.pasture-tip.below::after { bottom: auto; top: -5px; border: 0; border-left: 1.2px dashed rgba(150, 133, 100, .58);
  border-top: 1.2px dashed rgba(150, 133, 100, .58); }
body[data-night="1"] .pasture-tip { border-color: rgba(148, 160, 176, .26);
  box-shadow: 0 7px 18px rgba(5, 9, 15, .34),
    inset 0 0 0 3px var(--card), inset 0 0 0 4px rgba(148, 160, 176, .1); }
body[data-night="1"] .pasture-tip::after { border-color: rgba(148, 160, 176, .26); }
.tip-enter-active, .tip-leave-active { transition: opacity .16s ease, scale .16s ease; }
.tip-enter-from, .tip-leave-to { opacity: 0; scale: .96; }
</style>
