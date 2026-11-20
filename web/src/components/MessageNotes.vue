<script setup>
import { ref } from 'vue';
import { api } from '../api';
import { useUser } from '../store/user';
import { said } from '../utils/time';
import { toast } from '../utils/toast';
import Glyph from './Glyph.vue';

const props = defineProps({
  list: { type: Array, default: () => [] },
  owner: Boolean,
  erase: Boolean,
  empty: { type: String, default: '' }
});
const emit = defineEmits(['erase', 'replied']);

const user = useUser();
const replying = ref(0);
const draft = ref('');
const sending = ref(false);

const mine = m => m.from_user_id === user.user?.id;
const hash = m => [...String(m.id)].reduce((h, c) => (h * 31 + c.codePointAt(0)) >>> 0, 7);
const scatter = m => {
  const h = hash(m);
  return {
    '--rot': ((h >>> 3) % 17 - 8) / 9 + 'deg',
    '--ty': ((h >>> 9) % 13) + 'px',
    '--mx': ((h >>> 14) % 9) + 'px'
  };
};

function begin(m) {
  replying.value = m.id;
  draft.value = m.reply || '';
}
async function reply(m) {
  const text = draft.value.trim();
  if (!text) return (draft.value = '');
  if ([...text].length > 200) return toast('话太长了，收一收');
  sending.value = true;
  try {
    const d = await api.replyMessage(m.id, { reply: text });
    m.reply = d.reply;
    m.replied_at = d.replied_at;
    replying.value = 0;
    toast('回在篱笆上了');
    emit('replied', m);
  } finally {
    sending.value = false;
  }
}

</script>

<template>
  <div class="notes">
    <article v-for="m in list" :key="m.id" class="note" :style="scatter(m)">
      <header class="n-head">
        <span class="n-face">{{ (m.nickname || '田')[0] }}</span>
        <span class="n-name">{{ m.nickname }}</span>
        <span class="n-when">{{ said(m.created_at) }}</span>
      </header>
      <p class="n-say">「{{ m.content }}」</p>
      <div v-if="m.reply" class="n-reply">
        <Glyph name="leaf" :size="12"/>
        <span><b>{{ owner ? '你' : '主人' }}回：</b>{{ m.reply }}</span>
      </div>
      <div class="n-foot">
        <button v-if="erase && mine(m)" class="n-erase" @click="emit('erase', m)">抹掉</button>
        <button v-if="owner" class="n-back" @click="begin(m)">{{ m.reply ? '再回一句' : '回一句' }}</button>
      </div>
      <Transition name="reply">
        <form v-if="replying === m.id" class="n-form" @submit.prevent="reply(m)">
          <textarea v-model="draft" rows="2" placeholder="回一句，别端着…" aria-label="回复留言"/>
          <div class="n-acts">
            <button type="button" class="n-x" @click="replying = 0">先不回</button>
            <button type="submit" class="n-send" :disabled="sending || !draft.trim()">回上去</button>
          </div>
        </form>
      </Transition>
    </article>
    <p v-if="!list.length" class="n-empty">{{ empty || '篱笆上还空着，风吹过去只有叶子响。' }}</p>
  </div>
</template>

<style scoped>
/* 三列摊开，像几张纸被风按在篱笆上，不排队也不对齐 */
.notes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px 18px;
  align-items: start; padding: 4px 0 10px; }
.note { position: relative; padding: 12px 14px 11px; margin-left: var(--mx);
  transform: translateY(var(--ty)) rotate(var(--rot));
  background: radial-gradient(105% 90% at 20% 12%, rgba(94, 83, 64, .045), transparent 62%), var(--card);
  border: 1.2px dashed rgba(150, 133, 100, .42);
  border-radius: var(--r-a); box-shadow: var(--emboss); }
.note:nth-child(2n) { border-radius: var(--r-b); }
.note:nth-child(3n) { border-radius: var(--r-c); }
.n-head { display: flex; align-items: center; gap: 7px; min-width: 0; }
.n-face { display: inline-grid; place-items: center; width: 23px; height: 24px; flex: none;
  border: 1.2px solid #C9B99A; border-radius: 47% 53% 50% 50% / 52% 48% 54% 46%;
  font-size: 11px; color: var(--wood); }
.n-name { font-size: 12.5px; color: var(--wood); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.n-when { margin-left: auto; flex: none; font-size: 11px; color: var(--ink-faint); }
.n-say { margin-top: 7px; font-size: 14px; line-height: 1.9; letter-spacing: .02em; color: var(--ink);
  white-space: pre-wrap; word-break: break-word; }
.n-reply { display: flex; align-items: flex-start; gap: 6px; margin-top: 9px; padding: 6px 9px 7px;
  font-size: 12.5px; line-height: 1.8; color: var(--ink-soft); background: rgba(126, 154, 95, .09);
  border-radius: 4px 14px 5px 12px / 12px 5px 14px 6px; transform: rotate(.5deg); }
.n-reply :deep(svg) { color: var(--grass-deep); margin-top: 3px; }
.n-reply b { font-weight: normal; color: var(--grass-deep); }
.n-foot { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 6px; min-height: 20px; }
.n-erase { font-size: 11.5px; color: var(--ink-faint); opacity: 0; transition: opacity .3s; }
.note:hover .n-erase { opacity: 1; }
.n-erase:hover { color: var(--clay); }
.n-back { font-size: 12px; color: var(--wood); letter-spacing: .05em;
  text-decoration: underline wavy rgba(139, 107, 74, .45) 1px; text-underline-offset: 4px; }
.n-back:hover { color: var(--grass-deep); }
.n-form { margin-top: 8px; padding-top: 8px; border-top: 1.1px dashed rgba(150, 133, 100, .38); }
.n-form textarea { display: block; width: 100%; min-height: 50px; font-size: 13.5px; line-height: 1.8;
  border: none; background: transparent; color: var(--ink); padding: 2px 0 5px; }
.n-form textarea:focus { outline: none; }
.n-acts { display: flex; justify-content: flex-end; gap: 12px; margin-top: 4px; }
.n-x { font-size: 11.5px; color: var(--ink-faint); }
.n-send { font-size: 12.5px; color: var(--grass-deep);
  text-decoration: underline wavy rgba(79, 107, 58, .45) 1px; text-underline-offset: 4px; }
.n-send:disabled { opacity: .35; cursor: default; text-decoration-color: transparent; }
.n-empty { grid-column: 1 / -1; text-align: center; font-size: 13px; letter-spacing: .08em;
  color: var(--ink-faint); padding: 28px 0 18px; }
.reply-enter-active, .reply-leave-active { transition: opacity .3s, transform .3s; }
.reply-enter-from, .reply-leave-to { opacity: 0; transform: translateY(-4px); }

@media (max-width: 760px) {
  .notes { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 12px; }
}
@media (max-width: 520px) {
  .notes { grid-template-columns: 1fr; }
  .note { margin-left: 0; }
}
</style>
