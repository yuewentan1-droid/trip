<script setup>
import { computed, ref, watch } from 'vue';
import { dimOf } from '../constants/dimensions';
import Glyph from './Glyph.vue';
import Wavy from './Wavy.vue';
import PenText from './PenText.vue';
import FieldPager from './FieldPager.vue';

const props = defineProps({ items: Array, delable: Boolean, peek: Boolean, big: Boolean, fold: { type: Number, default: 0 } });
const emit = defineEmits(['del', 'open', 'close']);

// 一页压五层，多出来的才翻页；新压上去的那层先露头
const PER = 5;
const page = ref(1);
const layers = computed(() => props.items);
const pages = computed(() => Math.max(1, Math.ceil(layers.value.length / PER)));
watch(pages, p => (page.value = Math.min(page.value, p)));
const shown = computed(() => layers.value.slice((page.value - 1) * PER, page.value * PER));

// 哪一层被扒开了：就地摊成一条田埂，不弹窗；一扒开就把中间的种子收回三十字
const open = ref(null);
const gleanOpen = ref([]);
const gk = (m, k) => m.id + '-' + k;
const unfolded = (m, k) => gleanOpen.value.includes(gk(m, k));
const toggleGlean = (m, k) => {
  const key = gk(m, k);
  gleanOpen.value = unfolded(m, k)
    ? gleanOpen.value.filter(x => x !== key)
    : [...gleanOpen.value, key];
};
const toggle = m => {
  if (open.value === m.id) {
    open.value = null;
    gleanOpen.value = [];
    emit('close');
    return;
  }
  open.value = m.id;
  gleanOpen.value = [];
  emit('open', m);
};
watch(page, () => {
  if (open.value) emit('close');
  open.value = null;
  gleanOpen.value = [];
});
watch(() => props.items, list => {
  if (open.value && !list.some(m => m.id === open.value)) {
    open.value = null;
    gleanOpen.value = [];
    emit('close');
  }
});
watch(() => props.fold, () => {
  if (!open.value) return;
  open.value = null;
  gleanOpen.value = [];
  emit('close');
});

const rings = id => Array.from({ length: 4 }, (_, r) => {
  const h = (parseInt(id, 10) * 97 + r * 31) % 100;
  return { rx: 5 + r * 3.6 + h % 3, ry: 3.4 + r * 3 + h % 2, rot: (h % 40) - 20 };
});

// 摊在埂上的每一片都被风吹歪了一点，离埂边的距离也各不一样
const scatter = t => {
  const h = [...t.content].reduce((a, c) => (a * 31 + c.codePointAt(0)) >>> 0, 5);
  return { '--c': dimOf(t.dimension).color, '--mx': (h >>> 3) % 9 + '%', '--rot': ((h >>> 11) % 15 - 7) / 9 + 'deg' };
};

// 五十个字一行，超过就换行；纸再窄，字也不挤成一团
const lines50 = s => String(s).split('\n').flatMap(p => {
  const chars = [...p];
  return Array.from({ length: Math.max(1, Math.ceil(chars.length / 50)) },
    (_, i) => chars.slice(i * 50, i * 50 + 50).join(''));
});
const long = t => [...t.content].length > 30;
const peekText = (t, m, k) => {
  if (!props.peek || unfolded(m, k)) return t.content;
  const chars = [...t.content];
  return chars.length > 30 ? chars.slice(0, 30).join('') + '…' : t.content;
};

// 埂上随手长出来的几棵：花、叶、芽，位置由层号定，不排队
const SPRIG = ['leaf', 'sakura', 'sprout', 'daisy', 'blossom'];
const verge = m => Array.from({ length: 4 }, (_, i) => {
  const h = (parseInt(m.id, 10) * 53 + i * 37) % 100;
  return { g: SPRIG[(h >>> 2) % 5], s: 12 + h % 7, x: 5 + (h * 3.7) % 86, rot: (h % 46) - 23 };
});
</script>

<template>
  <div class="earth" :class="{ big, peek }">
    <TransitionGroup name="strata" tag="div" class="stack">
      <div v-for="(m, i) in shown" :key="m.id" class="tier" :class="{ open: open === m.id }">
        <Wavy v-if="i" class="seam"/>
        <div class="layer rock">
          <svg class="rings" viewBox="0 0 44 44" aria-hidden="true">
            <ellipse v-for="(r, k) in rings(m.id)" :key="k" cx="22" cy="22" :rx="r.rx" :ry="r.ry"
              :transform="`rotate(${r.rot} 22 22)`"/>
          </svg>
          <button class="l-body" @click="toggle(m)">
            <span class="l-t">{{ m.title }}</span>
            <span class="l-s">第 {{ m.level }} 层 · {{ (m.created_at || '').slice(5, 16) }}</span>
            <span v-if="m.note" class="l-n">“{{ m.note }}”</span>
          </button>
          <button v-if="delable" class="l-x" title="抹掉这一层" @click.stop="emit('del', m)"><Glyph name="close" :size="big ? 28 : 14"/></button>
          <!-- 手放上去就先冒一道藤，告诉你这一层能扒开 -->
          <svg class="hint" viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden="true">
            <path d="M4 9 C 40 2, 70 12, 104 5 C 138 -1, 166 10, 196 4"/>
          </svg>
        </div>

        <Transition name="unfurl">
          <div v-if="open === m.id" class="ridge">
            <svg class="vine" viewBox="0 0 200 30" preserveAspectRatio="none" aria-hidden="true">
              <path d="M2 22 C 30 8, 52 26, 80 14 C 108 3, 132 24, 160 12 C 178 5, 190 14, 198 10"/>
              <path d="M44 20 C 42 14, 38 11, 33 10"/>
              <path d="M96 18 C 98 12, 103 9, 108 9"/>
              <path d="M150 16 C 148 10, 143 8, 138 8"/>
            </svg>
            <Glyph v-for="(v, k) in verge(m)" :key="k" class="sprig" :name="v.g" :size="v.s" :boil="false"
              :style="{ left: v.x + '%', '--rot': v.rot + 'deg' }"/>
            <div class="ridge-in">
              <p class="ridge-h">挖到第 {{ m.level }} 层时，手上摊着这些</p>
              <div v-for="(t, k) in m.snapshot.thoughts" :key="k" class="glean" :style="scatter(t)">
                <span class="leaf">{{ t.dimension }}</span>
                <span class="glean-text">
                  <span v-for="(line, j) in lines50(peekText(t, m, k))" :key="j" class="glean-line">
                    <PenText :text="line"/>
                  </span>
                  <button v-if="peek && long(t)" class="glean-more" type="button"
                    :aria-expanded="unfolded(m, k)" @click.stop="toggleGlean(m, k)">
                    <Glyph v-if="big" name="expand" :size="18"/>{{ unfolded(m, k) ? '收起来' : '摊开看' }}
                  </button>
                </span>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </TransitionGroup>

    <FieldPager :page="page" :pages="pages" @go="page = $event"/>
  </div>
