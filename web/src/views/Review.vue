<template>
  <div v-if="session" class="review">
    <header class="top-nav">
      <div class="logo"><button class="link" @click="router.push('/mine')"><Glyph name="left" :size="18"/></button> 回看这块地</div>
      <nav><button class="btn-ghost" @click="copy"><Glyph name="copy" :size="15"/> 复制这堆想法</button></nav>
    </header>

    <!-- 类型钉在顶上，不跟着想法一起滚走 -->
    <div class="r-head card edge">
      <div class="r-topic">
        <Glyph :name="glyphOf({ name: session.topic_name })" :size="19"/> {{ session.topic_name }}
        <span class="badge">已封存</span>
      </div>
      <h1>{{ session.title }}</h1>
      <p v-if="session.question" class="r-q">“{{ session.question }}”</p>
      <p class="r-meta">一共挖到第 {{ session.level }} 层 · {{ thoughts.length }} 滴想法 · 封存于 {{ (session.ended_at || '').slice(0, 16) }}</p>
      <label class="r-find">
        <Glyph name="leaf" :size="15"/>
        <input v-model="q" placeholder="在这一垅里找一句…" aria-label="搜索想法"/>
        <i v-if="q">{{ matched }} 滴</i>
      </label>
    </div>

    <main class="roll">
      <!-- 左边摊想法，右边压地层：两垅地各走各的 -->
      <div class="furrow">
        <section class="col-dig">
          <TransitionGroup tag="div" name="fall" class="layers">
            <div v-for="b in blocks" :key="b.k" :class="b.t ? 'r-row' : ['r-mark', 'layer-mark']" :style="b.t ? rowStyle(b.t) : null">
              <template v-if="b.t">
                <span class="leaf">{{ b.t.dimension }}</span>
                <PenText :text="b.t.content"/>
              </template>
              <template v-else>
                <svg class="layer-vine" viewBox="0 0 260 26" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M2 18 C 34 7, 62 22, 92 13 C 122 4, 150 21, 182 12 C 208 5, 232 15, 258 10"/>
                  <path d="M58 14 C 55 8, 49 5, 42 5"/>
                  <path d="M146 11 C 150 5, 156 3, 164 4"/>
                </svg>
                <Glyph class="vine-leaf v1" name="leaf" :size="14"/>
                <Glyph class="vine-leaf v2" name="sakura" :size="12"/>
                <Glyph class="vine-leaf v3" name="sprout" :size="13"/>
                <span>第 {{ b.head }} 层</span>
              </template>
            </div>
          </TransitionGroup>
          <p v-if="!blocks.length" class="r-empty">{{ q ? '这一垅里没找着，换个词试试。' : '这一垅还空着。' }}</p>
        </section>

        <aside class="col-kept">
          <div class="r-mark kept-title"><Glyph name="leaf" :size="14"/> —— 压过的地层 ——</div>
          <MilestoneTimeline :items="milestones"/>
        </aside>
      </div>
    </main>

    <!-- 翻页站在麦田前头，钉在窗口下沿，不跟着想法一起滚 -->
    <footer v-if="pages > 1" class="foot">
      <FieldPager :page="page" :pages="pages" @go="page = $event"/>
    </footer>

    <WheatField class="wheat" :n="12" frozen/>
  </div>
  <div v-else class="loading">土还在翻</div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api';
import { dimOf } from '../constants/dimensions';
import { glyphOf } from '../icons';
import { toast } from '../utils/toast';
import WheatField from '../components/WheatField.vue';
import MilestoneTimeline from '../components/MilestoneTimeline.vue';
import FieldPager from '../components/FieldPager.vue';
import PenText from '../components/PenText.vue';
import Glyph from '../components/Glyph.vue';

const route = useRoute();
const router = useRouter();
const session = ref(null);
const thoughts = ref([]);
const milestones = ref([]);
const q = ref('');

onMounted(async () => {
  const d = await api.session(route.params.id);
  session.value = d.session;
  thoughts.value = d.thoughts;
  milestones.value = d.milestones;
});

// 新挖的那一层先摊开；在整块地里找一句话，找到的那层留下
const groups = computed(() => {
  const k = q.value.trim().toLowerCase();
  const map = new Map();
  thoughts.value.forEach(t => {
    if (k && !(t.content + ' ' + t.dimension).toLowerCase().includes(k)) return;
    if (!map.has(t.level)) map.set(t.level, []);
    map.get(t.level).push(t);
  });
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([level, list]) => ({ level, list: list.slice().sort((a, b) => b.id - a.id) }));
});
const matched = computed(() => groups.value.reduce((n, g) => n + g.list.length, 0));
watch(q, () => (page.value = 1));

// 一垅地一页摊四层，挖得比这更深才用得上翻页
const PER = 4;
const page = ref(1);
const pages = computed(() => Math.max(1, Math.ceil(groups.value.length / PER)));
watch(pages, p => (page.value = Math.min(page.value, p)));

// 层标题和想法摊成一条流水，翻页时一起飘走
const blocks = computed(() => groups.value
  .slice((page.value - 1) * PER, page.value * PER)
  .flatMap(g => [{ k: 'h' + g.level, head: g.level }, ...g.list.map(t => ({ k: 't' + t.id, t }))]));

// 回看也不该像看表格：每条想法离左边的距离、倾角都跟着内容走
const rowStyle = t => {
  const h = [...t.content].reduce((a, c) => (a * 31 + c.codePointAt(0)) >>> 0, 5);
  return {
    '--c': dimOf(t.dimension).color,
    '--mx': 1 + (h >>> 3) % 10 + '%',
    '--rot': ((h >>> 11) % 17 - 8) / 12 + 'deg'
  };
};

