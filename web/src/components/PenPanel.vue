<script setup>
import { PENS } from '../constants/pens';
import { usePen } from '../store/pen';
import Glyph from './Glyph.vue';

const pen = usePen();
const emit = defineEmits(['close']);
</script>

<template>
  <div class="mask" @click.self="emit('close')">
    <div class="modal pen-modal">
      <i class="a-edge"/>
      <h3><Glyph name="pen" :size="21"/> 挑一支笔</h3>
      <div v-for="(list, g) in PENS" :key="g" class="pen-group">
        <label>{{ g === 'zh' ? '中文笔风' : '英文笔风' }}</label>
        <div class="pen-row">
          <button v-for="p in list" :key="p.id" :class="['p-' + p.id, { on: pen[g] === p.id }]" @click="pen.pick(g, p.id)">
            <b>{{ p.sample }}</b>
            <span>{{ p.label }}</span>
          </button>
        </div>
      </div>
      <div class="m-acts">
        <button class="btn-ghost" @click="emit('close')">关上</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 弹窗不许滚：十支笔两排摆得下，摆不下就该换摆法 */
.pen-modal { overflow: hidden; max-height: 82vh; width: min(430px, 92vw); padding: 22px 26px 18px; border: none; }
.a-edge { position: absolute; inset: 1px; border: 1.5px dashed rgba(150, 133, 100, .55);
  border-radius: inherit; pointer-events: none; filter: url(#ink-blot); }
.pen-modal h3 { display: flex; align-items: center; gap: 9px; font-size: 17px; font-weight: normal; margin-bottom: 14px; }
.pen-group label { display: block; font-size: 13px; color: var(--ink-soft); margin-bottom: 6px; }
.pen-group + .pen-group { margin-top: 14px; }
.pen-row { display: flex; flex-wrap: wrap; gap: 8px 7px; }
.pen-row button {
  display: inline-flex; align-items: baseline; gap: 7px; padding: 5px 13px 6px;
  color: var(--pen-ink); font-family: var(--pen-fam); font-weight: var(--pen-w); letter-spacing: var(--pen-sp);
  border-radius: var(--r-c); box-shadow: inset 0 0 0 1.2px rgba(150, 133, 100, .3);
  transition: background .35s, box-shadow .35s, transform .35s;
}
.pen-row button b { font-size: 19px; font-weight: inherit; line-height: 1.2;
  display: inline-block; transform: skewY(var(--pen-slant)); filter: var(--pen-tex, none); }
.pen-row button span { font-size: 12.5px; color: var(--ink-soft); font-family: var(--font-main); letter-spacing: .04em; }
.pen-row button:hover { background: rgba(139, 107, 74, .08); transform: rotate(-.6deg); }
.pen-row button.on { box-shadow: inset 0 0 0 1.5px rgba(79, 107, 58, .55); background: rgba(79, 107, 58, .09); }
.pen-row button.on span { color: var(--grass-deep); }
</style>
