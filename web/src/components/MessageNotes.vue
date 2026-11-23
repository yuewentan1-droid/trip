<script setup>
import { computed, ref, watch } from 'vue';
import { api } from '../api';
import { useUser } from '../store/user';
import { ask } from '../utils/ask';
import { said } from '../utils/time';
import { toast } from '../utils/toast';
import Spread from './Spread.vue';
import Glyph from './Glyph.vue';
import ModalSprig from './ModalSprig.vue';
import VineScroll from './VineScroll.vue';

const props = defineProps({
  list: { type: Array, default: () => [] },
  owner: Boolean,
  canReply: { type: Boolean, default: true },
  erase: Boolean,
  rows: Boolean,
  hist: Boolean,
  empty: { type: String, default: '' }
});
const emit = defineEmits(['erase', 'replied']);

const user = useUser();
const replying = ref(0);
const openNote = ref(null);
const nwBody = ref(null);
const draft = ref('');
const sending = ref(false);

const mine = m => m.from_user_id === user.user?.id;
// 门没开的时候只读：回复的笔和纸都不摊出来
const replyable = computed(() => props.owner && props.canReply);
// 合着的时候只露出人和时候，想读就把这张纸摊到眼前
const close = () => { openNote.value = null; replying.value = 0; draft.value = ''; };
// 纸按话的长短裁：短话一张便笺，长话铺到屏边，再长就顺着藤往下读
const noteW = m => {
  const n = [...String(m.content || '')].length + Math.round([...String(m.reply || '')].length * .7);
  return Math.min(980, Math.max(440, Math.round(400 + n * 3.2)));
};
const draftLen = computed(() => [...draft.value].length);
const stopReply = () => { replying.value = 0; };
watch(() => props.list, close);
const hash = m => [...String(m.id)].reduce((h, c) => (h * 31 + c.codePointAt(0)) >>> 0, 7);
const scatter = m => {
  const h = hash(m);
  return {
    '--rot': ((h >>> 3) % 19 - 9) / 6 + 'deg',
    '--ty': ((h >>> 9) % 19) + 'px',
    '--mx': ((h >>> 14) % 9) + 'px'
  };
};

function begin(m) {
  openNote.value = m;
  replying.value = m.id;
  draft.value = m.reply || '';
}
async function wipe(m) {
  const sure = await ask({
    title: '抹掉这句话？',
    body: '抹掉之后，篱笆上就不留了，找不回来。',
    ok: '抹掉', cancel: '再留着', icon: 'trash'
  });
  if (!sure) return;
  close();
  emit('erase', m);
}
async function reply(m) {
  const text = draft.value.trim();
  if (!text) return (draft.value = '');
  if (draftLen.value > 100) return toast('话太长了，收一收');
  sending.value = true;
  try {
    const d = await api.replyMessage(m.id, { reply: text });
    m.reply = d.reply;
    m.replied_at = d.replied_at;
    stopReply(m);
    toast('回在篱笆上了');
    emit('replied', m);
  } finally {
    sending.value = false;
  }
}

</script>

