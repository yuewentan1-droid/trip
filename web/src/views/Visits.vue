<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api';
import { spoken } from '../utils/time';
import Glyph from '../components/Glyph.vue';
import BackVine from '../components/BackVine.vue';
import TreeMark from '../components/TreeMark.vue';
import VineScroll from '../components/VineScroll.vue';
import FieldPager from '../components/FieldPager.vue';
import FenceDialog from '../components/FenceDialog.vue';

const router = useRouter();
const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'recent', label: '最近有人说话' },
  { key: 'high', label: '树长得高的' }
];
// 城里的六处去处：门都虚掩着，先认认路，等拾掇好了再开
const TOWN = [
  { key: 'market', name: '种子市集', icon: 'sprout', line: '新到的种子还装在麻袋里，没顾上摊开。' },
  { key: 'tea', name: '老茶馆', icon: 'chat', line: '灶上的水刚响，长凳还倒扣在桌上。' },
  { key: 'forge', name: '铁匠铺', icon: 'gear', line: '炉子封着，锤子挂在墙上，等一炉好炭。' },
  { key: 'board', name: '布告墙', icon: 'pin', line: '浆糊刚刷上，头一张告示还空着。' },
  { key: 'post', name: '邮驿', icon: 'send', line: '驿马在槽边吃草，邮袋还没装满。' },
  { key: 'stage', name: '戏台', icon: 'horn', line: '锣鼓还没抬上来，台前的长凳先摆好了。' }
];
const channel = ref('visit');
const townPick = ref(null);
const sort = ref('all');
const q = ref('');
const items = ref([]);
const total = ref(0);
const page = ref(1);
const ready = ref(false);
const loading = ref(false);
const mainBody = ref(null);
const PER = 10;
const pages = computed(() => Math.max(1, Math.ceil(total.value / PER)));
let findTimer;

async function load(p = page.value) {
  loading.value = true;
  try {
    const d = await api.visits({ sort: sort.value, page: p, q: q.value.trim() });
    items.value = d.list;
    total.value = d.total;
    page.value = p;
    ready.value = true;
  } finally {
    loading.value = false;
  }
}
// 找人家：名字、院名、院里那句话都算；停手一息再问
function search() {
  clearTimeout(findTimer);
  findTimer = setTimeout(() => load(1), 260);
}
function clearSearch() {
  q.value = '';
  load(1);
}
onBeforeUnmount(() => clearTimeout(findTimer));
function pick(key) {
  if (key === sort.value) return;
  sort.value = key;
  load(1);
}
// 串门走够了，拐去城里看看；两条路都从纸页最上头重新起头
function goChannel(key) {
  if (key === channel.value) return;
  channel.value = key;
  townPick.value = null;
  mainBody.value.scrollTop = 0;
}
const open = g => router.push('/garden/' + g.id);

onMounted(() => load(1));
</script>

