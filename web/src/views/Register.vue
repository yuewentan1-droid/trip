<template>
  <div class="auth">
    <div class="auth-art">
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
        <rect width="400" height="300" fill="#F3EDDD"/>
        <circle cx="88" cy="62" r="26" fill="#E6C86E"/>
        <path d="M0 195 Q130 150 260 200 T400 185 V300 H0 Z" fill="#7FA650" opacity=".55"/>
        <path d="M0 235 Q150 200 300 240 T400 228 V300 H0 Z" fill="#557A34" opacity=".7"/>
        <path d="M200 250 Q198 218 200 202" stroke="#557A34" stroke-width="3" fill="none"/>
        <path d="M200 214 Q178 206 174 184 Q198 188 202 208" fill="#7FA650"/>
        <path d="M200 208 Q222 200 226 178 Q202 182 198 202" fill="#7FA650"/>
        <ellipse cx="300" cy="48" rx="30" ry="11" fill="#FFFDF6"/>
      </svg>
      <p class="auth-quote">新发的芽，<br/>都从没人看好的一块土里长出来。</p>
    </div>
    <div class="auth-form roll">
      <h1>开一块新田</h1>
      <p class="sub">起个名字，以后这块地就是你的。</p>
      <input v-model="form.username" placeholder="用户名"/>
      <input v-model="form.password" type="password" placeholder="密码" @keyup.enter="go"/>
      <button class="btn big" :disabled="busy" @click="go">{{ busy ? '土还在翻' : '立个字据' }}</button>
      <p class="to">已经有地了？<router-link :to="{ path: '/login', query: route.query }">直接进门</router-link></p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUser } from '../store/user';
import { lock } from '../utils/lock';

const route = useRoute();
const router = useRouter();
const user = useUser();
const form = reactive({ username: '', password: '' });
const busy = ref(false);

async function go() {
  if (!form.username || !form.password) return;
  busy.value = true;
  try {
    await user.register({ username: form.username, password: await lock(form.password) });
    const to = typeof route.query.to === 'string' && /^\/(?!\/)/.test(route.query.to) ? route.query.to : '/';
    router.push(to);
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.auth { display: grid; grid-template-columns: 1.2fr 1fr; height: 100vh; height: 100dvh; overflow: hidden; }
.auth-art { position: relative; }
.auth-art svg { position: absolute; inset: 0; width: 100%; height: 100%; filter: saturate(.55) sepia(.16) contrast(.93); }
.auth-quote { position: absolute; bottom: 14%; left: 0; right: 0; text-align: center; color: #fff; font-size: var(--fs-read); text-shadow: 0 1px 4px rgba(63,58,47,.4); }
.auth-form { display: flex; flex-direction: column; justify-content: safe center; gap: 16px;
  padding: max(40px, env(safe-area-inset-top)) max(12%, env(safe-area-inset-right))
    max(40px, env(safe-area-inset-bottom)) max(12%, env(safe-area-inset-left)); }
.auth-form h1 { font-size: var(--fs-hero); }
.sub { color: var(--ink-soft); margin-top: -8px; }
.btn.big { text-align: center; padding: 11px 0; font-size: var(--fs-read); }
.to { font-size: var(--fs-base); color: var(--ink-soft); }
.to a { color: var(--grass-deep); border-bottom: 1px dashed var(--grass); }
@media (max-width: 760px) {
  .auth { grid-template-columns: 1fr; }
  .auth-art { display: none; }
  .auth-form { justify-content: flex-start; gap: 15px;
    padding: calc(34px + env(safe-area-inset-top)) max(24px, 8vw)
      calc(30px + env(safe-area-inset-bottom)); }
}
@media (max-width: 480px) {
  .auth-form { padding-left: max(20px, env(safe-area-inset-left));
    padding-right: max(20px, env(safe-area-inset-right)); }
  .auth-form h1 { font-size: var(--fs-title); }
  .btn.big { padding: 12px 0; }
}
</style>
