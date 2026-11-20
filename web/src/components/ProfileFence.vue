<script setup>
import { ref, watch } from 'vue';
import { api } from '../api';
import { useUser } from '../store/user';
import { toast } from '../utils/toast';
import FenceDialog from './FenceDialog.vue';
import Glyph from './Glyph.vue';

const props = defineProps({ open: Boolean });
const emit = defineEmits(['close']);
const user = useUser();

const nickname = ref('');
const gardenName = ref('');
const bio = ref('');
const oldPass = ref('');
const newPass = ref('');
const busy = ref(false);

watch(() => props.open, on => {
  if (!on) return;
  nickname.value = user.user?.nickname || '';
  gardenName.value = user.user?.garden_name || '';
  bio.value = user.user?.bio || '';
  oldPass.value = newPass.value = '';
});

const chars = s => [...String(s)].length;

async function save() {
  const name = nickname.value.trim();
  if (!name) return toast('名字不能空着');
  if (chars(name) > 10) return toast('名字最多十个字');
  if (chars(gardenName.value.trim()) > 10) return toast('田名最多十个字');
  busy.value = true;
  try {
    await user.save({ nickname: name, garden_name: gardenName.value.trim(), bio: bio.value.trim() });
    toast('名字和地都改好了');
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
    await api.updatePassword({ old_password: oldPass.value, password: newPass.value });
    oldPass.value = newPass.value = '';
    toast('密码换好了，下回用新的');
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <FenceDialog :open="open" title="自己的田，自己的名" note="名字最长十个字，重了长不出来" @close="$emit('close')">
    <section class="pf-block">
      <p class="pf-user"><Glyph name="user" :size="15"/> 登录的名字：{{ user.user?.username }}</p>
      <div class="pf-item">
        <label>别人怎么叫你</label>
        <input v-model="nickname" maxlength="10" placeholder="十个字以内"/>
        <i>{{ chars(nickname) }} / 10</i>
      </div>
      <div class="pf-item">
        <label>这块地叫什么</label>
        <input v-model="gardenName" maxlength="10" placeholder="空着就叫「你的名字的地」"/>
        <i>{{ chars(gardenName) }} / 10</i>
      </div>
      <div class="pf-item">
        <label>篱笆上的一句话</label>
        <input v-model="bio" maxlength="30" placeholder="想让路过的人先看见什么"/>
      </div>
      <div class="pf-acts">
        <button class="btn" :disabled="busy" @click="save">改好了</button>
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
      <div class="pf-acts">
        <button class="pf-key" :disabled="busy" @click="password">换钥匙</button>
      </div>
    </section>
  </FenceDialog>
</template>

<style scoped>
.pf-block { padding: 4px 2px 2px; }
.pf-user { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--ink-faint);
  letter-spacing: .05em; margin-bottom: 10px; }
.pf-item { position: relative; margin-bottom: 13px; }
.pf-item label { display: block; font-size: 12.5px; color: var(--ink-soft); margin-bottom: 2px; }
.pf-item i { position: absolute; right: 2px; bottom: 6px; font-style: normal; font-size: 10.5px; color: var(--ink-faint); }
.pf-item input { padding-right: 42px; }
.pf-acts { display: flex; justify-content: flex-end; }
.pf-pass { margin-top: 16px; padding-top: 14px; border-top: 1.2px dashed rgba(150, 133, 100, .38); }
.pf-pass h4 { display: flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: normal;
  color: var(--wood); letter-spacing: .06em; margin-bottom: 9px; }
.pf-key { font-size: 13px; color: var(--wood); letter-spacing: .08em; padding: 3px 0 4px;
  text-decoration: underline wavy rgba(139, 107, 74, .42) 1px; text-underline-offset: 5px; }
.pf-key:hover { color: var(--grass-deep); }
</style>
