<script setup>
import Glyph from './Glyph.vue';

// 田园里的翻页：一根带芽的树枝指路，页码是一片片叶子，当前那片是绿的
const props = defineProps({ page: Number, pages: Number });
const emit = defineEmits(['go']);

const go = p => p >= 1 && p <= props.pages && p !== props.page && emit('go', p);
</script>

<template>
  <nav v-if="pages > 1" class="pager">
    <button class="twig" :disabled="page <= 1" @click="go(page - 1)">
      <svg viewBox="0 0 44 22" aria-hidden="true">
        <path pathLength="1" d="M41 11 C 31 8.5, 20 13.5, 6 11"/>
        <path pathLength="1" d="M13 5 L5 11 L13 17"/>
        <path pathLength="1" d="M27 9.6 C 26 6, 24.5 4, 21.5 2.6"/>
        <path pathLength="1" d="M34 11.6 C 33.6 15, 32 17.4, 29 19"/>
      </svg>
      <span>往回翻翻</span>
    </button>

    <div class="leaves">
      <button v-for="p in pages" :key="p" class="dot" :class="{ on: p === page }"
        :title="'第 ' + p + ' 页'" @click="go(p)">
        <Glyph name="leaf" :size="p === page ? 20 : 16"/>
      </button>
    </div>

    <button class="twig flip" :disabled="page >= pages" @click="go(page + 1)">
      <span>继续往前</span>
      <svg viewBox="0 0 44 22" aria-hidden="true">
        <path pathLength="1" d="M41 11 C 31 8.5, 20 13.5, 6 11"/>
        <path pathLength="1" d="M13 5 L5 11 L13 17"/>
        <path pathLength="1" d="M27 9.6 C 26 6, 24.5 4, 21.5 2.6"/>
        <path pathLength="1" d="M34 11.6 C 33.6 15, 32 17.4, 29 19"/>
      </svg>
    </button>
  </nav>
</template>

<style scoped>
.pager { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 14px; padding: 4px 0 2px; }

.twig { display: inline-flex; align-items: center; gap: 6px; color: var(--ink-soft); font-size: 13px;
  letter-spacing: .06em; padding: 2px 4px 3px; transition: color .4s, transform .45s cubic-bezier(.3, .9, .3, 1); }
.twig svg { width: 34px; height: 17px; fill: none; stroke: currentColor; stroke-width: 1.7;
  stroke-linecap: round; stroke-linejoin: round; filter: url(#boil-soft); overflow: visible; }
.twig:hover:not(:disabled) { color: var(--grass-deep); }
.twig:not(.flip):hover:not(:disabled) { transform: translateX(-4px); }
.twig.flip:hover:not(:disabled) { transform: translateX(4px); }
.twig.flip svg { transform: scaleX(-1); }
.twig:disabled { opacity: .3; cursor: default; }

.leaves { display: flex; align-items: center; gap: 3px; }
.dot { display: inline-flex; color: var(--dry); line-height: 0; padding: 1px 2px;
  transition: color .4s, transform .45s cubic-bezier(.3, .9, .3, 1.2); }
.dot :deep(path) { fill: none; }
.dot:hover { transform: rotate(-12deg) scale(1.12); color: var(--wheat); }
/* 当前这一页是片实心绿叶，别的都是枯黄的轮廓 */
.dot.on { color: var(--grass-deep); transform: rotate(-8deg) scale(1.06); }
.dot.on :deep(path) { fill: rgba(79, 107, 58, .5); }

/* 手机上地方窄：树枝只留箭头，页码叶子挤不下就自己换一行 */
@media (max-width: 560px) {
  .pager { gap: 8px 10px; }
  .twig span { display: none; }
  .leaves { flex-wrap: wrap; justify-content: center; }
}
</style>
