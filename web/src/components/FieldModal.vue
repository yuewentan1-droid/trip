<script setup>
import Glyph from './Glyph.vue';
import ModalSprig from './ModalSprig.vue';

defineProps({ q: Object });
const emit = defineEmits(['done']);
</script>

<template>
  <div class="mask" @click.self="emit('done', false)">
    <div class="modal ask-modal">
      <ModalSprig/>
      <i class="a-edge"/>
      <h3><Glyph v-if="q.icon" :name="q.icon" :size="21"/> {{ q.title }}</h3>
      <p class="a-b">{{ q.body }}</p>
      <div class="m-acts">
        <button class="a-x" @click="emit('done', false)">{{ q.cancel }}</button>
        <button class="btn" @click="emit('done', true)">{{ q.ok }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 问话的纸永远压在最上头：从叶子里夹书、取书，都不能被下头的弹层盖住 */
.mask { z-index: 100; }
/* 弹窗不许滚：话一多就说明该拆成两句说了 */
.ask-modal { overflow: hidden; width: min(360px, 88vw); padding: 18px 22px 16px; border: none;
  max-height: calc(100dvh - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom)); }
/* 歪边画在纸内侧，免得 overflow 把墨晕裁平 */
.a-edge { position: absolute; inset: 1px; border: 1.5px dashed rgba(150, 133, 100, .55);
  border-radius: inherit; pointer-events: none; filter: url(#ink-blot); }
.ask-modal h3 { display: flex; align-items: center; gap: 8px; font-size: var(--fs-base); margin-bottom: 10px; }
.a-b { font-size: var(--fs-md); color: var(--ink-soft); line-height: 1.85; }
/* 两个按钮是同一颗手印盖出来的：一个木色退回，一个草色落定 */
.a-x { display: inline-block; color: var(--wood); font-size: var(--fs-base); padding: 6px 18px 7px;
  border-radius: var(--r-b); background: rgba(139, 107, 74, .09);
  box-shadow: inset 0 0 0 1.4px rgba(139, 107, 74, .34);
  transition: background .4s, transform .4s; }
.a-x:hover { background: rgba(139, 107, 74, .17); transform: rotate(.7deg) translateY(-1px); }
.a-x:active { transform: translateY(1px); box-shadow: inset 0 0 0 1.4px rgba(139, 107, 74, .42); }
/* 话都收小了，盖章的那颗也别端着 */
.ask-modal .m-acts { margin-top: 15px; gap: 10px; }
.ask-modal .btn { font-size: var(--fs-base); padding: 6px 18px 7px; }
</style>
