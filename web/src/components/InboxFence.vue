<script setup>
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api';
import { useNotice } from '../store/notice';
import { toast } from '../utils/toast';
import FenceDialog from './FenceDialog.vue';
import MessageNotes from './MessageNotes.vue';
import FieldPager from './FieldPager.vue';
import Glyph from './Glyph.vue';

const props = defineProps({
  open: Boolean,
  tab: { type: String, default: 'notes' },
  scope: { type: String, default: 'in' }
});
const emit = defineEmits(['close']);

const router = useRouter();
const notice = useNotice();

const tab = ref(props.tab);
const noteScope = ref(props.scope);
const notes = ref([]);
const history = ref([]);
const loading = ref(false);
const incoming = ref([]);
const opened = ref([]);
const waiting = ref([]);
const declined = ref([]);
const refusing = ref(0);
const refuseWhy = ref('');
const busy = ref(false);
// 收到的和旧回音都整摞摊在一张纸上，话多就顺着藤往下读
const base = computed(() => noteScope.value === 'old' ? history.value : notes.value);
const knockItems = computed(() => [
  ...incoming.value.map(k => ({ k, kind: 'in' })),
  ...opened.value.map(k => ({ k, kind: 'open' })),
  ...waiting.value.map(k => ({ k, kind: 'wait' })),
  ...declined.value.map(k => ({ k, kind: 'no' }))
]);
// 门外的动静一页六条：后来的敲门和回音翻一页也够得着
const KNOCK_PAGE = 6;
const knockPage = ref(1);
const knockPages = computed(() => Math.max(1, Math.ceil(knockItems.value.length / KNOCK_PAGE)));
const shownKnocks = computed(() =>
  knockItems.value.slice((knockPage.value - 1) * KNOCK_PAGE, knockPage.value * KNOCK_PAGE));
const doorCount = computed(() => incoming.value.length + waiting.value.length + declined.value.length);
const openedFresh = computed(() => opened.value.filter(k => !k.seen_by_visitor).length);

const title = computed(() => tab.value === 'notes' ? '篱笆上的话' : '门外的动静');
const note = computed(() => tab.value !== 'notes'
  ? '有人敲门，也有人给你留了门'
  : noteScope.value === 'out'
    ? '你留在别人篱笆上的话，回音也会落在这里'
    : noteScope.value === 'old'
      ? '回过的话风替你收着，想再看一眼就摊开'
      : '风把话吹到篱笆上，回一句，别让它凉了');

async function loadNotes() {
  loading.value = true;
  try {
    const d = noteScope.value === 'out' ? await api.outbox() : await api.inbox();
    const list = d.list || [];
    notes.value = noteScope.value === 'out' ? list : list.filter(m => !m.reply);
    history.value = noteScope.value === 'out' ? [] : list.filter(m => m.reply);
  } finally {
    loading.value = false;
  }
}

async function loadKnocks() {
  loading.value = true;
  try {
    const d = await api.knocks();
    incoming.value = d.incoming;
    opened.value = d.opened;
    waiting.value = d.waiting;
    declined.value = d.declined;
    knockPage.value = 1;
    const fresh = [...d.opened, ...d.declined].filter(k => !k.seen_by_visitor);
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
  noteScope.value = props.scope || 'in';
  loadTab();
});
watch(() => props.tab, t => {
  if (!props.open || !t) return;
  tab.value = t;
  loadTab();
});
watch(() => props.scope, s => {
  if (!props.open || tab.value !== 'notes') return;
  noteScope.value = s || 'in';
  loadNotes();
});
watch(tab, () => {
  if (!props.open) return;
  loadTab();
});

function showNotes(scope) {
  if (tab.value === 'notes' && noteScope.value === scope) return;
  const here = tab.value === 'notes';
  noteScope.value = scope;
  if (here) loadNotes();
  else tab.value = 'notes';
}
function showKnocks() {
  if (tab.value !== 'knocks') tab.value = 'knocks';
}
async function erase(m) {
  await api.delMessage(m.id);
  notes.value = notes.value.filter(x => x.id !== m.id);
  notice.load();
}
function replied(m) {
  const i = notes.value.findIndex(x => x.id === m.id);
  if (i > -1) history.value.unshift(notes.value.splice(i, 1)[0]);
  notice.load();
}
function openGarden(k) {
  emit('close');
  router.push('/garden/' + k.garden_user_id);
}
// 上回没开，这回再敲一下；门里门外都留个印子，不能只是把人带到门口
async function knockAgain(k) {
  await api.knock(k.garden_user_id);
  openGarden(k);
}

