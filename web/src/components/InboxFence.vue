<script setup>
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api';
import { useField } from '../store/field';
import { useNotice } from '../store/notice';
import { toast } from '../utils/toast';
import FenceDialog from './FenceDialog.vue';
import MessageNotes from './MessageNotes.vue';
import FieldPager from './FieldPager.vue';
import Glyph from './Glyph.vue';

const props = defineProps({ open: Boolean, tab: { type: String, default: 'notes' } });
const emit = defineEmits(['close']);

const router = useRouter();
const field = useField();
const notice = useNotice();

const tab = ref(props.tab);
const notes = ref([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const incoming = ref([]);
const opened = ref([]);
const deciding = ref(0);
const picks = ref(new Set());
const busy = ref(false);
const PER = 4;
const pages = computed(() => Math.max(1, Math.ceil(total.value / PER)));
const doorCount = computed(() => incoming.value.length);
const openedFresh = computed(() => opened.value.filter(k => !k.seen_by_visitor).length);

const title = computed(() => tab.value === 'notes' ? '篱笆上的话' : '门外的动静');
const note = computed(() => tab.value === 'notes'
  ? '风把话吹到篱笆上，回一句，别让它凉了'
  : '有人敲门，也有人给你留了门');

async function loadNotes() {
  loading.value = true;
  try {
    const d = await api.inbox(page.value);
    notes.value = d.list;
    total.value = d.total;
  } finally {
    loading.value = false;
  }
}

async function loadKnocks() {
  loading.value = true;
  try {
    if (!field.ready) await field.refresh();
    const d = await api.knocks();
    incoming.value = d.incoming;
    opened.value = d.opened;
    const fresh = d.opened.filter(k => !k.seen_by_visitor);
    if (fresh.length) {
      await Promise.all(fresh.map(k => api.seenKnock(k.id)));
      fresh.forEach(k => (k.seen_by_visitor = 1));
      await notice.load();
    }
  } finally {
    loading.value = false;
  }
}

function loadTab() {
  if (tab.value === 'notes') loadNotes();
  else loadKnocks();
}

watch(() => props.open, on => {
  if (!on) return;
  tab.value = props.tab || 'notes';
  page.value = 1;
  loadTab();
});
watch(() => props.tab, t => {
  if (!props.open || !t) return;
  tab.value = t;
  loadTab();
});
watch(tab, () => {
  if (!props.open) return;
  page.value = 1;
  loadTab();
});

function goPage(p) {
  page.value = p;
  loadNotes();
}
function replied() {
  notice.load();
}

function begin(k) {
  deciding.value = k.id;
  picks.value = new Set(field.sessions.map(s => s.id));
}
function toggle(id) {
  const next = new Set(picks.value);
  next.has(id) ? next.delete(id) : next.add(id);
  picks.value = next;
}
function all(on) {
  picks.value = on ? new Set(field.sessions.map(s => s.id)) : new Set();
}
async function decide(k, open) {
  if (open && !picks.value.size) return toast('总得开一块地给他看');
  busy.value = true;
  try {
    await api.decideKnock(k.id, { open, sessions: open ? [...picks.value] : [] });
    incoming.value = incoming.value.filter(x => x.id !== k.id);
    deciding.value = 0;
    toast(open ? '门开了，他那边会收到' : '先没开，他那边会知道');
    await notice.load();
  } finally {
    busy.value = false;
  }
}
async function enter(k) {
  await api.seenKnock(k.id);
  k.seen_by_visitor = 1;
  await notice.load();
  emit('close');
  router.push('/garden/' + k.garden_user_id);
}
</script>

<template>
  <FenceDialog :open="open" :title="title" :note="note" wide @close="$emit('close')">
    <nav class="f-tabs">
      <button :class="{ on: tab === 'notes' }" @click="tab = 'notes'">
        <Glyph name="leaf" :size="15"/> 留言
        <i v-if="notice.messages">{{ notice.messages }}</i>
      </button>
      <button :class="{ on: tab === 'knocks' }" @click="tab = 'knocks'">
        <Glyph name="home" :size="15"/> 敲门
        <i v-if="doorCount + openedFresh">{{ doorCount + openedFresh }}</i>
      </button>
    </nav>

    <template v-if="tab === 'notes'">
      <MessageNotes :list="notes" owner @replied="replied"/>
      <FieldPager v-if="pages > 1" :page="page" :pages="pages" @go="goPage"/>
    </template>

    <template v-else>
      <p v-if="loading" class="f-loading">风还在路上</p>

      <section v-if="incoming.length" class="knock-block">
        <h4><Glyph name="bell" :size="14"/> 有人敲你的门</h4>
        <article v-for="k in incoming" :key="k.id" class="knock-row">
          <span class="k-face">{{ (k.nickname || '田')[0] }}</span>
          <div class="k-say">
            <b>{{ k.nickname }}</b> 想进来看看
            <span>{{ (k.created_at || '').slice(5, 16) }}</span>
          </div>
          <button v-if="deciding !== k.id" class="k-open" @click="begin(k)">开门</button>
          <button v-else class="k-open" @click="deciding = 0">先合上</button>

          <div v-if="deciding === k.id" class="k-pick">
            <p class="k-h">开哪几块地给他看</p>
            <div class="k-ways">
              <button @click="all(true)">都开</button>
              <button @click="all(false)">都不开</button>
            </div>
            <div class="k-plots">
              <button v-for="s in field.sessions" :key="s.id" class="plot"
                :class="{ on: picks.has(s.id) }" @click="toggle(s.id)">
                <Glyph :name="s.status === 'finished' ? 'leaf' : 'sprout'" :size="14"/>
                <span>{{ s.title }}</span>
                <i>第 {{ s.level }} 层</i>
              </button>
            </div>
            <div class="k-acts">
              <button class="k-no" :disabled="busy" @click="decide(k, false)">先不开</button>
              <button class="k-yes" :disabled="busy || !picks.size" @click="decide(k, true)">
                开 {{ picks.size }} 块地
              </button>
            </div>
          </div>
        </article>
      </section>

      <section v-if="opened.length" class="knock-block">
        <h4><Glyph name="leaf" :size="14"/> 别人给你留的门</h4>
        <article v-for="k in opened" :key="k.id" class="knock-row opened">
          <span class="k-face">{{ (k.nickname || '田')[0] }}</span>
          <div class="k-say">
            <b>{{ k.nickname }}</b> 开了 {{ k.plots }} 块地给你看
            <span>{{ k.garden_name || '他的田' }}</span>
          </div>
          <button class="k-open" @click="enter(k)">去看看</button>
        </article>
      </section>

      <p v-if="!loading && !incoming.length && !opened.length" class="f-empty">
        门外还没有动静。风过来的时候，篱笆会先知道。
      </p>
    </template>
  </FenceDialog>
</template>

<style scoped>
.f-tabs { display: flex; justify-content: center; gap: 26px; padding: 2px 0 14px; }
.f-tabs button { display: inline-flex; align-items: center; gap: 6px; font-size: 13.5px; color: var(--ink-soft);
  letter-spacing: .06em; padding: 1px 2px 5px; transition: color .3s; }
.f-tabs button.on { color: var(--wood); text-decoration: underline wavy rgba(139, 107, 74, .6) 1px;
  text-underline-offset: 6px; }
.f-tabs i { font-style: normal; font-size: 11px; color: var(--grass-deep); }
.f-loading, .f-empty { text-align: center; font-size: 13px; color: var(--ink-faint); letter-spacing: .06em;
  padding: 24px 0; }
.knock-block { margin-bottom: 18px; }
.knock-block h4 { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: normal;
  color: var(--wood); letter-spacing: .08em; margin-bottom: 8px; padding-left: 2px; }
.knock-row { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; padding: 9px 11px 10px;
  margin-bottom: 8px; background: var(--card); border: 1.1px dashed rgba(150, 133, 100, .38);
  border-radius: var(--r-a); }
.knock-row.opened { background: rgba(126, 154, 95, .07); }
.k-face { display: inline-grid; place-items: center; width: 25px; height: 26px; flex: none;
  border: 1.2px solid #C9B99A; border-radius: 47% 53% 50% 50% / 52% 48% 54% 46%;
  font-size: 11px; color: var(--wood); }
.k-say { flex: 1; min-width: 0; font-size: 13px; color: var(--ink); }
.k-say b { font-weight: normal; color: var(--wood); }
.k-say span { display: block; font-size: 11.5px; color: var(--ink-faint); }
.k-open { font-size: 12.5px; color: var(--grass-deep); padding: 2px 10px 3px;
  border-radius: var(--r-c); box-shadow: inset 0 0 0 1.2px rgba(79, 107, 58, .35); transition: .3s; }
.k-open:hover { background: rgba(79, 107, 58, .08); }
.k-pick { flex: 0 0 100%; margin-top: 7px; padding-top: 8px; border-top: 1.1px dashed rgba(150, 133, 100, .35); }
.k-h { font-size: 12px; color: var(--ink-soft); letter-spacing: .06em; }
.k-ways { display: flex; gap: 14px; margin: 4px 0 8px; }
.k-ways button { font-size: 11.5px; color: var(--ink-faint); text-decoration: underline wavy rgba(150, 133, 100, .4) 1px;
  text-underline-offset: 3px; }
.k-plots { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 10px; max-height: 210px;
  overflow-y: auto; scrollbar-width: none; }
.k-plots::-webkit-scrollbar { display: none; }
.plot { display: flex; align-items: center; gap: 6px; min-width: 0; text-align: left; padding: 4px 7px 5px;
  color: var(--ink-soft); border-radius: var(--r-c); box-shadow: inset 0 0 0 1px rgba(150, 133, 100, .26);
  transition: color .3s, background .3s, box-shadow .3s; }
.plot span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12.5px; }
.plot i { margin-left: auto; flex: none; font-style: normal; font-size: 10.5px; color: var(--ink-faint); }
.plot.on { color: var(--grass-deep); background: rgba(79, 107, 58, .09); box-shadow: inset 0 0 0 1.2px rgba(79, 107, 58, .4); }
.k-acts { display: flex; justify-content: flex-end; gap: 14px; margin-top: 9px; }
.k-no { font-size: 12px; color: var(--ink-faint); }
.k-yes { font-size: 12.5px; color: var(--grass-deep);
  text-decoration: underline wavy rgba(79, 107, 58, .45) 1px; text-underline-offset: 4px; }
.k-yes:disabled { opacity: .35; cursor: default; text-decoration-color: transparent; }
@media (max-width: 520px) {
  .k-plots { grid-template-columns: 1fr; }
  .f-tabs { gap: 18px; }
}
</style>