<template>
  <div v-if="rows" class="notes rows">
    <article v-for="m in list" :key="m.id" class="note-row" :class="{ old: m.reply }"
      :aria-label="`${m.nickname} 的留言，摊开看`" @click="openNote = m">
      <span class="n-face">{{ (m.nickname || '田')[0] }}</span>
      <div class="nr-main">
        <header class="n-head">
          <span class="n-name" :title="m.nickname">{{ m.nickname }}</span>
          <span class="n-when">{{ said(m.created_at) }}</span>
        </header>
      </div>
      <div class="nr-acts" @click.stop>
        <button class="n-open" @click="openNote = m">
          <Glyph name="expand" :size="12"/> 摊开
        </button>
        <button v-if="replyable && !hist" class="n-back" @click="begin(m)">{{ m.reply ? '再回一句' : '回一句' }}</button>
        <button v-if="erase && mine(m)" class="n-erase" @click="wipe(m)">抹掉</button>
      </div>
    </article>
    <p v-if="!list.length" class="n-empty">{{ empty || '篱笆上还空着，风吹过去只有叶子响。' }}</p>
  </div>

  <div v-else class="notes">
    <article v-for="m in list" :key="m.id" class="note" :style="scatter(m)"
      :aria-label="`${m.nickname} 的留言，摊开看`" @click="openNote = m">
      <header class="n-head">
        <span class="n-face">{{ (m.nickname || '田')[0] }}</span>
        <span class="n-name" :title="m.nickname">{{ m.nickname }}</span>
        <span class="n-when">{{ said(m.created_at) }}</span>
      </header>
      <div class="n-foot" @click.stop>
        <button class="n-open" @click="openNote = m">
          <Glyph name="expand" :size="12"/> 摊开
        </button>
        <button v-if="erase && mine(m)" class="n-erase" @click="wipe(m)">抹掉</button>
        <button v-if="replyable" class="n-back" @click="begin(m)">{{ m.reply ? '再回一句' : '回一句' }}</button>
      </div>
    </article>
    <p v-if="!list.length" class="n-empty">{{ empty || '篱笆上还空着，风吹过去只有叶子响。' }}</p>
  </div>

  <Teleport to="body">
    <Transition name="note-pop">
      <div v-if="openNote" class="note-mask" @click.self="close">
        <article class="note-window" :style="{ '--w': noteW(openNote) + 'px' }" role="dialog" aria-modal="true"
          :aria-label="`${openNote.nickname} 的留言`">
          <ModalSprig/>
          <header class="n-head nw-head">
            <span class="n-face">{{ (openNote.nickname || '田')[0] }}</span>
            <span class="n-name">{{ openNote.nickname }}</span>
            <span class="n-when">{{ said(openNote.created_at) }}</span>
          </header>
          <div class="nw-body-wrap">
            <div ref="nwBody" class="nw-body">
              <p class="nw-say">「{{ openNote.content }}」</p>
              <div v-if="openNote.reply" class="nw-reply">
                <Glyph name="leaf" :size="13"/>
                <span><b>{{ owner ? '你' : '主人' }}回：</b>{{ openNote.reply }}</span>
              </div>
            </div>
            <VineScroll :el="nwBody"/>
          </div>
          <div v-if="(erase && mine(openNote)) || (replyable && !hist && replying !== openNote.id)" class="nw-foot">
            <button v-if="erase && mine(openNote)" class="n-erase" @click="wipe(openNote)">抹掉</button>
            <button v-if="replyable && !hist && replying !== openNote.id" class="n-back" @click="begin(openNote)">
              {{ openNote.reply ? '再回一句' : '回一句' }}
            </button>
          </div>
          <Transition name="reply">
            <form v-if="replyable && replying === openNote.id" class="n-form nw-form"
              @submit.prevent="reply(openNote)" @click.stop>
              <textarea v-model="draft" rows="2" maxlength="100" placeholder="回一句，别端着…" aria-label="回复留言"/>
              <div class="n-acts">
                <Spread v-model="draft" :max="100" placeholder="回一句，别端着…"/>
                <span class="n-num">{{ draftLen }}/100</span>
                <button type="button" class="n-x" @click="stopReply">先不回</button>
                <button type="submit" class="n-send" :disabled="sending || !draft.trim()">回上去</button>
              </div>
            </form>
          </Transition>
        </article>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 六列摊开，每列两张，像几张纸被风按在篱笆上，不排队也不对齐 */
.notes { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 18px 12px;
  align-items: start; padding: 4px 0 10px; }
.note { position: relative; padding: 10px 10px 9px; margin-left: var(--mx); cursor: pointer;
  transform: translateY(var(--ty)) rotate(var(--rot));
  background: radial-gradient(105% 90% at 20% 12%, rgba(94, 83, 64, .045), transparent 62%), var(--card);
  border: 1.2px dashed rgba(150, 133, 100, .42);
  border-radius: var(--r-a); box-shadow: var(--emboss);
  transition: transform .45s cubic-bezier(.22, .8, .26, 1), box-shadow .45s; }
.note:nth-child(2n) { border-radius: var(--r-b); }
.note:nth-child(3n) { border-radius: var(--r-c); }
.note:hover { transform: translateY(calc(var(--ty) - 3px)) rotate(0deg); box-shadow: var(--emboss-lift); }
.n-head { display: flex; align-items: center; gap: 5px; min-width: 0; }
.n-face { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 27px; flex: none;
  padding-bottom: 1px; line-height: 1;
  border: 1.1px solid color-mix(in srgb, var(--fence) 75%, transparent);
  border-radius: 47% 53% 50% 50% / 52% 48% 54% 46%;
  font-size: var(--fs-sm); color: var(--wood); }
