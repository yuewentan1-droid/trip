import { defineStore } from 'pinia';
import { api } from '../api';

export const useUser = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: JSON.parse(localStorage.getItem('user') || 'null')
  }),
  getters: { isLogin: s => !!s.token },
  actions: {
    async login(form) { this.set(await api.login(form)); },
    async register(form) { this.set(await api.register(form)); },
    async load() {
      this.user = await api.me();
      localStorage.setItem('user', JSON.stringify(this.user));
    },
    async save(patch) {
      this.user = await api.updateMe(patch);
      localStorage.setItem('user', JSON.stringify(this.user));
      return this.user;
    },
    set(d) {
      this.token = d.token;
      this.user = d.user;
      localStorage.setItem('token', d.token);
      localStorage.setItem('user', JSON.stringify(d.user));
    },
    logout() {
      this.token = '';
      this.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
});