<template>
  <div class="visits">
    <BackVine/>
    <header class="v-head">
      <div class="v-inner">
        <h1 class="v-ways">
          <button :class="{ on: channel === 'visit' }" :aria-pressed="channel === 'visit'"
            @click="goChannel('visit')">串门</button>
          <i aria-hidden="true">·</i>
          <button :class="{ on: channel === 'town' }" :aria-pressed="channel === 'town'"
            @click="goChannel('town')">进城</button>
        </h1>
        <p class="v-sub">{{ channel === 'visit'
          ? '—— 别人的几块地，敞着就进，围着就敲'
          : '—— 田埂走到头，有瓦檐、有炊烟，也有人声' }}</p>
        <div v-if="channel === 'visit'" class="v-tools">
          <nav class="filters" aria-label="挑选门牌">
            <button v-for="f in FILTERS" :key="f.key" :class="{ on: sort === f.key }"
              :aria-pressed="sort === f.key" @click="pick(f.key)">{{ f.label }}</button>
          </nav>
          <label class="v-find">
            <Glyph name="search" :size="16"/>
            <input v-model="q" maxlength="20" placeholder="找一户人家，篱笆上的一个词"
              aria-label="搜人家" @input="search"/>
            <i v-if="q">{{ total }} 户</i>
            <button v-if="q" type="button" @click="clearSearch">收</button>
          </label>
        </div>
      </div>
    </header>

    <div class="main-wrap">
    <main ref="mainBody" class="roll">
      <div class="v-inner pad">
        <template v-if="channel === 'town'">
          <p class="town-lead">
            <Glyph name="flag" :size="14"/>
            城里的路还在铺，这六处门都虚掩着。先认认门，等开张了再来。
          </p>
          <div class="grid">
            <article v-for="(t, i) in TOWN" :key="t.key" class="visit-card town-card" tabindex="0" role="button"
              :style="{ '--drop': (i % 6) * 5 + 'px' }" @click="townPick = t" @keydown.enter="townPick = t">
              <svg class="byline" viewBox="0 0 3 120" preserveAspectRatio="none" aria-hidden="true">
                <path pathLength="1" d="M1.5 119 C 2.3 92, .8 76, 1.4 55 C 2 34, .9 18, 1.5 1"/>
              </svg>
              <span class="avatar town-avatar"><Glyph :name="t.icon" :size="22"/></span>
              <h2>{{ t.name }}</h2>
              <p class="stat closed"><Glyph name="home" :size="12"/> 门还关着</p>
              <p class="seed">{{ t.line }}</p>
              <p class="talk town-go">敲敲看</p>
            </article>
          </div>
        </template>

        <template v-else>
        <div v-if="!ready" class="seeds" aria-label="地在翻土">
          <span/><span/><span/>
        </div>

        <template v-else-if="!items.length">
          <div v-if="q" class="empty">
            <p>篱笆外没找着这户人家。</p>
            <p class="soft">换个名字，或者院里的一句话试试。</p>
            <button class="to-mine" @click="clearSearch">把搜索收起来</button>
          </div>
          <div v-else-if="sort === 'all'" class="empty">
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
              <p v-if="g.opened_fresh" class="stat open-door"><Glyph name="home" :size="12"/> 主人给你开了门</p>
              <p v-else-if="g.fenced" class="stat closed"><Glyph name="home" :size="12"/> 门关着，敲一敲</p>
              <p v-else-if="g.opened" class="stat open-door quiet"><Glyph name="home" :size="12"/> 院门开着</p>
              <p v-else class="stat">种了 {{ g.seed_count }} 粒</p>
              <p v-if="g.latest_seed" class="seed">“{{ g.latest_seed }}”</p>
              <div v-if="g.fenced" class="closed-mark">
                <Glyph name="home" :size="29"/>
                <span>篱笆围着，主页还看得见</span>
              </div>
              <div v-else class="silhouette"><i/><TreeMark :count="g.seed_count || 0" :level="g.top_level || 0"/><i/></div>
              <p class="talk">
                <Glyph name="leaf" :size="12"/>
                {{ g.message_count ? `篱笆上 ${g.message_count} 句话` : '篱笆上还静着' }}
              </p>
              <p class="when">{{ spoken(g.last_message_at) }}</p>
            </article>
          </div>
          <div v-if="loading" class="seeds small"><span/><span/><span/></div>
        </template>
        </template>
      </div>
    </main>
    <VineScroll :el="mainBody"/>
    </div>

    <footer v-if="channel === 'visit' && ready && pages > 1" class="foot">
      <FieldPager :page="page" :pages="pages" @go="load"/>
    </footer>

    <FenceDialog :open="!!townPick" :title="townPick ? townPick.name : '进城'" note="敬请开放" slim keep-close
      @close="townPick = null">
      <div v-if="townPick" class="soon">
        <Glyph :name="townPick.icon" :size="46"/>
        <p class="soon-line">{{ townPick.line }}</p>
        <p class="soon-soft">城里的路还没铺平，门板也刚上过漆。等拾掇利落了，再请你进来坐。</p>
        <button class="to-mine" @click="townPick = null">先在城外站一会儿</button>
      </div>
    </FenceDialog>
  </div>
</template>

<style scoped>
.visits { position: relative; height: 100vh; height: 100dvh; display: flex; flex-direction: column;
  overflow: hidden; padding-left: clamp(72px, 7vw, 112px); padding-bottom: env(safe-area-inset-bottom); }

.v-head { flex: none; min-height: 22vh; display: flex; flex-direction: column; justify-content: flex-end;
  padding: max(18px, env(safe-area-inset-top)) 0 18px; position: relative; z-index: 2; }
