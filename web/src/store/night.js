import { defineStore } from 'pinia';

const KEY = 'trip-night';

// 天黑不是换一层滤镜：纸换成深蓝墨，月光、星子和落叶都慢下来
export const useNight = defineStore('night', {
  state: () => ({ on: false }),
  actions: {
    init() {
      this.on = localStorage.getItem(KEY) === '1';
      document.body.dataset.night = this.on ? '1' : '0';
    },
    toggle() {
      this.on = !this.on;
      localStorage.setItem(KEY, this.on ? '1' : '0');
      document.body.classList.add('night-fade');
      document.body.dataset.night = this.on ? '1' : '0';
      clearTimeout(this.timer);
      this.timer = setTimeout(() => document.body.classList.remove('night-fade'), 1900);
    }
  }
});