function refuse(k) {
  if (refusing.value === k.id) return;
  refusing.value = k.id;
  refuseWhy.value = '';
}
function back() {
  refusing.value = 0;
  refuseWhy.value = '';
}
async function decide(k, open) {
  const reason = refuseWhy.value.trim();
  if (!open && !reason) return toast('总得给门外留个理由');
  busy.value = true;
  try {
    await api.decideKnock(k.id, open ? { open: true } : { open: false, reason });
    incoming.value = incoming.value.filter(x => x.id !== k.id);
    back();
    toast(open ? '门开了，他那边会收到' : '门没开，理由递过去了');
    await notice.load();
  } finally {
    busy.value = false;
  }
}
async function enter(k) {
  await api.seenKnock(k.id);
  k.seen_by_visitor = 1;
  opened.value = opened.value.filter(x => x.id !== k.id);
  await notice.load();
  emit('close');
  router.push('/garden/' + k.garden_user_id);
}
</script>

<template>
  <FenceDialog :open="open" :title="title" :note="note" wide @close="$emit('close')">
    <nav class="f-tabs">
      <button :class="{ on: tab === 'notes' && noteScope === 'in' }" @click="showNotes('in')">
        <Glyph name="leaf" :size="17"/> 收到的
        <i v-if="notice.messages" class="n-count">{{ notice.messages }}</i>
      </button>
      <button :class="{ on: tab === 'notes' && noteScope === 'out' }" @click="showNotes('out')">
        <Glyph name="pen" :size="17"/> 我留的
        <i v-if="notice.sent" class="n-count">{{ notice.sent }}</i>
      </button>
      <button :class="{ on: tab === 'notes' && noteScope === 'old' }" @click="showNotes('old')">
        <Glyph name="daisy" :size="17"/> 旧回音
        <i v-if="notice.replied" class="n-count">{{ notice.replied }}</i>
      </button>
      <button :class="{ on: tab === 'knocks' }" @click="showKnocks">
        <Glyph name="home" :size="17"/> 敲门
        <i v-if="doorCount + openedFresh" class="n-count">{{ doorCount + openedFresh }}</i>
      </button>
    </nav>

    <template v-if="tab === 'notes'">
      <MessageNotes :list="base" :owner="noteScope !== 'out'" :can-reply="noteScope === 'in'"
        :hist="noteScope === 'old'"
        :erase="noteScope === 'out'" rows
        :empty="noteScope === 'out' ? '你还没在别人篱笆上留过话。'
          : noteScope === 'old' ? '还没有回过的话，旧回音里空着。' : ''"
        @erase="erase" @replied="replied"/>
    </template>

    <template v-else>
      <p v-if="loading" class="f-loading">风还在路上</p>

      <section v-if="knockItems.length" class="knock-block">
        <h4><Glyph name="bell" :size="14"/> 篱笆外的动静</h4>
        <article v-for="it in shownKnocks" :key="it.kind + it.k.id" class="knock-row"
          :class="{ opened: it.kind === 'open' }">
          <span class="k-face">{{ (it.k.nickname || '田')[0] }}</span>
          <div class="k-say">
            <b>{{ it.k.nickname }}</b>
            <template v-if="it.kind === 'in'">
              {{ it.k.times > 1 ? `敲了 ${it.k.times} 次门` : '想进来看看' }}
              <span>{{ (it.k.created_at || '').slice(5, 16) }}</span>
            </template>
            <template v-else-if="it.kind === 'open'"> 开了 {{ it.k.plots }} 块地给你看
              <span>{{ it.k.garden_name || '他的田' }}</span>
            </template>
            <template v-else-if="it.kind === 'wait'"> 的门还关着
              <span>{{ it.k.garden_name || '他的田' }} · 等主人来看看</span>
              <p v-if="it.k.prior_reason" class="k-why">上回没开：“{{ it.k.prior_reason }}”</p>
            </template>
            <template v-else> 这回没开
              <span>{{ it.k.garden_name || '他的田' }}</span>
              <p v-if="it.k.decline_reason" class="k-why">“{{ it.k.decline_reason }}”</p>
            </template>
          </div>

          <template v-if="it.kind === 'in'">
            <button class="k-open" :disabled="busy" @click="decide(it.k, true)">通过</button>
            <button class="k-no" :disabled="busy" @click="refuse(it.k)">不开</button>
            <div v-if="refusing === it.k.id" class="k-refuse">
              <input v-model="refuseWhy" maxlength="60" placeholder="这回不开，是因为…"
                aria-label="不开门的理由" @keyup.enter="decide(it.k, false)"/>
              <div class="k-acts">
                <button class="k-no" :disabled="busy" @click="back">再想想</button>
                <button class="k-yes" :disabled="busy || !refuseWhy.trim()" @click="decide(it.k, false)">
                  把话递过去
                </button>
              </div>
            </div>
          </template>
          <button v-else-if="it.kind === 'open'" class="k-open" @click="enter(it.k)">去看看</button>
          <button v-else-if="it.kind === 'wait'" class="k-open" @click="openGarden(it.k)">去门口</button>
          <button v-else class="k-open" @click="knockAgain(it.k)">再敲一次</button>
        </article>
        <FieldPager v-if="knockPages > 1" :page="knockPage" :pages="knockPages" @go="knockPage = $event"/>
      </section>

      <p v-if="!loading && !knockItems.length" class="f-empty">
        门外还没有动静。风过来的时候，篱笆会先知道。
      </p>
    </template>
  </FenceDialog>
