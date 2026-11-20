import { defineStore } from 'pinia';
import { api } from '../api';

// 头像旁边那一小撮：收到的、留出去的、门里门外的动静。没有就什么都不挂
export const useNotice = defineStore('notice', {
  state: () => ({
    messages: 0, sent: 0, replies: 0, knocks: 0, approvals: 0, waiting: 0, declined: 0,
    latest: null, latest_reply: null, latest_sent: null
  }),
  getters: {
    words: s => Number(s.messages) + Number(s.sent),
    doors: s => Number(s.knocks) + Number(s.approvals) + Number(s.waiting) + Number(s.declined),
    drift: s => {
      const picks = [];
      if (s.latest) picks.push({ ...s.latest, kind: 'in', at: s.latest.created_at });
      if (s.latest_reply) picks.push({ ...s.latest_reply, kind: 'reply', at: s.latest_reply.replied_at });
      if (s.latest_sent && !s.latest_sent.reply)
        picks.push({ ...s.latest_sent, kind: 'sent', at: s.latest_sent.created_at });
      const rank = { reply: 2, in: 1, sent: 0 };
      return picks.sort((a, b) =>
        String(b.at || '').localeCompare(String(a.at || '')) || rank[b.kind] - rank[a.kind]
      )[0] || null;
    }
  },
  actions: {
    async load() {
      if (!localStorage.getItem('token')) return;
      Object.assign(this, await api.notices());
    }
  }
});