function copy() {
  const lines = [
    `【${session.value.topic_name}】${session.value.title}`,
    session.value.question ? `问题：${session.value.question}` : '',
    ''
  ];
  thoughts.value.forEach(t => lines.push(`[第${t.level}层 · ${t.dimension}] ${t.content}`));
  if (milestones.value.length) {
    lines.push('', '—— 压过的地层 ——');
    milestones.value.slice().reverse().forEach(m => lines.push(`· ${m.title}${m.note ? '：' + m.note : ''}`));
  }
  navigator.clipboard.writeText(lines.filter(l => l !== '').join('\n'))
    .then(() => toast('全在剪贴板里了'))
    .catch(() => toast('浏览器不让复制，自己截个屏吧'));
}
</script>

<style scoped>
.review { height: 100vh; height: 100dvh; display: flex; flex-direction: column; overflow: hidden; }
/* 回看也不套窄盒子：纸摊开多大就多大，字才不用挤成一团 */
main { flex: 1; min-height: 0; padding: 0 max(24px, 4vw) 18px; }
.foot { flex: none; padding: 6px max(24px, 4vw) 16px; }
.wheat { flex: none; }
/* 题头和下面的两垅地用同一条边，顶上也钉住不跟着滚 */
.r-head { flex: none; margin: 0 max(24px, 4vw) 22px; padding: 20px 28px 22px; border-radius: var(--r-soft); }
.r-topic { font-size: 14px; color: var(--wood); display: flex; align-items: center; gap: 9px; }
.badge { font-size: 12px; border-radius: var(--r-c); padding: 1px 11px 2px; background: rgba(139, 107, 74, .13); color: var(--wood); }
.r-head h1 { font-size: 23px; font-weight: normal; margin: 8px 0 2px; letter-spacing: .05em; }
.r-q { color: var(--ink-soft); }
.r-meta { font-size: 13px; color: var(--ink-faint); margin-top: 8px; }
/* 在纸角找一句：没有方框，只有一道会跟着写的田埂 */
.r-find { display: flex; align-items: center; gap: 6px; width: min(330px, 100%); margin-top: 11px;
  color: var(--ink-faint); border-bottom: 1.2px dashed rgba(150, 133, 100, .45); }
.r-find input { flex: 1; min-width: 0; padding: 3px 0 5px; font-size: 13px; color: var(--ink); background: none; }
.r-find input::placeholder { font-style: italic; color: #B0A898; }
.r-find input:focus { outline: none; }
.r-find:focus-within { color: var(--grass-deep); border-bottom-color: rgba(79, 107, 58, .55); }
.r-find i { font-style: normal; font-size: 11px; color: var(--ink-faint); white-space: nowrap; }

/* 两垅地：宽的那垅摊想法，窄的那垅压地层 */
.furrow { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 34px; align-items: start; }
.col-kept { min-width: 0; }
.r-mark { font-size: 14.5px; color: var(--wood); text-align: center; margin-bottom: 12px; letter-spacing: .2em; }
/* 压过的地层跟着往下走，标题留在土面上 */
.kept-title { position: sticky; top: 0; z-index: 3; padding: 3px 0 8px; margin-bottom: 2px;
  background: var(--paper); display: flex; align-items: center; justify-content: center; gap: 5px; }
/* 层名不写光秃秃的破折号：一根藤从字底下穿过去，叶和花都从开源记号库里来 */
.layer-mark { position: relative; display: flex; align-items: center; justify-content: center;
  min-height: 34px; margin-bottom: 10px; }
.layer-vine { position: absolute; left: 11%; right: 11%; top: 2px; width: 78%; height: 24px;
  fill: none; stroke: var(--grass-deep); stroke-width: 1.2; stroke-linecap: round; opacity: .42;
  filter: url(#boil-soft); }
.vine-leaf { position: absolute; color: var(--grass-deep); opacity: .76; }
.v1 { left: 17%; top: 0; transform: rotate(-24deg); }
.v2 { right: 20%; top: 1px; color: var(--sakura); transform: rotate(18deg); }
.v3 { right: 10%; top: 9px; color: #7E9A5F; transform: rotate(8deg); }
.layer-mark > span { position: relative; padding: 0 8px; background: var(--paper); }
.r-empty { text-align: center; font-size: 13px; color: var(--ink-faint); padding: 22px 0; letter-spacing: .06em; }

.layers { position: relative; margin-bottom: 8px; }
.r-row { display: flex; align-items: flex-start; gap: 12px; padding: 8px 16px 10px 18px; margin: 0 auto 13px var(--mx);
  width: max-content; max-width: 86%;
  background: radial-gradient(100% 90% at 20% 16%, rgba(94, 83, 64, .045), transparent 62%), var(--card);
  border-radius: var(--r-a); transform: rotate(var(--rot)); }
.leaf { background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--ink);
  box-shadow: inset 0 0 0 1.1px color-mix(in srgb, var(--c) 45%, transparent); }

/* 翻页：旧的那一页被风带走，新的那一页从土里冒出来 */
.fall-enter-active { transition: opacity .55s ease-out, transform .55s cubic-bezier(.22, .8, .26, 1); }
.fall-leave-active { transition: opacity .45s, transform .45s; position: absolute; left: 0; right: 0; }
.fall-enter-from { opacity: 0; transform: translateY(18px); }
.fall-leave-to { opacity: 0; transform: translateY(-13px) rotate(-1.4deg); }

/* 窄屏上两垅并不下，就一垅接一垅地顺着看 */
@media (max-width: 880px) {
  .furrow { grid-template-columns: minmax(0, 1fr); gap: 22px; }
  .r-row { max-width: 94%; }
}
</style>
