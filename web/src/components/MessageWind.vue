<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import Glyph from './Glyph.vue';

// 官方那块田不种树：各家的留言都交给风，一屏最多挂四百句
const props = defineProps({
  notes: { type: Array, default: () => [] },
  total: { type: Number, default: 0 }
});
const emit = defineEmits(['open', 'all']);

const CAP = 400;
const TONES = ['var(--grass-deep)', 'var(--wood)', 'var(--grass)', 'var(--wheat)', 'var(--sky)',
  'var(--clay)', 'var(--lilac)', 'var(--sakura)'];
const GLYPHS = ['note', 'notebook', 'scroll', 'quote', 'chat', 'send', 'pen', 'heart'];
const hash = s => [...String(s)].reduce((h, c) => (h * 31 + c.codePointAt(0)) >>> 0, 7);
// 两串互质的步长：种子挨个撒下去，近看也不站成一垄
const STEP_X = .7548776662;
const STEP_Y = .5698402910;

// 手机屏放不下四百片纸：只留最近八十句，仍旧铺满整块院子的高度
const narrow = ref(innerWidth <= 720);
const onResize = () => (narrow.value = innerWidth <= 720);
onMounted(() => addEventListener('resize', onResize));
onBeforeUnmount(() => removeEventListener('resize', onResize));

const seeds = computed(() => {
  const list = props.notes.slice(0, narrow.value ? 80 : CAP);
  return list.map((m, i) => {
    const h = hash(m.id + m.content);
    const left = 3 + (i * STEP_X % 1) * 94 + ((h >>> 9) % 9 - 4) * .35;
    const top = 4 + (i * STEP_Y % 1) * 92 + ((h >>> 13) % 9 - 4) * .7;
    // 风里只先露十到十五个字；想看全句就顺着这张纸去留言页
    const full = [...String(m.content || '')];
    const cap = 10 + (h >>> 29) % 6;
    const cut = full.length > cap;
    return {
      ...m,
      face: (m.nickname || '田')[0],
      glyph: GLYPHS[h % GLYPHS.length],
      tone: TONES[(h >>> 5) % TONES.length],
      left, top,
      rot: (h >>> 17) % 40 - 20,
      size: (narrow.value ? 26 : 30) + (h >>> 21) % (narrow.value ? 5 : 10),
      say: full.slice(0, cap).join('') + (cut ? '…' : ''),
      cut,
      dx: 7 + (h >>> 24) % 15,
      dy: 5 + (h >>> 27) % 12,
      dur: 18 + (h >>> 3) % 15,
      delay: -(h % 20),
      in: (.2 + (h >>> 6) % 80 / 100).toFixed(2),
      align: left > 82 ? 'right' : left < 18 ? 'left' : 'center',
      down: top < 25,
      wisp: i % 4 === 0
    };
  });
});
const seedStyle = n => ({
  left: n.left + '%', top: n.top + '%',
  '--rot': n.rot + 'deg', '--tone': n.tone,
  '--dx': n.dx + 'px', '--dy': n.dy + 'px', '--dur': n.dur + 's', '--delay': n.delay + 's', '--in': n.in
});
</script>

<template>
  <div class="mwind">
    <p v-if="!seeds.length" class="mwind-empty">风里还没有话，等一个路过的人开口。</p>
    <button v-for="n in seeds" :key="n.id" class="mseed" :style="seedStyle(n)"
      :aria-label="`${n.nickname}：${n.say}${n.cut ? '，点开看全句' : ''}`" @click="emit('open', n)">
      <span class="mfly">
        <svg v-if="n.wisp" class="mwind-wisp" viewBox="0 0 56 22" aria-hidden="true">
          <path d="M2 16 C 14 8, 25 20, 37 12 C 44 7, 50 9, 54 4"/>
          <path d="M10 8 C 19 3, 29 10, 39 5"/>
        </svg>
        <Glyph :name="n.glyph" :size="n.size"/>
      </span>
      <span class="mcard" :class="[n.align, { down: n.down }]">
        <span class="mface">{{ n.face }}</span>
        <span class="mbody">
          <b>{{ n.nickname }}</b>
          <span class="msay">{{ n.say }}</span>
          <span v-if="n.cut" class="mmore"><Glyph name="expand" :size="10"/> 点开看全句</span>
        </span>
      </span>
    </button>
    <button v-if="seeds.length" class="mwind-all" @click="emit('all')">
      风里 {{ total }} 句话 · 摊开看全部
    </button>
  </div>
</template>

<style scoped>
.mwind { position: absolute; inset: 0; z-index: 30; pointer-events: none; }
.mseed { position: absolute; display: inline-flex; align-items: center; justify-content: center;
  min-width: 40px; min-height: 40px; color: var(--tone, var(--wood));
  transform: translate(-50%, -50%); pointer-events: auto;
  animation: mwindIn .8s ease-out var(--in) backwards; }
.mseed:hover, .mseed:focus-visible { z-index: 40; color: var(--wood); }
.mfly { position: relative; display: inline-flex; transform-origin: 50% 70%;
  animation: mFloat var(--dur) ease-in-out var(--delay) infinite; }
