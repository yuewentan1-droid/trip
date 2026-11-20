import { defineStore } from 'pinia';
import { api } from '../api';

// 头像旁边那一小撮：留言、敲门、开门的回音。没有就什么都不挂
export const useNotice = defineStore('notice', {
  state: () => ({ messages: 0, knocks: 0, approvals: 0, latest: null }),
  getters: { doors: s => s.knocks + s.approvals },
  actions: {
    async load() {
      if (!localStorage.getItem('token')) return;
      Object.assign(this, await api.notices());
    }
  }
});
