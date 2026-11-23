<script setup>
import { PENS } from '../constants/pens';
import { usePen } from '../store/pen';
import { useScale } from '../store/scale';
import Glyph from './Glyph.vue';
import ModalSprig from './ModalSprig.vue';

defineProps({ wide: Boolean });
const pen = usePen();
const scale = useScale();
const emit = defineEmits(['close']);
</script>

<template>
  <div class="mask" @click.self="emit('close')">
    <div class="modal pen-modal" :class="{ wide }">
      <ModalSprig/>
      <i class="a-edge"/>
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
      <div class="scale-row">
        <div class="scale-copy">
          <b>字号跟着窗口走</b>
          <span>大屏字大一点，小屏字小一点；手机上不变</span>
        </div>
        <button class="scale-switch" :class="{ on: scale.on }" role="switch" :aria-checked="scale.on"
          :aria-label="scale.on ? '关掉字号跟随窗口' : '打开字号跟随窗口'" @click="scale.toggle()">
          <i/>
        </button>
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
/* 字号开关：不跟整块面板抢戏，只留一枚能拨的小扣 */
.scale-row { display: flex; align-items: center; gap: 18px; margin-top: 16px; padding-top: 13px;
  border-top: 1.1px dashed rgba(150, 133, 100, .4); }
.scale-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.scale-copy b { font-size: var(--fs-md); font-weight: normal; color: var(--ink); letter-spacing: .04em; }
.scale-copy span { font-size: var(--fs-sm); color: var(--ink-faint); letter-spacing: .03em; }
.scale-switch { position: relative; flex: none; width: 50px; height: 26px;
  border-radius: 15px 11px 16px 10px / 11px 16px 10px 15px;
  background: rgba(139, 107, 74, .07); box-shadow: inset 0 0 0 1.4px rgba(139, 107, 74, .35);
  transition: background .35s, box-shadow .35s; }
.scale-switch i { position: absolute; top: 3px; left: 4px; width: 18px; height: 18px;
  border-radius: 52% 46% 50% 48%; background: var(--paper); box-shadow: 0 1px 3px rgba(94, 83, 64, .24);
  transition: transform .35s cubic-bezier(.3, .75, .3, 1), background .35s; }
.scale-switch:hover { box-shadow: inset 0 0 0 1.5px rgba(139, 107, 74, .5); }
.scale-switch.on { background: rgba(79, 107, 58, .16); box-shadow: inset 0 0 0 1.4px rgba(79, 107, 58, .5); }
.scale-switch.on i { transform: translateX(22px); background: var(--grass-deep); }
.scale-switch.on:hover { box-shadow: inset 0 0 0 1.5px rgba(79, 107, 58, .62); }
@media (max-width: 640px) {
  .pen-modal, .pen-modal.wide { width: 100%; padding: 19px 14px 15px; }
  .pen-line { gap: 10px; overflow-x: auto; scrollbar-width: none; }
  .pen-line::-webkit-scrollbar { display: none; }
  .pen-group { flex: 0 0 306px; }
  .pen-group + .pen-group { padding-left: 10px; }
  .pen-row { gap: 4px; }
  .pen-row button { padding: 5px 2px 6px; }
  .scale-row { margin-top: 12px; padding-top: 10px; }
}
</style>
