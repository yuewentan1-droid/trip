<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../api';
import BackVine from '../components/BackVine.vue';
import Glyph from '../components/Glyph.vue';
import MessageNotes from '../components/MessageNotes.vue';

const route = useRoute();
const list = ref([]);
const total = ref(0);
const q = ref('');
const ready = ref(false);
let findTimer, foundTimer;

async function load(jump = false) {
  const d = await api.wall({ limit: 400, q: q.value.trim() });
  list.value = d.list;
  total.value = d.total;
  ready.value = true;
  if (jump) focusNote();
}
// 从官方院子的风里点过来，顺着那张纸找到它，不让人自己翻
function focusNote() {
  const id = Number(route.query.focus);
  if (!id) return;
  nextTick(() => {
    const el = document.querySelector(`[data-note="${id}"]`);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.classList.add('found');
    clearTimeout(foundTimer);
    foundTimer = setTimeout(() => el.classList.remove('found'), 2600);
  });
}
function search() {
  clearTimeout(findTimer);
  findTimer = setTimeout(() => load(false), 260);
}
function clearSearch() {
  q.value = '';
  load(false);
}
watch(() => route.query.focus, () => load(true));
onMounted(() => load(true));
onBeforeUnmount(() => {
  clearTimeout(findTimer);
  clearTimeout(foundTimer);
});
</script>

<template>
  <div class="wall-page">
    <BackVine to="/visits"/>
    <header class="w-head">
      <div class="w-inner">
        <h1>留言</h1>
        <p class="w-sub">—— 大家写给官方的话，都摊在这里</p>
        <div class="w-tools">
          <label class="w-find">
            <Glyph name="search" :size="16"/>
            <input v-model="q" maxlength="40" placeholder="找一句话、一个人"
              aria-label="搜留言" @input="search"/>
            <i v-if="q">{{ total }} 句</i>
            <button v-if="q" type="button" @click="clearSearch">收</button>
          </label>
          <router-link class="w-back" to="/visits">回去串门</router-link>
        </div>
      </div>
    </header>

    <main class="roll w-main">
      <div class="w-inner w-pad">
        <div v-if="!ready" class="seeds" aria-label="纸还在风里">
          <span/><span/><span/>
        </div>
        <template v-else>
          <div class="w-body">
            <MessageNotes :list="list" show-text show-garden read-only
              empty="风里还没有话。等一个路过的人开口。"/>
          </div>
          <p v-if="total > list.length" class="w-more">
            只摊开最近 {{ list.length }} 句，风里还有 {{ total - list.length }} 句。
          </p>
        </template>
      </div>
    </main>
  </div>
</template>

<style scoped>
.wall-page { position: relative; height: 100vh; height: 100dvh; display: flex; flex-direction: column;
  overflow: hidden; padding-left: clamp(72px, 7vw, 112px); padding-bottom: env(safe-area-inset-bottom); }

.w-head { flex: none; min-height: 18vh; display: flex; flex-direction: column; justify-content: flex-end;
  padding: max(12px, env(safe-area-inset-top)) 0 10px; position: relative; z-index: 2; }
.w-inner { width: 100%; margin: 0 auto; padding: 0 max(24px, 4vw); }
h1 { font-size: var(--fs-hero); line-height: 1.3; font-weight: 400; letter-spacing: 2px; color: var(--ink); }
.w-sub { margin-top: 2px; line-height: 1.5; font-size: var(--fs-base); letter-spacing: 1px; color: var(--ink-soft); }
.w-tools { display: flex; align-items: flex-end; justify-content: space-between; gap: 14px 28px;
  flex-wrap: wrap; margin-top: 10px; }
/* 找话：一道田埂、一片叶，不摆输入框 */
.w-find { display: flex; align-items: center; gap: 7px; width: min(420px, 100%); color: var(--ink-faint);
  border-bottom: 1.2px dashed rgba(150, 133, 100, .45); transition: color .35s, border-color .35s; }
.w-find input { flex: 1; min-width: 0; padding: 3px 0 5px; font-size: var(--fs-base); color: var(--ink);
  background: none; }
.w-find input::placeholder { color: var(--ink-faint); }
.w-find input:focus { outline: none; }
.w-find:focus-within { color: var(--grass-deep); border-bottom-color: rgba(79, 107, 58, .55); }
.w-find i { font-style: normal; font-size: var(--fs-xs); color: var(--ink-faint); white-space: nowrap; }
.w-find button { flex: none; font-size: var(--fs-xs); color: var(--wood); }
.w-find button:hover { color: var(--grass-deep); }
.w-back { flex: none; font-size: var(--fs-base); color: var(--wood); letter-spacing: .06em;
  text-decoration: underline wavy rgba(139, 107, 74, .5) 1px; text-underline-offset: 5px; }
.w-back:hover { color: var(--grass-deep); }

.w-main { flex: 1; min-height: 0; }
.w-pad { padding-top: 10px; padding-bottom: 30px; }
.w-body :deep(.found) { box-shadow: 0 0 0 1.3px rgba(79, 107, 58, .5), var(--emboss-lift); }
.w-more { padding: 24px 0 8px; text-align: center; font-size: var(--fs-sm);
  letter-spacing: .08em; color: var(--ink-faint); }

.seeds { display: flex; justify-content: center; align-items: flex-end; gap: 10px; padding: 16vh 0; }
.seeds span { width: 9px; height: 14px; border: 1.5px solid var(--ink-soft);
  border-radius: 52% 48% 46% 54% / 60% 56% 44% 40%; opacity: .3;
  animation: seedFall 1.3s ease-in-out infinite; }
.seeds span:nth-child(2) { animation-delay: .2s; }
.seeds span:nth-child(3) { animation-delay: .4s; }
@keyframes seedFall {
  0%, 100% { transform: translateY(-12px); opacity: .22; }
  42% { transform: translateY(0); opacity: .9; }
  62% { transform: translateY(-4px); }
}

@media (max-width: 720px) {
  .wall-page { padding-left: max(60px, env(safe-area-inset-left)); }
  .w-head { min-height: 18vh; padding: max(14px, env(safe-area-inset-top)) 0 14px; }
  .w-inner { padding: 0 max(14px, env(safe-area-inset-right)) 0 max(14px, env(safe-area-inset-left)); }
}
@media (max-width: 480px) {
  h1 { font-size: var(--fs-title); }
  .w-sub { font-size: var(--fs-sm); }
  .w-head { min-height: 0; padding-bottom: 10px; }
  .w-tools { margin-top: 15px; }
  .w-find { width: 100%; }
}
</style>
