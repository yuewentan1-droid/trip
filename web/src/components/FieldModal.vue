<script setup>
import Glyph from './Glyph.vue';

defineProps({ q: Object });
const emit = defineEmits(['done']);
</script>

<template>
  <div class="mask" @click.self="emit('done', false)">
    <div class="modal ask-modal">
      <i class="a-edge"/>
      <h3><Glyph v-if="q.icon" :name="q.icon" :size="17"/> {{ q.title }}</h3>
      <p class="a-b">{{ q.body }}</p>
      <div class="m-acts">
        <button class="a-x" @click="emit('done', false)">{{ q.cancel }}</button>
        <button class="btn" @click="emit('done', true)">{{ q.ok }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 弹窗不许滚：话一多就说明该拆成两句说了 */
.ask-modal { overflow: hidden; max-height: 80vh; width: min(360px, 88vw); padding: 18px 22px 16px; border: none; }
/* 歪边画在纸内侧，免得 overflow 把墨晕裁平 */
.a-edge { position: absolute; inset: 1px; border: 1.5px dashed rgba(150, 133, 100, .55);
  border-radius: inherit; pointer-events: none; filter: url(#ink-blot); }
.ask-modal h3 { display: flex; align-items: center; gap: 8px; font-size: 15px; margin-bottom: 10px; }
.a-b { font-size: 13px; color: var(--ink-soft); line-height: 1.85; }
.a-x { color: var(--ink-soft); font-size: 13px; padding: 0 2px 1px;
  border-bottom: 1.2px dashed rgba(150, 133, 100, .55); transition: .4s; }
.a-x:hover { color: var(--wood); border-bottom-color: rgba(139, 107, 74, .8); }
/* 话都收小了，盖章的那颗也别端着 */
.ask-modal .m-acts { margin-top: 15px; gap: 10px; }
.ask-modal .btn { font-size: 13.5px; padding: 6px 18px 7px; }
</style>
