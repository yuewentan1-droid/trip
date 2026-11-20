import { defineStore } from 'pinia';
import { api } from '../api';

// 原野、树、我的田地共吃这一份：新开了一块地，回到原野树就该多长一根枝
export const useField = defineStore('field', {
  state: () => ({ topics: [], sessions: [], ready: false }),
  getters: {
    words: s => s.sessions.reduce((a, x) => a + x.words, 0),
    // 挖得最深的那块地决定原野上是不是该长出藤蔓
    deepest: s => s.sessions.reduce((a, x) => Math.max(a, x.level), 0)
  },
  actions: {
    async refresh() {
      const [topics, sessions] = await Promise.all([api.topics(), api.sessions()]);
      this.topics = topics;
      this.sessions = sessions;
      this.ready = true;
    },
    async dig(d) {
      const s = await api.newSession(d);
      this.sessions.unshift({ ...s, words: 0, last_at: s.started_at });
      return s;
    },
    async sow(d) {
      const t = await api.addTopic(d);
      this.topics.push(t);
      return t;
    },
    patch(id, p) {
      const i = this.sessions.findIndex(s => s.id === id);
      if (i > -1) this.sessions[i] = { ...this.sessions[i], ...p };
    },
    uproot(id) {
      this.topics = this.topics.filter(t => t.id !== id);
    },
    clear(id) {
      this.sessions = this.sessions.filter(s => s.id !== id);
    }
  }
});
