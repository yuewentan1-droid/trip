<script setup>
import { computed, ref, watch } from 'vue';
import { DIMS, dimOf } from '../constants/dimensions';
import Glyph from './Glyph.vue';
import PenText from './PenText.vue';

const props = defineProps({
  t: Object,
  frozen: Boolean,
  i: { type: Number, default: 0 },
  fold: { type: Number, default: 0 }
});
const emit = defineEmits(['edit', 'del', 'secret', 'resize', 'view']);

// 页面里先只露三十字，长句子自己摊开；点地层时再把它们一起收回去
const open = ref(false);
const chars = computed(() => [...(props.t.content || '')]);
const canFold = computed(() => chars.value.length > 30);
const shown = computed(() => open.value || !canFold.value
  ? props.t.content
  : chars.value.slice(0, 30).join('') + '…');
watch(open, () => emit('resize'));
watch(() => props.fold, () => (open.value = false));

// 维度决定往哪边偏，内容决定偏多少；宽窄、倾角、间距也各走各的，长河才不像一列聊天框
const h = [...(props.t.content || '')].reduce((a, c) => (a * 31 + c.codePointAt(0)) >>> 0, 5);
const seg = s => (h >>> s) % 100;
const side = DIMS.findIndex(d => d.key === props.t.dimension) % 2 ? 1 : -1;
const style = {
  '--dx': (side > 0 ? 3 + seg(4) / 100 * 6 : 10 + seg(4) / 100 * 9) + (props.i % 3) + '%',
  '--rot': (seg(15) / 100 * 4 - 2) + 'deg',
  '--gap': 16 + seg(21) / 100 * 26 + 'px',
  '--r': ['var(--r-a)', 'var(--r-b)', 'var(--r-soft)'][seg(27) % 3],
  '--c': dimOf(props.t.dimension).color
};
</script>

<template>
  <article class="t-drop" :class="{ frozen }" :style="style" @click="$emit('edit', t)">
    <PenText class="body" :text="shown"/>
    <figure v-if="t.img" class="t-photo" title="点开看大图" role="button" tabindex="0"
      @click.stop="$emit('view', t)" @keydown.enter.stop="$emit('view', t)">
      <img :src="t.img" alt="" loading="lazy"/>
    </figure>
    <footer>
      <span class="leaf">{{ t.dimension }}</span>
      <span class="lv">第 {{ t.level }} 层</span>
      <time>{{ (t.created_at || '').slice(5, 16) }}</time>
      <span class="acts">
        <button v-if="canFold" class="more" type="button" :aria-expanded="open"
          @click.stop="open = !open"><Glyph name="expand" :size="22"/>{{ open ? '收起来' : '摊开看' }}</button>
        <button class="secret" :class="{ off: t.visible === 0 }" type="button"
          :title="t.visible === 0 ? '放回院里，路过的人也能看见' : '这一滴只给自己看'"
          @click.stop="$emit('secret', t)">
          <Glyph :name="t.visible === 0 ? 'leaf' : 'umbrella'" :size="19"/>{{ t.visible === 0 ? '放出来' : '只给自己' }}
        </button>
        <button v-if="!frozen" class="del" title="拔掉这条" @click.stop="$emit('del', t)"><Glyph name="trash" :size="30"/></button>
      </span>
    </footer>
  </article>
</template>

<style scoped>
.t-drop {
  position: relative; width: fit-content; min-width: min(220px, calc(100% - var(--dx)));
  margin: 0 auto var(--gap) var(--dx);
  /* 内容有多长纸就铺多长，往右边长出去；到边了才收住 */
  max-width: calc(100% - var(--dx));
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
.body { display: block; white-space: pre-wrap; word-break: break-word; font-size: var(--fs-read); line-height: 1.95; }
/* 配的照片也压在这张纸里，不另开一块 */
.t-photo { width: min(260px, 100%); margin: 5px 0 2px; cursor: zoom-in; }
.t-photo img { display: block; width: 100%; max-height: 190px; object-fit: cover;
  border-radius: var(--r-c); box-shadow: inset 0 0 0 1.2px rgba(150, 133, 100, .4); }
.more { display: inline-flex; align-items: center; gap: 4px;
  font-size: var(--fs-sm); color: var(--ink-faint); letter-spacing: .04em;
  text-decoration: underline dashed rgba(139, 122, 92, .5) 1px; text-underline-offset: 3px; }
.more .gl { opacity: .7; }
.more:hover { color: var(--wood); }
/* 这一滴只给自己看：伞一收，外人院里就翻不到了 */
.secret { display: inline-flex; align-items: center; gap: 4px;
  font-size: var(--fs-sm); color: var(--ink-faint); letter-spacing: .04em;
  text-decoration: underline dashed rgba(139, 122, 92, .45) 1px; text-underline-offset: 3px; }
.secret .gl, .secret :deep(.gl) { opacity: .65; }
.secret:hover, .secret.off { color: var(--wood); }
footer { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; margin-top: 4px; }
.leaf { background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--ink);
  box-shadow: inset 0 0 0 1.1px color-mix(in srgb, var(--c) 45%, transparent); }
.lv, time { font-size: var(--fs-sm); color: var(--ink-faint); white-space: nowrap; }
time { flex: 1; }
/* 摊开和拔掉挨在一起，收在同一行里，纸窄了也是整块换行 */
.acts { display: inline-flex; align-items: center; gap: 8px; flex: none; }
.del { color: var(--ink-faint); opacity: 0; transition: opacity .3s, color .3s; }
.t-drop:hover .del { opacity: .7; }
.del:hover { color: var(--clay); opacity: 1; }
.frozen { filter: saturate(.5) sepia(.16); }

/* 手机上错落感照旧，只是别再窄到一行只剩三五个字 */
@media (max-width: 620px) {
  .t-drop { padding: 6px 14px 8px 16px; }
  .body { font-size: var(--fs-read); }
}
</style>