</template>

<style scoped>
.f-tabs { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 26px; padding: 2px 0 14px; }
.f-tabs button { display: inline-flex; align-items: center; gap: 6px; font-size: calc(25px * var(--ui-scale));
  color: var(--ink-soft);
  letter-spacing: .06em; padding: 1px 2px 5px; transition: color .3s; }
.f-tabs button.on { color: var(--wood); text-decoration: underline wavy rgba(139, 107, 74, .6) 1px;
  text-underline-offset: 6px; }
/* 记号跟着字的墨走，只有数字留一点晒过草的绿，不抢手写的画 */
.f-tabs .n-count { font-style: normal; font-size: var(--fs-xs);
  color: color-mix(in srgb, var(--grass-deep) 55%, var(--ink-soft)); }
.f-loading, .f-empty { text-align: center; font-size: var(--fs-md); color: var(--ink-faint); letter-spacing: .06em;
  padding: 24px 0; }
.knock-block { margin-bottom: 18px; }
.knock-block h4 { display: flex; align-items: center; gap: 6px; font-size: var(--fs-md); font-weight: normal;
  color: var(--wood); letter-spacing: .08em; margin-bottom: 8px; padding-left: 2px; }
.knock-row { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; padding: 9px 11px 10px;
  margin-bottom: 8px; background: var(--card); border: 1.1px dashed rgba(150, 133, 100, .38);
  border-radius: var(--r-a); }
.knock-row.opened { background: rgba(126, 154, 95, .07); }
.k-face { display: inline-grid; place-items: center; width: 25px; height: 26px; flex: none;
  border: 1.2px solid color-mix(in srgb, var(--fence) 75%, transparent);
  border-radius: 47% 53% 50% 50% / 52% 48% 54% 46%;
  font-size: var(--fs-xs); color: var(--wood); }
.k-say { flex: 1; min-width: 0; font-size: var(--fs-md); color: var(--ink); }
.k-say b { font-weight: normal; color: var(--wood); }
.k-say span { display: block; font-size: var(--fs-sm); color: var(--ink-faint); }
.k-open, .k-no { font-size: var(--fs-md); padding: 2px 12px 3px; border-radius: var(--r-c); transition: .3s; }
.k-open { color: var(--grass-deep); box-shadow: inset 0 0 0 1.2px rgba(79, 107, 58, .35); }
.k-open:hover { background: rgba(79, 107, 58, .08); }
.k-no { color: var(--clay); box-shadow: inset 0 0 0 1.2px rgba(176, 122, 85, .4); }
.k-no:hover { background: rgba(176, 122, 85, .08); }
.k-open:disabled, .k-no:disabled { opacity: .35; cursor: default; }
.k-acts { display: flex; justify-content: flex-end; gap: 14px; margin-top: 9px; }
.k-yes { font-size: var(--fs-md); padding: 2px 12px 3px; border-radius: var(--r-c); color: var(--grass-deep);
  box-shadow: inset 0 0 0 1.2px rgba(79, 107, 58, .35); transition: .3s; }
.k-yes:hover:not(:disabled) { background: rgba(79, 107, 58, .08); }
.k-yes:disabled { opacity: .35; cursor: default; }
.k-refuse { flex: 0 0 100%; margin-top: 7px; padding-top: 8px; border-top: 1.1px dashed rgba(150, 133, 100, .35); }
.k-refuse input { display: block; width: 100%; padding: 3px 2px 6px; font-size: calc(var(--fs-md) - 3px);
  font-weight: 400; color: var(--ink); border-bottom: 1.2px dashed rgba(150, 133, 100, .45); }
.k-refuse input:focus { outline: none; border-bottom-color: rgba(139, 107, 74, .7); }
.k-refuse input::placeholder { font-style: italic; color: #B0A898; }
.k-why { margin-top: 3px; font-size: var(--fs-md); line-height: 1.65; color: var(--wood); }
@media (max-width: 520px) {
  .f-tabs { gap: 18px; }
  .knock-row { align-items: flex-start; }
  .k-say { flex: 1 1 calc(100% - 34px); }
  .knock-row > .k-open { margin-left: auto; }
}
</style>