</template>

<style scoped>
.earth { position: relative; display: flex; flex-direction: column; }

.layer { position: relative; z-index: 1; display: flex; gap: 9px; align-items: flex-start;
  padding: 9px 9px 11px 7px; cursor: pointer; }
.rings { position: relative; width: 38px; height: 38px; flex: none; margin-top: 3px; opacity: .55;
  transition: opacity .5s; }
.big .rings { width: 48px; height: 48px; margin-top: 2px; }
.big .l-x { padding: 4px 6px; }
.rings ellipse { fill: none; stroke: var(--wood); stroke-width: 1.2; }
.rings ellipse:first-child { fill: rgba(139, 107, 74, .2); stroke: none; }
.tier.open .rings { opacity: .85; }
.l-body { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; text-align: left; flex: 1;
  min-width: 0; transition: color .3s; }
.l-t { font-size: var(--fs-base); line-height: 1.5; word-break: break-word; }
.l-s { font-size: var(--fs-sm); color: var(--ink-faint); }
.l-n { font-size: var(--fs-md); color: var(--wood); }
.l-body:hover .l-t { color: var(--wood); }
.l-x { position: relative; color: var(--ink-faint); line-height: 1; padding: 2px 4px; }
.l-x:hover { color: var(--clay); }
.seam { flex: none; }

.hint { position: absolute; left: 7%; bottom: 1px; width: 86%; height: 12px; pointer-events: none;
  fill: none; stroke: var(--grass-deep); stroke-width: 1.2; stroke-linecap: round;
  opacity: 0; transition: opacity .5s; filter: url(#boil-soft); }
.layer:hover .hint { opacity: .4; }
.tier.open .hint { opacity: 0; }

/* 扒开的那一层就地摊成田埂：一道藤沿着埂走，花和叶子长在藤上 */
.ridge { position: relative; padding: 20px 8px 10px; }
.vine { position: absolute; left: 0; top: 0; width: 100%; height: 26px; overflow: visible;
  fill: none; stroke: var(--grass-deep); stroke-width: 1.3; stroke-linecap: round;
  opacity: .42; filter: url(#boil-soft); }
.sprig { position: absolute; top: 1px; color: var(--grass-deep); opacity: .72; transform: rotate(var(--rot)); }
.ridge-in { position: relative; display: flex; flex-direction: column; gap: 8px; }
.ridge-h { font-size: var(--fs-sm); color: var(--ink-faint); letter-spacing: .06em; padding-left: 3px; }
.glean { display: flex; align-items: flex-start; gap: 9px; font-size: var(--fs-base); padding: 6px 12px 7px;
  margin-left: var(--mx); width: fit-content; max-width: 96%;
  background: radial-gradient(100% 90% at 20% 16%, rgba(94, 83, 64, .045), transparent 62%), var(--card);
  border-radius: var(--r-a); transform: rotate(var(--rot)); }
.glean-text { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.glean-line { display: block; }
.glean-more { display: inline-flex; align-items: center; gap: 4px; align-self: flex-start; margin-top: 1px;
  font-size: var(--fs-sm); color: var(--ink-faint); letter-spacing: .04em;
  text-decoration: underline dashed rgba(139, 122, 92, .5) 1px; text-underline-offset: 3px; }
.glean-more:hover { color: var(--wood); }
.glean .leaf { background: color-mix(in srgb, var(--c) 16%, transparent);
  box-shadow: inset 0 0 0 1.1px color-mix(in srgb, var(--c) 45%, transparent); }

/* 翻页：旧的那层往下沉走，新的那层从底下顶上来 */
.strata-enter-active, .strata-leave-active { transition: opacity .4s, transform .4s; }
.strata-enter-from { opacity: 0; transform: translateY(13px); }
.strata-leave-to { opacity: 0; transform: translateY(8px); }

/* 田埂是掀开土才露出来的，所以从上头落下来，收回去也是往上提 */
.unfurl-enter-active { transition: opacity .5s ease-out, transform .5s cubic-bezier(.22, .8, .26, 1); }
.unfurl-leave-active { transition: opacity .3s, transform .3s; }
.unfurl-enter-from, .unfurl-leave-to { opacity: 0; transform: translateY(-9px); }
</style>
