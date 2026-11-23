<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { useUser } from '../store/user';
import Glyph from './Glyph.vue';
import ModalSprig from './ModalSprig.vue';

const user = useUser();
const show = computed(() => user.isLogin && user.user?.tour_seen === 0);

const STOPS = [
  { g: 'sprout', h: '在原野挑一块地', p: '点藤上的一个题目，起个名，写下此刻最想问自己的那句话。' },
  { g: 'pen', h: '一层层往下挖', p: '每写三滴，往下多一层；换个角度，就在左边换一支笔。' },
  { g: 'scroll', h: '压一道地层', p: '写到想留住的地方，存个档。往后回看，还认得这一层。' },
  { g: 'archive', h: '封存后种进院子', p: '一块地聊完就封存。挂树上、种地上，或者交给风。' },
  { g: 'chat', h: '去别人的院子串门', p: '敞着的门直接进，围着的先敲一敲；篱笆上还能留句话。' },
  { g: 'home', h: '回自己的小院收拾', p: '改名字、换笔风、开合篱笆；我的田地里能翻土、找地、采回叶子。' }
];

function close() {
  // 头一回进院的人看完这页，左边藤上再留一次回原野/回田地的木牌提示
  if (user.user?.tour_seen === 0) localStorage.setItem('bvineTip:' + user.user.username, '1');
  user.doneTour().catch(() => {});
}
const onKey = e => { if (e.key === 'Escape' && show.value) close(); };
onMounted(() => addEventListener('keydown', onKey));
onBeforeUnmount(() => removeEventListener('keydown', onKey));
</script>

<template>
  <Teleport to="body">
    <Transition name="walk">
      <div v-if="show" class="mask walk-mask" @click.self="close">
        <section class="modal walk" role="dialog" aria-modal="true" aria-labelledby="walk-title">
          <ModalSprig/>
          <header class="walk-head">
            <p class="walk-kicker">头一回进院</p>
            <h2 id="walk-title">先认认路，往后就自己走</h2>
            <p>六件事，看个大概就行。这一页只来一次。</p>
          </header>

          <ol class="walk-path">
            <svg class="walk-stem" viewBox="0 0 24 100" preserveAspectRatio="none" aria-hidden="true">
              <path d="M12 1 C 3 16, 20 28, 11 43 C 3 57, 19 69, 11 82 C 5 92, 13 97, 12 99"/>
            </svg>
            <li v-for="(s, i) in STOPS" :key="s.h" :style="{ '--tone': ['#4F6B3A', '#8B6B4A', '#C9A24B', '#B07A55', '#7E9FAE', '#8C7C94'][i] }">
              <span class="walk-mark"><Glyph :name="s.g" :size="22"/></span>
              <span class="walk-copy"><b>{{ s.h }}</b><span>{{ s.p }}</span></span>
            </li>
          </ol>

          <footer class="walk-foot">
            <span>关掉以后不碍事；左边藤上的木牌只挂这一回。</span>
            <button class="btn" @click="close">知道了，进去</button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.walk-mask { padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right))
  max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left)); }
.walk { display: flex; flex-direction: column; overflow: hidden;
  width: min(680px, 94vw); padding: 26px 32px 22px;
  max-height: min(88dvh, calc(100dvh - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom))); }
.walk-head { position: relative; z-index: 1; padding-right: 20px; }
.walk-kicker { font-size: var(--fs-sm); letter-spacing: .16em; color: var(--grass-deep); }
.walk-head h2 { margin: 3px 0 5px; font-size: var(--fs-title); font-weight: normal; letter-spacing: .05em; }
.walk-head p { font-size: var(--fs-sm); color: var(--ink-faint); letter-spacing: .04em; }

.walk-head, .walk-foot { flex: none; }
.walk-path { position: relative; z-index: 1; flex: 1 1 auto; min-height: 0; overflow-y: auto;
  overscroll-behavior: contain; scrollbar-width: none; list-style: none; margin-top: 18px; padding-right: 4px; }
.walk-path::-webkit-scrollbar { display: none; }
.walk-stem { position: absolute; left: 19px; top: 8px; width: 22px; height: calc(100% - 16px);
  overflow: visible; fill: none; stroke: var(--grass); stroke-width: 1.2; stroke-linecap: round;
  opacity: .48; filter: url(#boil-soft); }
.walk-stem path { vector-effect: non-scaling-stroke; }
.walk-path li { position: relative; display: grid; grid-template-columns: 40px minmax(0, 1fr);
  gap: 12px; align-items: start; padding: 7px 0; }
.walk-mark { display: grid; place-items: center; width: 40px; height: 40px;
  color: var(--tone); background: var(--paper);
  border-radius: 46% 54% 48% 52% / 54% 46% 52% 48%;
  box-shadow: inset 0 0 0 1.2px color-mix(in srgb, var(--tone) 42%, transparent);
  transform: rotate(-2deg); }
.walk-path li:nth-child(2n) .walk-mark { transform: rotate(2deg); }
.walk-copy { display: flex; flex-direction: column; gap: 1px; padding-top: 1px; }
.walk-copy b { font-weight: normal; font-size: var(--fs-base); color: var(--ink); letter-spacing: .04em; }
.walk-copy span { font-size: var(--fs-sm); line-height: 1.7; color: var(--ink-soft); letter-spacing: .03em; }

.walk-foot { display: flex; align-items: center; justify-content: space-between; gap: 14px;
  margin-top: 18px; padding-top: 14px; border-top: 1.1px dashed rgba(150, 133, 100, .4); }
.walk-foot > span { font-size: var(--fs-sm); color: var(--ink-faint); letter-spacing: .03em; }
.walk-foot .btn { flex: none; }
.walk-enter-active, .walk-leave-active { transition: opacity .45s ease, transform .45s ease; }
.walk-enter-from, .walk-leave-to { opacity: 0; transform: translateY(14px) rotate(-.4deg); }

@media (max-width: 620px) {
  .walk { width: 100%; padding: 22px 18px 16px;
    max-height: calc(100dvh - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom)); }
  .walk-head h2 { font-size: var(--fs-head); }
  .walk-path { margin-top: 13px; }
  .walk-path li { grid-template-columns: 34px minmax(0, 1fr); gap: 10px; padding: 6px 0; }
  .walk-mark { width: 34px; height: 34px; }
  .walk-mark :deep(.gl) { --s: 19px !important; }
  .walk-stem { left: 16px; }
  .walk-copy b { font-size: var(--fs-md); }
  .walk-copy span { font-size: var(--fs-sm); }
  .walk-foot { flex-wrap: wrap; gap: 9px; margin-top: 13px; padding-top: 11px; }
  .walk-foot > span { width: 100%; }
  .walk-foot .btn { width: 100%; text-align: center; }
}
</style>