.n-name { flex: 1; min-width: 0; font-size: var(--fs-md); color: var(--wood);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.n-when { flex: none; font-size: var(--fs-sm); color: var(--ink-faint); }
.n-foot { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 5px 10px;
  margin-top: 8px; padding-top: 7px; min-height: 20px; border-top: 1.1px dashed rgba(150, 133, 100, .3); }
.n-open { display: inline-flex; align-items: center; gap: 2px; margin-right: auto; color: var(--ink-faint);
  font-size: var(--fs-sm); letter-spacing: .04em; opacity: .74; transition: color .3s, opacity .3s; }
.note:hover .n-open, .n-open:hover { opacity: 1; color: var(--wood); }
.n-erase { font-size: var(--fs-sm); color: var(--ink-faint); opacity: .62; transition: opacity .3s, color .3s; }
.note:hover .n-erase, .n-erase:hover { opacity: 1; color: var(--clay); }
.n-back { font-size: var(--fs-sm); color: var(--wood); letter-spacing: .05em;
  text-decoration: underline wavy rgba(139, 107, 74, .45) 1px; text-underline-offset: 4px; }
.n-back:hover { color: var(--grass-deep); }
/* 篱笆上的话按行排，和敲门一个脾气：人脸在左，话在中间，手脚收在右边 */
.notes.rows { display: flex; flex-direction: column; align-items: stretch; gap: 8px; padding: 4px 0 8px; }
.note-row { --paper-bed: color-mix(in srgb, var(--card) 46%, var(--paper-2));
  display: flex; align-items: center; gap: 10px; padding: 10px 12px 11px;
  background: var(--paper-bed); border: 1.1px dashed rgba(150, 133, 100, .38);
  border-radius: var(--r-a); cursor: pointer; transition: background .3s, box-shadow .3s; }
.note-row:hover { box-shadow: var(--emboss); }
/* 回过的纸在篱笆上多放些日子，纸色往草里退一档，与没回的差得出来 */
.note-row.old { background: color-mix(in srgb, var(--grass) 12%, var(--paper-bed)); }
.note-row .n-face { width: 29px; height: 30px; }
.nr-main { flex: 1; min-width: 0; }
.nr-acts { display: flex; align-items: center; gap: 12px; flex: none; }
.nr-acts .n-open { margin-right: 0; opacity: 1; }
.notes.rows .n-empty { padding: 18px 0 12px; }
/* 把信纸从篱笆上取下来，摊到眼前；话长纸就宽，长得过了头就在纸里挪 */
.note-mask { position: fixed; inset: 0; z-index: 80; display: grid; place-items: center;
  padding: calc(24px + env(safe-area-inset-top)) calc(24px + env(safe-area-inset-right))
    calc(24px + env(safe-area-inset-bottom)) calc(24px + env(safe-area-inset-left));
  background: rgba(63, 58, 47, .3); }
.note-window { --w: 660px; --fs-xs: calc(17px * var(--ui-scale)); --fs-sm: calc(19px * var(--ui-scale));
  --fs-md: calc(21px * var(--ui-scale)); --fs-base: calc(23px * var(--ui-scale)); --fs-read: calc(25px * var(--ui-scale));
  position: relative; display: flex; flex-direction: column; font-size: var(--fs-base);
  width: min(var(--w), 100%);
  max-height: calc(100vh - 48px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
  max-height: calc(100dvh - 48px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
  padding: 22px 26px 16px; background: var(--paper);
  border: 1.5px dashed rgba(150, 133, 100, .55);
  border-radius: 26px 14px 30px 12px / 14px 28px 12px 30px;
  box-shadow: 0 18px 44px rgba(63, 58, 47, .16); transform: rotate(-.3deg); }
/* 纸自己按话的长短裁：短话收着，长话把整张纸撑到屏边，余下的顺着藤往上翻 */
.nw-body-wrap { position: relative; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
.nw-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 0 20px 6px 0;
  overscroll-behavior: contain; scrollbar-width: none; }
.nw-body::-webkit-scrollbar { display: none; }
.nw-say { margin-top: 11px; font-size: var(--fs-read); line-height: 1.9; letter-spacing: .02em;
  color: var(--ink); white-space: pre-wrap; word-break: break-word; }
.nw-reply { display: flex; align-items: flex-start; gap: 6px; margin-top: 14px; padding: 7px 9px 8px;
  font-size: var(--fs-base); line-height: 1.85; color: var(--ink-soft);
  background: color-mix(in srgb, var(--grass) 9%, transparent);
  border-radius: 4px 14px 5px 12px / 12px 5px 14px 6px; transform: rotate(.4deg); }
.nw-reply :deep(svg) { color: var(--grass-deep); margin-top: 3px; }
.nw-reply b { font-weight: normal; color: var(--grass-deep); }
.nw-foot { flex: none; display: flex; align-items: center; justify-content: flex-end; gap: 16px;
  margin-top: 11px; padding-top: 9px; border-top: 1.1px dashed rgba(150, 133, 100, .34); }
.nw-foot .n-erase { opacity: .78; }
.nw-form { flex: none; }
.note-pop-enter-active, .note-pop-leave-active { transition: opacity .3s, transform .3s; }
.note-pop-enter-from, .note-pop-leave-to { opacity: 0; }
.note-pop-enter-from .note-window, .note-pop-leave-to .note-window {
  transform: rotate(-.3deg) translateY(10px) scale(.985); }
.n-form { margin-top: 8px; padding-top: 8px; border-top: 1.1px dashed rgba(150, 133, 100, .38); }
.n-form textarea { display: block; width: 100%; min-height: 50px; font-size: var(--fs-base); line-height: 1.8;
  border: none; background: transparent; color: var(--ink); padding: 2px 0 5px; }
.n-form textarea:focus { outline: none; }
.n-acts { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 4px; }
.n-acts :deep(.spread-open) { margin-right: auto; }
.n-num { font-size: var(--fs-sm); color: var(--ink-faint); letter-spacing: .04em; }
.n-x { font-size: var(--fs-sm); color: var(--ink-faint); }
.n-send { font-size: var(--fs-md); color: var(--grass-deep);
  text-decoration: underline wavy rgba(79, 107, 58, .45) 1px; text-underline-offset: 4px; }
.n-send:disabled { opacity: .35; cursor: default; text-decoration-color: transparent; }
.n-empty { grid-column: 1 / -1; text-align: center; font-size: var(--fs-md); letter-spacing: .08em;
  color: var(--ink-faint); padding: 28px 0 18px; }
.reply-enter-active, .reply-leave-active { transition: opacity .3s, transform .3s; }
.reply-enter-from, .reply-leave-to { opacity: 0; transform: translateY(-4px); }
/* 天黑：纸边退到月光里，别在暗处划出一道硬线 */
body[data-night="1"] .note,
body[data-night="1"] .note-row,
body[data-night="1"] .note-window {
  border-color: rgba(148, 160, 176, .2);
  box-shadow: 0 0 18px rgba(130, 156, 130, .08); }
body[data-night="1"] .note-window { border-color: rgba(148, 160, 176, .24);
  box-shadow: 0 18px 44px rgba(5, 9, 15, .34), 0 0 26px rgba(130, 156, 130, .06); }

@media (max-width: 960px) {
  .notes { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 17px 12px; }
}
@media (max-width: 760px) {
  .notes { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px 12px; }
}
@media (max-width: 560px) {
  .notes { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .note-row { flex-wrap: wrap; }
  .nr-main { flex: 1 1 calc(100% - 40px); }
  .nr-acts { margin-left: auto; }
  .note-mask { padding: calc(12px + env(safe-area-inset-top)) calc(12px + env(safe-area-inset-right))
    calc(12px + env(safe-area-inset-bottom)) calc(12px + env(safe-area-inset-left)); }
  .note-window { width: min(var(--w), 100%); padding: 17px 16px 13px;
    max-height: calc(100vh - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
    max-height: calc(100dvh - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom)); }
  .nw-say { font-size: var(--fs-base); }
}
@media (max-width: 420px) {
  .notes { grid-template-columns: 1fr; }
  .note { margin-left: 0; }
}
</style>
