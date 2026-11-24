<script setup>
import { PENS } from '../constants/pens';
import { usePen } from '../store/pen';
import Glyph from './Glyph.vue';
import ModalSprig from './ModalSprig.vue';

defineProps({ wide: Boolean });
const pen = usePen();
const emit = defineEmits(['close']);
</script>

<template>
  <div class="mask" @click.self="emit('close')">
    <div class="modal pen-modal" :class="{ wide }">
      <ModalSprig/>
      <i class="a-edge"/>
      <button class="pen-close" title="合上" @click="emit('close')"><Glyph name="close" :size="15"/></button>
      <h3><Glyph name="pen" :size="21"/> 挑一支笔</h3>
      <div class="pen-line">
        <div v-for="(list, g) in PENS" :key="g" class="pen-group">
          <label>{{ g === 'zh' ? '中文笔风' : '英文笔风' }}</label>
          <div class="pen-row">
            <button v-for="p in list" :key="p.id" :class="['p-' + p.id, { on: pen[g] === p.id }]" @click="pen.pick(g, p.id)">
              <b>{{ p.sample }}</b>
              <span>{{ p.label }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 十支笔摊在同一行：中文五支靠左，英文五支靠右，谁也不用翻 */
.pen-modal { overflow-x: hidden; overscroll-behavior: contain; width: min(1020px, 96vw);
  padding: 24px 30px 18px; border: none; }
.pen-modal.wide { width: min(1120px, 96vw); padding: 28px 36px 22px; }
.pen-modal.wide h3 { font-size: var(--fs-head); }
.pen-line { display: flex; align-items: flex-end; gap: 20px; }
.pen-group { flex: 1; min-width: 0; }
.pen-group + .pen-group { margin-top: 0; padding-left: 20px; border-left: 1.1px dashed rgba(150, 133, 100, .4); }
.a-edge { position: absolute; inset: 1px; border: 1.5px dashed rgba(150, 133, 100, .55);
  border-radius: inherit; pointer-events: none; filter: url(#ink-blot); }
.pen-modal h3 { display: flex; align-items: center; gap: 9px; font-size: var(--fs-read); font-weight: normal; margin-bottom: 14px; }
.pen-close { display: none; position: absolute; right: 7px; top: 5px; z-index: 3;
  padding: 9px; color: var(--ink-faint); line-height: 0; }
.pen-close:hover { color: var(--wood); }
.pen-group label { display: block; font-size: var(--fs-md); color: var(--ink-soft); margin-bottom: 7px; }
.pen-row { display: flex; flex-wrap: nowrap; gap: 6px; }
.pen-row button {
  flex: 1 1 0; min-width: 0; display: inline-flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 6px 4px 7px;
  color: var(--pen-ink); font-family: var(--pen-fam); font-weight: var(--pen-w); letter-spacing: var(--pen-sp);
  border-radius: var(--r-c); box-shadow: inset 0 0 0 1.2px rgba(150, 133, 100, .3);
  transition: background .35s, box-shadow .35s, transform .35s;
}
.pen-row button b { font-size: var(--fs-title); font-weight: inherit; line-height: 1.15;
  display: inline-block; transform: skewY(var(--pen-slant)); filter: var(--pen-tex, none); }
.pen-row button span { font-size: var(--fs-sm); color: var(--ink-soft); font-family: var(--font-main);
  letter-spacing: .04em; white-space: nowrap; }
.pen-row button:hover { background: rgba(139, 107, 74, .08); transform: rotate(-.6deg); }
.pen-row button.on { box-shadow: inset 0 0 0 1.5px rgba(79, 107, 58, .55); background: rgba(79, 107, 58, .09); }
.pen-row button.on span { color: var(--grass-deep); }
@media (max-width: 640px) {
  .pen-modal, .pen-modal.wide { width: 100%; padding: 19px 14px 15px; }
  .pen-close { display: block; }
  .pen-line { flex-direction: column; align-items: stretch; gap: 12px; }
  .pen-group { flex: 0 0 auto; width: 100%; }
  .pen-group + .pen-group { padding-left: 0; padding-top: 10px;
    border-left: 0; border-top: 1.1px dashed rgba(150, 133, 100, .4); }
  .pen-row { flex-wrap: wrap; justify-content: center; gap: 5px; }
  .pen-row button { flex: 0 1 calc(33.333% - 4px); padding: 5px 2px 6px; }
  .pen-row button span { white-space: normal; line-height: 1.25; }
}
</style>
