import { defineStore } from 'pinia';
import { isLatin } from '../constants/pens';

// 输入框吃中文笔风的变量；落墨 replay 时逐字按字形挑笔
export const usePen = defineStore('pen', {
  state: () => ({
    zh: localStorage.getItem('pen-zh') || 'xingkai',
    en: localStorage.getItem('pen-en') || 'roundhand'
  }),
  actions: {
    wear() {
      document.body.dataset.penzh = this.zh;
    },
    pick(group, id) {
      this[group] = id;
      localStorage.setItem('pen-' + group, id);
      if (group === 'zh') this.wear();
    },
    penFor(ch) {
      return isLatin(ch) ? this.en : this.zh;
    }
  }
});