.v-inner { width: 100%; margin: 0 auto; padding: 0 max(24px, 4vw); }
h1 { font-size: var(--fs-hero); font-weight: 400; letter-spacing: 2px; color: var(--ink); }
/* 村口两条路：串门在左，进城在右；没走的那条退成灰，像岔路口另一块旧木牌 */
.v-ways { display: flex; align-items: baseline; gap: 9px; }
.v-ways button { letter-spacing: inherit; color: var(--ink-faint); opacity: .5; padding: 0;
  transition: color .3s, opacity .3s; }
.v-ways button.on { color: var(--ink); opacity: 1; }
.v-ways button:hover { color: var(--wood); opacity: .9; }
.v-ways i { font-style: normal; font-size: .58em; color: var(--ink-faint); opacity: .5; }
.v-sub { margin-top: 2px; font-size: var(--fs-base); letter-spacing: 1px; color: var(--ink-soft); }
.v-tools { display: flex; align-items: flex-end; justify-content: space-between; gap: 14px 28px;
  flex-wrap: wrap; margin-top: 24px; }
.filters { display: flex; flex-wrap: wrap; gap: 12px 32px; }
/* 找人家：一道田埂、一片叶，和串门本身一样不摆输入框 */
.v-find { display: flex; align-items: center; gap: 7px; width: min(380px, 100%); color: var(--ink-faint);
  border-bottom: 1.2px dashed rgba(150, 133, 100, .45); transition: color .35s, border-color .35s; }
.v-find input { flex: 1; min-width: 0; padding: 3px 0 5px; font-size: var(--fs-base); color: var(--ink);
  background: none; }
.v-find input::placeholder { font-style: italic; color: #B0A898; }
.v-find input:focus { outline: none; }
.v-find:focus-within { color: var(--grass-deep); border-bottom-color: rgba(79, 107, 58, .55); }
.v-find i { font-style: normal; font-size: var(--fs-xs); color: var(--ink-faint); white-space: nowrap; }
.v-find button { flex: none; font-size: var(--fs-xs); color: var(--wood); }
.v-find button:hover { color: var(--grass-deep); }
.filters button { font-size: var(--fs-head); letter-spacing: 1px; color: var(--ink-soft); padding: 0 0 4px;
  transition: color .3s; }
.filters button:hover { color: var(--wood); }
.filters button.on { color: var(--ink); text-decoration: underline wavy rgba(139, 107, 74, .7) 1px;
  text-underline-offset: 6px; }

.main-wrap { position: relative; flex: 1; min-height: 0; display: flex; }
main { flex: 1; min-width: 0; min-height: 0; }
.pad { padding-bottom: 22px; }
.foot { flex: none; padding: 6px max(24px, 4vw) 16px; }
/* 十块地一页：先六块，再四块；翻页了就换下一捆 */
.grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 30px 22px; align-items: start; padding-top: 8px; }
/* 城里：先摆一排去处，门关着，路先认下 */
.town-lead { display: flex; align-items: center; gap: 6px; padding: 7px 0 1px;
  font-size: var(--fs-sm); letter-spacing: .06em; color: var(--ink-faint); }
.town-lead :deep(.gl) { color: var(--grass-deep); opacity: .7; }
.town-avatar { color: var(--grass-deep); }
.town-card .seed { max-width: 26em; }
.town-go { color: var(--wood); opacity: .82; }

/* 门牌就是纸上几行字：没有边框，没有卡片底，靠留白站住 */
.visit-card { position: relative; margin-top: var(--drop); padding: 4px 0 18px; cursor: pointer;
  transition: transform .3s cubic-bezier(.25, .1, .25, 1); }
.visit-card:hover { transform: translateX(-3px); }
.byline { position: absolute; left: -14px; top: 0; width: 3px; height: 100%; overflow: visible; }
.byline path { stroke: #8B6B4A; stroke-width: 2; stroke-linecap: round;
  stroke-dasharray: 1; stroke-dashoffset: 1; opacity: 0; transition: stroke-dashoffset .3s, opacity .3s; }
.visit-card:hover .byline path { stroke-dashoffset: 0; opacity: 1; }
.avatar { display: inline-flex; align-items: center; justify-content: center; width: 46px; height: 47px;
  padding-bottom: 1px; line-height: 1;
  border: 1.5px solid #C9B99A; border-radius: 47% 53% 50% 50% / 52% 48% 54% 46%;
  background: transparent; color: var(--wood); font-size: var(--fs-read); transition: border-color .2s; }
