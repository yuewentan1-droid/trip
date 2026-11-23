<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Glyph from './Glyph.vue';
import ModalSprig from './ModalSprig.vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  max: { type: Number, default: 500 },
  placeholder: { type: String, default: '' },
  wide: Boolean
});
const emit = defineEmits(['update:modelValue']);

const open = ref(false);
const box = ref(null);
const len = computed(() => [...props.modelValue].length);
// 思考里的水滴摊开时按字数往横里长，写到两百字正好铺满一屏，再多就折行
const wideStyle = computed(() => props.wide
  ? { '--chars': Math.min(200, Math.max(24, len.value)) }
  : null);
const shut = () => (open.value = false);
const esc = e => { if (e.key === 'Escape' && open.value) shut(); };

watch(open, on => {
  if (on) nextTick(() => box.value?.focus());
});
onMounted(() => window.addEventListener('keydown', esc));
onBeforeUnmount(() => window.removeEventListener('keydown', esc));
</script>

<template>
  <button type="button" class="spread-open" title="摊开写" @click="open = true">
    <Glyph name="expand" :size="13"/> 摊开
  </button>

  <Teleport to="body">
    <Transition name="spread">
      <div v-if="open" class="spread-mask" @click.self="shut">
        <section class="spread-sheet" :class="{ wide }" :style="wideStyle" role="dialog" aria-label="摊开写">
          <ModalSprig/>
          <header class="s-head">
            <span><Glyph name="leaf" :size="15"/> 摊开写</span>
          </header>
          <textarea ref="box" :value="modelValue" :maxlength="max" :placeholder="placeholder"
            aria-label="摊开写" @input="emit('update:modelValue', $event.target.value)"/>
          <footer class="s-foot">
            <span>{{ len }} / {{ max }}</span>
            <button type="button" @click="shut">收回来</button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.spread-open { display: inline-flex; align-items: center; gap: 3px; color: var(--ink-faint);
  font-size: var(--fs-sm); letter-spacing: .04em; padding: 1px 0; transition: color .3s; }
.spread-open:hover { color: var(--wood); }

.spread-mask { position: fixed; inset: 0; z-index: 90; display: grid; place-items: center; padding: 4vh 5vw;
  background: rgba(63, 58, 47, .3); }
.spread-sheet { display: flex; flex-direction: column; width: min(760px, 92vw); height: min(70vh, 620px);
  padding: 18px 26px 14px; background: var(--paper); border: 1.5px dashed rgba(150, 133, 100, .55);
  border-radius: var(--r-soft); box-shadow: 0 18px 44px rgba(63, 58, 47, .16); transform: rotate(-.3deg); }
/* 只有思考里的水滴这么摊：字少纸窄，字多纸往两边长，长到屏边就折行 */
.spread-sheet.wide { width: min(94vw, max(760px, calc(560px + var(--chars) * 4.4px)));
  height: min(64vh, 580px); transition: width .35s cubic-bezier(.2, .7, .3, 1); }
.s-head { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding-bottom: 8px; color: var(--wood); font-size: var(--fs-md); letter-spacing: .08em; }
.s-head span { display: inline-flex; align-items: center; gap: 6px; }
.spread-sheet textarea { flex: 1; min-height: 0; width: 100%; padding: 10px 4px; border: none;
  font-size: var(--fs-read); line-height: 1.95; color: var(--ink); background: transparent; }
.spread-sheet textarea:focus { outline: none; }
.s-foot { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 14px;
  padding-top: 8px; border-top: 1.1px dashed rgba(150, 133, 100, .38);
  font-size: var(--fs-sm); color: var(--ink-faint); letter-spacing: .04em; }
.s-foot button { color: var(--wood); font-size: var(--fs-md);
  text-decoration: underline wavy rgba(139, 107, 74, .42) 1px; text-underline-offset: 4px; }
.s-foot button:hover { color: var(--grass-deep); }
.spread-enter-active, .spread-leave-active { transition: opacity .3s, transform .3s; }
.spread-enter-from, .spread-leave-to { opacity: 0; transform: translateY(8px) scale(.99); }

@media (max-width: 560px) {
  .spread-mask { padding: 12px; }
  .spread-sheet { width: 100%; height: min(76vh, 640px); padding: 14px 16px 12px; }
}
</style>
