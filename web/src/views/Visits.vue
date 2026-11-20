<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api';
import { spoken } from '../utils/time';
import Glyph from '../components/Glyph.vue';
import TreeMark from '../components/TreeMark.vue';
import FieldPager from '../components/FieldPager.vue';

const router = useRouter();
const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'recent', label: '最近有人说话' },
  { key: 'high', label: '树长得高的' }
];
const sort = ref('all');
const items = ref([]);
const total = ref(0);
const page = ref(1);
const ready = ref(false);
const loading = ref(false);
const PER = 10;
const pages = computed(() => Math.max(1, Math.ceil(total.value / PER)));

async function load(p = page.value) {
  loading.value = true;
  try {
    const d = await api.visits({ sort: sort.value, page: p });
    items.value = d.list;
    total.value = d.total;
    page.value = p;
    ready.value = true;
  } finally {
    loading.value = false;
  }
}
function pick(key) {
  if (key === sort.value) return;
  sort.value = key;
  load(1);
}
const open = g => router.push('/garden/' + g.id);

onMounted(() => load(1));
</script>

<template>
  <div class="visits">
    <header class="v-head">
      <button class="vine-home" title="顺着藤蔓回原野" @click="router.push('/')">
        <svg class="back-vine" viewBox="0 0 100 300" preserveAspectRatio="none" aria-hidden="true">
          <path class="stem" d="M28 298 C 14 265, 45 238, 29 204 C 14 172, 40 143, 23 112 C 10 88, 20 56, 51 30"/>
          <path class="twig" d="M27 250 C 17 242, 12 232, 11 220 M31 184 C 43 177, 50 168, 52 157 M25 130 C 14 123, 9 113, 8 102 M38 73 C 49 68, 56 59, 58 49"/>
        </svg>
        <Glyph class="vine-leaf l1" name="leaf" :size="18" :boil="false"/>
        <Glyph class="vine-leaf l2" name="sakura" :size="15" :boil="false"/>
        <Glyph class="vine-leaf l3" name="sprout" :size="17" :boil="false"/>
        <Glyph class="vine-leaf l4" name="daisy" :size="16" :boil="false"/>
        <span class="vine-word"><Glyph name="home" :size="14"/> 回原野</span>
      </button>
      <div class="v-inner">
        <h1>串门</h1>
        <p class="v-sub">—— 别人的几块地，敞着就进，围着就敲</p>
        <nav class="filters" aria-label="挑选门牌">
          <button v-for="f in FILTERS" :key="f.key" :class="{ on: sort === f.key }"
            :aria-pressed="sort === f.key" @click="pick(f.key)">{{ f.label }}</button>
        </nav>
      </div>
    </header>

    <main class="roll">
      <div class="v-inner pad">
        <div v-if="!ready" class="seeds" aria-label="地在翻土">
          <span/><span/><span/>
        </div>

        <template v-else-if="!items.length">
          <div v-if="sort === 'all'" class="empty">
            <svg class="low-fence" viewBox="0 0 190 76" fill="none" aria-hidden="true">
              <g class="ink">
                <path class="post" pathLength="1" d="M22 16 C 20.6 34, 21.8 50, 21 68"/>
                <path class="post" pathLength="1" d="M166 16.4 C 167.4 33, 166.2 50, 167 68.2"/>
                <path class="rail" pathLength="1" d="M14 27 C 38 25.4, 54 28.2, 70 26.6"/>
                <path class="rail" pathLength="1" d="M118 27.2 C 136 28.4, 152 25.6, 174 27"/>
                <path class="rail" pathLength="1" d="M14 45 C 36 46.2, 53 43.8, 70 45.2"/>
                <path class="rail" pathLength="1" d="M118 45.4 C 137 44, 153 47, 174 45.4"/>
                <path class="tuft" pathLength="1" d="M88 66 C 87 61, 86.4 58.4, 85 55.6 M92 66 C 92.2 61, 93 58.6, 94.6 56 M96 66 C 97 62.2, 98.8 60.2, 101 58.4"/>
              </g>
            </svg>
            <p>现在还没有别人的地。</p>
            <p class="soft">不着急，先把自家这块地<br>种出一点样子，<br>风会把人带过来的。</p>
            <router-link class="to-mine" to="/mine">回到我的地</router-link>
          </div>
          <p v-else class="empty-one">这一栏还空着。</p>
        </template>

        <template v-else>
          <div class="grid">
            <article v-for="(g, i) in items" :key="g.id" class="visit-card" tabindex="0" role="link"
              :style="{ '--drop': (i % 6) * 5 + 'px' }" @click="open(g)" @keydown.enter="open(g)">
              <svg class="byline" viewBox="0 0 3 120" preserveAspectRatio="none" aria-hidden="true">
                <path pathLength="1" d="M1.5 119 C 2.3 92, .8 76, 1.4 55 C 2 34, .9 18, 1.5 1"/>
              </svg>
              <span class="avatar">{{ (g.nickname || '田')[0] }}</span>
              <h2>{{ g.garden_name }}</h2>
              <p v-if="g.fenced" class="stat closed"><Glyph name="home" :size="12"/> 门关着，敲一敲</p>
              <p v-else class="stat">种了 {{ g.seed_count }} 粒，长到第 {{ g.top_level }} 层</p>
              <p v-if="g.latest_seed" class="seed">“{{ g.latest_seed }}”</p>
              <div v-if="g.fenced" class="closed-mark">
                <Glyph name="home" :size="29"/>
                <span>篱笆围着，主页还看得见</span>
              </div>
              <div v-else class="silhouette"><i/><TreeMark :count="g.seed_count" :level="g.top_level"/><i/></div>
              <p class="talk">
                <Glyph name="leaf" :size="12"/>
                {{ g.message_count ? `篱笆上 ${g.message_count} 句话` : '篱笆上还静着' }}
              </p>
              <p class="when">{{ spoken(g.last_message_at) }}</p>
            </article>
          </div>
          <div v-if="loading" class="seeds small"><span/><span/><span/></div>
        </template>
      </div>
    </main>

    <footer v-if="ready && pages > 1" class="foot">
      <FieldPager :page="page" :pages="pages" @go="load"/>
    </footer>
  </div>