.visit-card:hover .avatar { border-color: #8B6F47; animation: nod .2s ease-in-out; }
h2 { margin-top: 12px; font-size: var(--fs-read); font-weight: 400; letter-spacing: 1px; color: var(--ink); }
.stat { margin-top: 1px; font-size: var(--fs-sm); letter-spacing: 1.5px; color: var(--ink-soft); }
.stat.closed { display: inline-flex; align-items: center; gap: 4px; color: #A89880; }
.stat.open-door { display: inline-flex; align-items: center; gap: 4px; color: var(--grass-deep); }
.stat.open-door.quiet { color: var(--ink-soft); }
.stat.open-door.quiet :deep(.gl) { opacity: .66; }
.seed { margin-top: 16px; font-size: var(--fs-base); line-height: 1.7; letter-spacing: 1px; color: var(--ink-soft); }
.silhouette { display: flex; align-items: center; gap: 10px; margin-top: 16px; height: 48px; }
.closed-mark { display: flex; align-items: center; justify-content: center; gap: 7px; height: 48px;
  margin-top: 16px; color: #A89880; font-size: var(--fs-xs); letter-spacing: .06em; }
.closed-mark :deep(svg) { opacity: .65; }
.silhouette i { display: block; width: 30px; height: 1px; background: rgba(150, 133, 100, .45); }
.silhouette i:last-child { flex: 1; max-width: 54px; }
.talk { display: flex; align-items: center; gap: 4px; margin-top: 9px; font-size: var(--fs-sm);
  letter-spacing: .06em; color: var(--grass-deep); }
.when { margin-top: 3px; font-size: var(--fs-sm); letter-spacing: 1.2px; color: #A89880; }

.seeds { display: flex; justify-content: center; align-items: flex-end; gap: 10px; padding: 16vh 0; }
.seeds span { width: 9px; height: 14px; border: 1.5px solid var(--ink-soft);
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
.empty p { font-size: var(--fs-base); letter-spacing: 1px; color: var(--ink-soft); }
.empty .soft { margin-top: 12px; line-height: 2; color: var(--ink-soft); }
.to-mine { margin-top: 24px; font-size: var(--fs-base); color: var(--wood); letter-spacing: 1px;
  text-decoration: underline wavy rgba(139, 107, 74, .65) 1px; text-underline-offset: 6px; }
.empty-one { text-align: center; padding: 18vh 0; font-size: var(--fs-base); letter-spacing: 1px; color: var(--ink-soft); }

/* 点了门，门里递出一张纸：这几处都还没开，话说在前头 */
.soon { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 16px 0 10px; }
.soon :deep(.gl) { color: var(--grass-deep); opacity: .78; }
.soon-line { margin-top: 14px; font-size: var(--fs-base); line-height: 1.9; letter-spacing: 1px; color: var(--ink-soft); }
.soon-soft { margin-top: 8px; max-width: 34em; font-size: var(--fs-sm); line-height: 1.9;
  letter-spacing: .06em; color: var(--ink-faint); }
.soon .to-mine { margin-top: 18px; }

@keyframes nod { 0%, 100% { transform: translateX(0); } 30% { transform: translateX(-1.5px); } 70% { transform: translateX(1.5px); } }

@media (max-width: 1250px) {
  .grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 28px 20px; }
}
@media (max-width: 880px) {
  .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 720px) {
  .visits { padding-left: max(60px, env(safe-area-inset-left)); }
  .v-head { min-height: 18vh; padding: max(14px, env(safe-area-inset-top)) 0 14px; }
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 26px 14px; }
  .visit-card { margin-top: 0; }
  .chips, .filters { gap: 10px 22px; }
  .v-inner { padding: 0 max(14px, env(safe-area-inset-right)) 0 max(14px, env(safe-area-inset-left)); }
  .foot { padding: 6px 14px 12px; }
}
@media (max-width: 480px) {
  .grid { grid-template-columns: 1fr; }
  h1 { font-size: var(--fs-title); }
  .v-sub { font-size: var(--fs-sm); }
  .v-tools { margin-top: 15px; gap: 12px; }
  .filters { width: 100%; gap: 8px 18px; }
  .v-find { width: 100%; }
  .v-head { min-height: 0; padding-bottom: 10px; }
}
</style>
