<template>
  <div class="auth">
    <div class="auth-art">
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
        <rect width="400" height="300" fill="#F3EDDD"/>
        <circle cx="310" cy="70" r="34" fill="#E6C86E"/>
        <path d="M0 210 Q120 150 240 205 T400 195 V300 H0 Z" fill="#7FA650" opacity=".55"/>
        <path d="M0 240 Q140 195 280 240 T400 230 V300 H0 Z" fill="#557A34" opacity=".7"/>
        <path d="M90 235 Q88 205 90 190" stroke="#557A34" stroke-width="3" fill="none"/>
        <path d="M90 200 Q70 190 66 170 Q88 172 92 192" fill="#7FA650"/>
        <path d="M90 195 Q110 185 114 165 Q92 167 88 187" fill="#7FA650"/>
        <ellipse cx="150" cy="60" rx="34" ry="12" fill="#FFFDF6"/>
        <ellipse cx="180" cy="52" rx="24" ry="10" fill="#FFFDF6"/>
      </svg>
      <p class="auth-quote">「一个人安静下来，<br/>才能听见自己在想什么。」</p>
    </div>
    <div class="auth-form roll">
      <h1><Glyph name="sprout" :size="25"/> 一亩心田</h1>
      <p class="sub">回来翻土了？</p>
      <input v-model="form.username" placeholder="用户名"/>
      <input v-model="form.password" type="password" placeholder="密码" @keyup.enter="go"/>
      <button class="btn big" :disabled="busy" @click="go">{{ busy ? '土还在翻' : '进门' }}</button>
      <p class="to">头一回来？<router-link :to="{ path: '/register', query: route.query }">去开一块自己的田</router-link></p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUser } from '../store/user';
import Glyph from '../components/Glyph.vue';

const route = useRoute();
const router = useRouter();
const user = useUser();
const form = reactive({ username: '', password: '' });
const busy = ref(false);

async function go() {
  if (!form.username || !form.password) return;
  busy.value = true;
  try {
    await user.login(form);
    const to = typeof route.query.to === 'string' && /^\/(?!\/)/.test(route.query.to) ? route.query.to : '/';
    router.push(to);
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.auth { display: grid; grid-template-columns: 1.2fr 1fr; height: 100vh; overflow: hidden; }
.auth-art { position: relative; }
.auth-art svg { position: absolute; inset: 0; width: 100%; height: 100%; filter: saturate(.55) sepia(.16) contrast(.93); }
.auth-quote { position: absolute; bottom: 14%; left: 0; right: 0; text-align: center; color: #fff; font-size: var(--fs-read); text-shadow: 0 1px 4px rgba(63,58,47,.4); }
.auth-form { display: flex; flex-direction: column; justify-content: safe center; gap: 16px; padding: 40px 12%; }
.auth-form h1 { font-size: var(--fs-hero); }
.sub { color: var(--ink-soft); margin-top: -8px; }
.auth-form input { width: 100%; }
.btn.big { text-align: center; padding: 11px 0; font-size: var(--fs-read); }
.to { font-size: var(--fs-base); color: var(--ink-soft); }
.to a { color: var(--grass-deep); border-bottom: 1px dashed var(--grass); }
@media (max-width: 760px) { .auth { grid-template-columns: 1fr; } .auth-art { display: none; } }
</style>
