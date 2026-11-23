<script setup>
import { ref, watch } from 'vue';
import { api } from '../api';
import { useUser } from '../store/user';
import { lock } from '../utils/lock';
import { toast } from '../utils/toast';
import FenceDialog from './FenceDialog.vue';
import Glyph from './Glyph.vue';

const props = defineProps({ open: Boolean });
const emit = defineEmits(['close']);
const user = useUser();

const nickname = ref('');
const gardenName = ref('');
const bio = ref('');
const fencePrivate = ref(false);
const oldPass = ref('');
const newPass = ref('');
const busy = ref(false);

watch(() => props.open, on => {
  if (!on) return;
  nickname.value = user.user?.nickname || '';
  gardenName.value = user.user?.garden_name || '';
  bio.value = user.user?.bio || '';
  fencePrivate.value = !!user.user?.fence_private;
  oldPass.value = newPass.value = '';
});

const chars = s => [...String(s)].length;

async function save() {
  const name = nickname.value.trim();
  if (!name) return toast('名字不能空着');
  if (chars(name) > 10) return toast('名字最多十个字');
  if (chars(gardenName.value.trim()) > 10) return toast('田名最多十个字');
  if (chars(bio.value.trim()) > 30) return toast('篱笆上那句话最多三十个字');
  busy.value = true;
  try {
    await user.save({
      nickname: name,
      garden_name: gardenName.value.trim(),
      bio: bio.value.trim(),
      fence_private: fencePrivate.value ? 1 : 0
    });
    toast('名字、地和篱笆都改好了');
    emit('close');
  } finally {
    busy.value = false;
  }
}

async function password() {
  if (!oldPass.value || !newPass.value) return toast('两格都得填上');
  if (newPass.value.length < 6) return toast('新密码至少六位');
  busy.value = true;
  try {
    const [old_password, password] = await Promise.all([lock(oldPass.value), lock(newPass.value)]);
    await api.updatePassword({ old_password, password });
    oldPass.value = newPass.value = '';
    toast('密码换好了，下回用新的');
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <FenceDialog :open="open" title="自己的田，自己的名" @close="$emit('close')">
    <section class="pf-block">
      <p class="pf-user"><Glyph name="user" :size="15"/> 登录的名字：{{ user.user?.username }}</p>
      <div class="pf-item">
        <label>别人怎么叫你</label>
        <input v-model="nickname"/>
      </div>
      <div class="pf-item">
        <label>这块地叫什么</label>
        <input v-model="gardenName" placeholder="空着就叫「你的名字的地」"/>
      </div>
      <div class="pf-item">
        <label>篱笆上的一句话</label>
        <input v-model="bio" placeholder="想让路过的人先看见什么"/>
      </div>
      <div class="pf-item">
        <label>别人留在篱笆上的话</label>
        <div class="pf-pick">
          <button :class="{ on: !fencePrivate }" @click="fencePrivate = false">谁路过都看得见</button>
          <button :class="{ on: fencePrivate }" @click="fencePrivate = true">只给自己和说过话的人</button>
        </div>
      </div>
    </section>

    <section class="pf-block pf-pass">
      <h4><Glyph name="shield" :size="15"/> 换把钥匙</h4>
      <div class="pf-item">
        <label>原来的密码</label>
        <input v-model="oldPass" type="password" autocomplete="current-password"/>
      </div>
      <div class="pf-item">
        <label>新密码（至少六位）</label>
        <input v-model="newPass" type="password" autocomplete="new-password"/>
      </div>
    </section>

    <div class="pf-acts">
      <button class="btn" :disabled="busy" @click="password">换钥匙</button>
      <button class="btn" :disabled="busy" @click="save">改好了</button>
    </div>
  </FenceDialog>
</template>

<style scoped>
.pf-block { padding: 4px 2px 2px; }
.pf-user { display: flex; align-items: center; gap: 6px; font-size: var(--fs-md); color: var(--ink-faint);
  letter-spacing: .05em; margin-bottom: 10px; }
.pf-item { margin-bottom: 10px; }
.pf-item label { display: block; font-size: var(--fs-md); color: var(--ink-soft); line-height: 1.4; margin-bottom: 2px; }
/* 纸上的字挨得紧些，五格填完一屏就放得下 */
.pf-item input { line-height: 1.35; padding: 2px 4px 2px; }
/* 两句话挑一句，选中的那条拿草汁描一描 */
.pf-pick { display: flex; flex-wrap: wrap; gap: 4px 16px; }
.pf-pick button { font-size: var(--fs-md); color: var(--ink-faint); letter-spacing: .04em; line-height: 1.5;
  padding: 2px 1px 4px; border-bottom: 1.2px dashed transparent; transition: color .3s, border-color .3s; }
.pf-pick button:hover { color: var(--wood); }
.pf-pick button.on { color: var(--grass-deep); border-bottom-color: rgba(79, 107, 58, .5); }
.pf-acts { display: flex; justify-content: flex-end; gap: 12px; margin-top: 4px; }
.pf-pass { margin-top: 10px; padding-top: 9px; border-top: 1.2px dashed rgba(150, 133, 100, .38); }
.pf-pass h4 { display: flex; align-items: center; gap: 6px; font-size: var(--fs-base); font-weight: normal;
  color: var(--wood); letter-spacing: .06em; margin-bottom: 6px; }
</style>
