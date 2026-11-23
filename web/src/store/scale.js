import { defineStore } from 'pinia';

const KEY = 'trip-ui-scale';
const DESIGN_W = 1440;
const MIN = .92;
const MAX = 1;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

let listening = false;

// 字号整档跟着窗口走：大屏保持原样，窄屏和手机略收一点
export const useScale = defineStore('scale', {
  state: () => ({
    on: localStorage.getItem(KEY) === '1',
    factor: 1
  }),
  actions: {
    init() {
      this.measure();
      if (listening) return;
      listening = true;
      addEventListener('resize', () => this.measure());
    },
    measure() {
      const w = document.documentElement.clientWidth;
      // 只看宽度：页面本来就是整屏三栏，高度不够时各栏自己滚，不必因此把字压小
      this.factor = clamp(w / DESIGN_W, MIN, MAX);
      this.wear();
    },
    wear() {
      document.documentElement.style.setProperty('--ui-scale', this.on ? String(this.factor) : '1');
    },
    toggle() {
      this.on = !this.on;
      localStorage.setItem(KEY, this.on ? '1' : '0');
      this.wear();
    }
  }
});