</template>

<style scoped>
.visits { position: relative; height: 100vh; height: 100dvh; display: flex; flex-direction: column;
  overflow: hidden; padding-left: clamp(72px, 7vw, 112px); }

/* 回原野不摆箭头：一根从左上垂下来的长藤，叶子被风慢慢拨动 */
.vine-home { position: absolute; left: 0; top: 0; z-index: 20; width: clamp(72px, 7vw, 112px);
  height: min(44vh, 360px); color: var(--wood); transform-origin: 35% 0;
  animation: vineSway 27s ease-in-out -8s infinite; }
.back-vine { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
.back-vine .stem { fill: none; stroke: var(--wood); stroke-width: 1.35; stroke-linecap: round;
  opacity: .55; filter: url(#boil-soft); }
.back-vine .twig { fill: none; stroke: var(--wood); stroke-width: 1.05; stroke-linecap: round;
  opacity: .42; filter: url(#boil-soft); }
.vine-leaf { position: absolute; pointer-events: none; color: var(--grass-deep); opacity: .72;
  transform-origin: 20% 50%; filter: url(#boil-soft); }
.vine-leaf.l1 { left: 18%; top: 80%; animation: leafWaver 13s ease-in-out -4s infinite; }
.vine-leaf.l2 { left: 46%; top: 63%; color: #C08C7A; animation: leafWaver 17s ease-in-out -9s infinite reverse; }
.vine-leaf.l3 { left: 13%; top: 40%; color: var(--grass); animation: leafWaver 11s ease-in-out -2s infinite; }
.vine-leaf.l4 { left: 39%; top: 17%; color: #B9A86C; animation: leafWaver 19s ease-in-out -11s infinite reverse; }
.vine-word { position: absolute; left: 50%; top: 9px; transform: translateX(-50%); display: inline-flex;
  align-items: center; gap: 3px; white-space: nowrap; font-size: 12.5px; letter-spacing: .08em;
  color: var(--wood); padding: 2px 5px 3px; border-radius: 3px;
  background: rgba(250, 246, 236, .82); transition: color .4s, background .4s; }
.vine-home:hover .vine-word { color: var(--clay); background: var(--card); }
.vine-home:hover .vine-leaf { color: var(--clay); }
@keyframes vineSway {
  0%, 100% { transform: rotate(-.25deg) translateX(0); }
  21% { transform: rotate(.62deg) translateX(2px); }
  47% { transform: rotate(-.08deg) translateX(-1px); }
  73% { transform: rotate(.48deg) translateX(3px); }
  88% { transform: rotate(.12deg) translateX(1px); }
}
@keyframes leafWaver {
  0%, 100% { transform: rotate(-5deg) translateY(0); }
  29% { transform: rotate(7deg) translateY(-2px); }
  58% { transform: rotate(-2deg) translateY(1px); }
  81% { transform: rotate(10deg) translateY(-1px); }
}

.v-head { flex: none; min-height: 22vh; display: flex; flex-direction: column; justify-content: flex-end;
  padding: 22px 0 18px; position: relative; z-index: 2; }
.v-inner { width: 100%; margin: 0 auto; padding: 0 max(24px, 4vw); }
h1 { font-size: 32px; font-weight: 400; letter-spacing: 2px; color: #3D3229; }
.v-sub { margin-top: 2px; font-size: 14px; letter-spacing: 1px; color: #8A7A66; }
.filters { display: flex; flex-wrap: wrap; gap: 12px 32px; margin-top: 24px; }
.filters button { font-size: 14px; letter-spacing: 1px; color: #8A7A66; padding: 0 0 4px;
  transition: color .3s; }
.filters button:hover { color: var(--wood); }
.filters button.on { color: #3D3229; text-decoration: underline wavy rgba(139, 107, 74, .7) 1px;
  text-underline-offset: 6px; }

main { flex: 1; min-height: 0; }
.pad { padding-bottom: 22px; }
.foot { flex: none; padding: 6px max(24px, 4vw) 16px; }
/* 十块地一页：先六块，再四块；翻页了就换下一捆 */
.grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 30px 22px; align-items: start; padding-top: 8px; }

/* 门牌就是纸上几行字：没有边框，没有卡片底，靠留白站住 */
.visit-card { position: relative; margin-top: var(--drop); padding: 4px 0 18px; cursor: pointer;
  transition: transform .3s cubic-bezier(.25, .1, .25, 1); }
.visit-card:hover { transform: translateX(-3px); }
.byline { position: absolute; left: -14px; top: 0; width: 3px; height: 100%; overflow: visible; }
.byline path { stroke: #8B6B4A; stroke-width: 2; stroke-linecap: round;
  stroke-dasharray: 1; stroke-dashoffset: 1; opacity: 0; transition: stroke-dashoffset .3s, opacity .3s; }
.visit-card:hover .byline path { stroke-dashoffset: 0; opacity: 1; }
.avatar { display: inline-grid; place-items: center; width: 44px; height: 44px;
  border: 1.5px solid #C9B99A; border-radius: 47% 53% 50% 50% / 52% 48% 54% 46%;
  background: transparent; color: var(--wood); font-size: 17px; transition: border-color .2s; }
.visit-card:hover .avatar { border-color: #8B6F47; animation: nod .2s ease-in-out; }
h2 { margin-top: 12px; font-size: 17px; font-weight: 400; letter-spacing: 1px; color: #3D3229; }
.stat { margin-top: 1px; font-size: 12px; letter-spacing: 1.5px; color: #8A7A66; }
.stat.closed { display: inline-flex; align-items: center; gap: 4px; color: #A89880; }
.seed { margin-top: 16px; font-size: 14px; line-height: 1.7; letter-spacing: 1px; color: #5C5044; }
.silhouette { display: flex; align-items: center; gap: 10px; margin-top: 16px; height: 48px; }
.closed-mark { display: flex; align-items: center; justify-content: center; gap: 7px; height: 48px;
  margin-top: 16px; color: #A89880; font-size: 11px; letter-spacing: .06em; }
.closed-mark :deep(svg) { opacity: .65; }
.silhouette i { display: block; width: 30px; height: 1px; background: rgba(150, 133, 100, .45); }
.silhouette i:last-child { flex: 1; max-width: 54px; }
.talk { display: flex; align-items: center; gap: 4px; margin-top: 9px; font-size: 12px;
  letter-spacing: .06em; color: var(--grass-deep); }
.when { margin-top: 3px; font-size: 11.5px; letter-spacing: 1.2px; color: #A89880; }

.seeds { display: flex; justify-content: center; align-items: flex-end; gap: 10px; padding: 16vh 0; }
.seeds span { width: 9px; height: 14px; border: 1.5px solid #8A7A66;
  border-radius: 52% 48% 46% 54% / 60% 56% 44% 40%; opacity: .3;
  animation: seedFall 1.3s ease-in-out infinite; }
.seeds span:nth-child(2) { animation-delay: .2s; }
.seeds span:nth-child(3) { animation-delay: .4s; }
.seeds.small { padding: 32px 0 8px; }
@keyframes seedFall {
  0%, 100% { transform: translateY(-12px); opacity: .22; }
  42% { transform: translateY(0); opacity: .9; }
  62% { transform: translateY(-4px); }
}

.empty { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 5vh 0 8vh; }
.low-fence { width: 190px; height: 76px; overflow: visible; margin-bottom: 18px; }
.low-fence .ink { filter: url(#boil-soft); }
.low-fence path { stroke: #8B6B4A; stroke-width: 1.5; stroke-linecap: round; opacity: .7;
  animation: strokeIn 1s ease-out backwards; }
.low-fence .tuft { stroke: #7E9A5F; opacity: .6; }
.empty p { font-size: 14px; letter-spacing: 1px; color: #5C5044; }
.empty .soft { margin-top: 12px; line-height: 2; color: #8A7A66; }
.to-mine { margin-top: 24px; font-size: 14px; color: var(--wood); letter-spacing: 1px;
  text-decoration: underline wavy rgba(139, 107, 74, .65) 1px; text-underline-offset: 6px; }
.empty-one { text-align: center; padding: 18vh 0; font-size: 14px; letter-spacing: 1px; color: #8A7A66; }

@keyframes nod { 0%, 100% { transform: translateX(0); } 30% { transform: translateX(-1.5px); } 70% { transform: translateX(1.5px); } }

@media (max-width: 1250px) {
  .grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 28px 20px; }
}
@media (max-width: 880px) {
  .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 720px) {
  .visits { padding-left: 54px; }
  .vine-home { width: 54px; height: 250px; }
  .vine-word { writing-mode: vertical-rl; top: 12px; letter-spacing: .16em; padding: 5px 2px; }
  .v-head { min-height: 18vh; }
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 26px 14px; }
  .visit-card { margin-top: 0; }
  .chips, .filters { gap: 10px 22px; }
  .v-inner { padding: 0 14px; }
  .foot { padding: 6px 14px 12px; }
}
@media (max-width: 480px) {
  .grid { grid-template-columns: 1fr; }
}
</style>