.mseed:hover .mfly, .mseed:focus-visible .mfly { animation-play-state: paused; }
.mseed :deep(.gl) { filter: drop-shadow(0 2px 2px rgba(94, 83, 64, .13)); }
.mwind-wisp { position: absolute; right: calc(100% - 2px); top: 50%; width: 36px; height: 16px;
  margin-top: -8px; overflow: visible; fill: none; stroke: var(--sky); stroke-width: 1;
  stroke-linecap: round; opacity: .3; pointer-events: none; }
.mwind-wisp path { stroke-dasharray: 24 11; animation: mwWisp 3.2s linear infinite; }

/* 风里的纸被手一碰就摊开：先露人脸和十来个字，想看全的再点去留言页 */
.mcard { position: absolute; left: 50%; bottom: calc(100% + 9px); z-index: 2;
  display: none; align-items: flex-start; gap: 8px; width: min(270px, 72vw);
  padding: 10px 12px 11px; text-align: left;
  background: var(--card); color: var(--ink);
  border: 1.2px dashed rgba(150, 133, 100, .52);
  border-radius: var(--r-a); box-shadow: 0 12px 28px rgba(63, 58, 47, .16);
  transform: translateX(-50%) rotate(-.5deg); }
.mseed:hover .mcard, .mseed:focus-visible .mcard { display: flex; animation: mcardIn .18s ease-out; }
.mcard.down { top: calc(100% + 9px); bottom: auto; }
.mcard.left { left: -6px; transform: rotate(-.7deg); }
.mcard.right { left: auto; right: -6px; transform: rotate(.6deg); }
.mface { display: inline-flex; align-items: center; justify-content: center; flex: none;
  width: 28px; height: 29px; padding-bottom: 1px; line-height: 1;
  border: 1.1px solid color-mix(in srgb, var(--fence) 80%, transparent);
  border-radius: 47% 53% 50% 50% / 52% 48% 54% 46%;
  font-size: var(--fs-sm); color: var(--wood); }
.mbody { display: flex; flex-direction: column; min-width: 0; gap: 2px; }
.mbody b { font-weight: normal; font-size: var(--fs-sm); color: var(--wood);
  letter-spacing: .04em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.msay { font-size: var(--fs-md); line-height: 1.75; color: var(--ink-soft);
  white-space: pre-wrap; word-break: break-word; }
.mmore { display: inline-flex; align-items: center; gap: 3px; margin-top: 4px;
  font-size: var(--fs-xs); color: var(--ink-faint); letter-spacing: .03em; }

.mwind-all { position: absolute; left: 50%; bottom: 12px; z-index: 30; pointer-events: auto;
  transform: translateX(-50%) rotate(-.6deg); padding: 4px 14px 5px; white-space: nowrap;
  font-size: var(--fs-sm); letter-spacing: .06em; color: var(--wood);
  background: color-mix(in srgb, var(--paper) 76%, transparent);
  border-radius: 3px 12px 4px 10px / 10px 4px 12px 5px;
  box-shadow: inset 0 0 0 1.1px rgba(150, 133, 100, .34); }
.mwind-all:hover { color: var(--grass-deep); background: color-mix(in srgb, var(--paper) 94%, transparent); }
.mwind-empty { position: absolute; left: 50%; top: 44%; transform: translate(-50%, -50%);
  font-size: var(--fs-base); letter-spacing: .08em; color: var(--ink-faint); }

@keyframes mFloat {
  0%, 100% { transform: translate(0, 0) rotate(var(--rot)) scale(1); }
  22% { transform: translate(calc(var(--dx) * .55), calc(var(--dy) * -.6)) rotate(calc(var(--rot) + 9deg)) scale(1.04); }
  47% { transform: translate(calc(var(--dx) * .95), calc(var(--dy) * .28)) rotate(calc(var(--rot) - 6deg)) scale(.97); }
  71% { transform: translate(calc(var(--dx) * .2), calc(var(--dy) * .88)) rotate(calc(var(--rot) + 12deg)) scale(1.05); }
  88% { transform: translate(calc(var(--dx) * -.4), calc(var(--dy) * .3)) rotate(calc(var(--rot) - 7deg)) scale(.99); }
}
@keyframes mwWisp { to { stroke-dashoffset: -70; } }
@keyframes mwindIn { from { opacity: 0; scale: .2; } to { opacity: 1; scale: 1; } }
@keyframes mcardIn { from { opacity: 0; translate: 0 4px; } to { opacity: 1; translate: 0 0; } }

body[data-night="1"] .mseed { color: color-mix(in srgb, var(--tone, var(--wood)) 48%, #AEB9AC); }
body[data-night="1"] .mseed :deep(.gl) { opacity: .7; filter: brightness(.74) saturate(.58); }
body[data-night="1"] .mcard { border-color: rgba(148, 160, 176, .22);
  box-shadow: 0 12px 30px rgba(5, 9, 15, .34); }

@media (max-width: 720px) {
  .mseed { min-width: 32px; min-height: 32px; opacity: .82; }
  .mwind-wisp { display: none; }
  .mcard { width: min(230px, 78vw); }
  .mwind-all { bottom: 6px; font-size: calc(var(--fs-sm) - 1px); }
}
</style>
