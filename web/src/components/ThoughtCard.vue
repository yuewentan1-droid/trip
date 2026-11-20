<script setup>
import { DIMS, dimOf } from '../constants/dimensions';
import Glyph from './Glyph.vue';
import PenText from './PenText.vue';

const props = defineProps({ t: Object, frozen: Boolean, i: { type: Number, default: 0 } });
defineEmits(['edit', 'del']);

// 维度决定往哪边偏，内容决定偏多少；宽窄、倾角、间距也各走各的，长河才不像一列聊天框
const h = [...(props.t.content || '')].reduce((a, c) => (a * 31 + c.codePointAt(0)) >>> 0, 5);
const seg = s => (h >>> s) % 100;
const side = DIMS.findIndex(d => d.key === props.t.dimension) % 2 ? 1 : -1;
const style = {
  '--dx': (side > 0 ? 6 + seg(4) / 100 * 9 : 23 + seg(4) / 100 * 12) + (props.i % 3) * 1.5 + '%',
  '--w': 44 + seg(9) / 100 * 30 + '%',
  '--rot': (seg(15) / 100 * 4 - 2) + 'deg',
  '--gap': 16 + seg(21) / 100 * 26 + 'px',
  '--r': ['var(--r-a)', 'var(--r-b)', 'var(--r-soft)'][seg(27) % 3],
  '--c': dimOf(props.t.dimension).color
};
</script>

<template>
  <article class="t-drop" :class="{ frozen }" :style="style" @click="$emit('edit', t)">
    <PenText class="body" :text="t.content"/>
    <footer>
      <span class="leaf">{{ t.dimension }}</span>
      <span class="lv">第 {{ t.level }} 层</span>
      <time>{{ (t.created_at || '').slice(5, 16) }}</time>
      <button v-if="!frozen" class="del" title="拔掉这条" @click.stop="$emit('del', t)"><Glyph name="trash" :size="15"/></button>
    </footer>
  </article>
</template>

<style scoped>
.t-drop {
  position: relative; width: var(--w); margin: 0 auto var(--gap) var(--dx);
  /* 左边已经让给偏移量了，再不加这道闸，窄屏上卡片会顶破右边界 */
  max-width: min(640px, calc(100% - var(--dx)));
  padding: 6px 18px 8px 20px; cursor: pointer; isolation: isolate;
  transform: rotate(var(--rot));
  background: radial-gradient(105% 92% at 24% 18%, rgba(94, 83, 64, .05), transparent 62%),
              radial-gradient(95% 85% at 78% 84%, rgba(94, 83, 64, .035), transparent 64%), var(--card);
  border-radius: var(--r);
  animation: inkIn .85s cubic-bezier(.22, .82, .3, 1) backwards;
  transition: box-shadow .5s;
}
/* 平时只是一片墨痕，凑近才看得见铅笔描的边 */
.t-drop::after { content: ''; position: absolute; inset: -3px -4px; border-radius: var(--r); pointer-events: none;
  border: 1.3px dashed rgba(139, 122, 92, .55); opacity: 0; transition: opacity .45s; filter: url(#ink-blot); }
.t-drop:hover::after { opacity: .8; }
.t-drop:hover { box-shadow: 0 7px 18px rgba(94, 83, 64, .1); }
.body { display: block; white-space: pre-wrap; word-break: break-word; font-size: 16.5px; line-height: 1.95; }
footer { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; margin-top: 4px; }
.leaf { background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--ink);
  box-shadow: inset 0 0 0 1.1px color-mix(in srgb, var(--c) 45%, transparent); }
.lv, time { font-size: 12px; color: var(--ink-faint); white-space: nowrap; }
time { flex: 1; }
.del { color: var(--ink-faint); opacity: 0; transition: opacity .3s, color .3s; }
.t-drop:hover .del { opacity: .7; }
.del:hover { color: var(--clay); opacity: 1; }
.frozen { filter: saturate(.5) sepia(.16); }

/* 手机上错落感照旧，只是别再窄到一行只剩三五个字 */
@media (max-width: 620px) {
  .t-drop { width: max(var(--w), 66%); padding: 6px 14px 8px 16px; }
  .body { font-size: 15.5px; }
}
</style>
