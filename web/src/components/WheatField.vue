<script setup>
import Glyph from './Glyph.vue';

const props = defineProps({ n: { type: Number, default: 15 }, frozen: Boolean });

// 高矮、倾角、快慢、先倒向哪边各根不一样，风一阵一阵过，不许整齐地一起晃
const stalks = Array.from({ length: props.n }, (_, i) => ({
  h: 72 + ((i * 5) % 7) * 6,
  amp: ((1.7 + ((i * 3) % 5) * .8) * (i % 2 ? -1 : 1)).toFixed(2),
  lean: ((((i * 11) % 9) - 4) * .55).toFixed(2),
  dur: (4.1 + ((i * 7) % 5) * .63).toFixed(2),
  dl: (-((i * 1.7) % 9)).toFixed(2)
}));

// 草棵子垫在麦子脚边，白蝴蝶才有地方停
const tufts = Array.from({ length: Math.round(props.n / 3) }, (_, i) => ({
  h: 27 + (i * 7) % 11,
  x: 3 + (i * 21.4) % 88,
  c: i % 2 ? 'var(--grass)' : 'var(--grass-deep)',
  dur: (6.8 + ((i * 5) % 4) * .95).toFixed(2),
  dl: (-((i * 2.1) % 6)).toFixed(2),
  amp: (1.5 + ((i * 3) % 4) * .7).toFixed(2)
}));

// 格桑花开得稀稀落落，高一枝矮一枝，颜色也不成套路
const PETAL = ['var(--sakura)', 'var(--lilac)', 'var(--wheat)', 'var(--sakura)'];
const blooms = Array.from({ length: Math.round(props.n * .4) }, (_, i) => ({
  c: PETAL[i % 4],
  s: 23 + (i * 5) % 7,
  x: 6 + (i * 17.3) % 86,
  b: 6 + (i * 13) % 48,
  rot: ((i * 29) % 34) - 17,
  // 花比麦子沉得住气，风过去了它才慢慢跟上
  dur: (7.6 + ((i * 5) % 4) * 1.1).toFixed(2),
  dl: (-((i * 2.3) % 7)).toFixed(2),
  amp: (2.1 + ((i * 3) % 4) * .9).toFixed(2)
}));

// 白的黄的各半，慢慢晃，晃到麦梢上就停一阵再起身
const flies = Array.from({ length: props.n > 12 ? 4 : 3 }, (_, i) => ({
  c: i % 2 ? 'var(--wheat)' : 'var(--card)',
  s: 14 + (i * 3) % 5,
  x: 14 + (i * 24.6) % 66,
  b: 28 + (i * 17) % 44,
  fx: (i % 2 ? -1 : 1) * (44 + i * 19),
  up: 20 + (i * 11) % 18,
  dur: (19 + (i * 5.3) % 12).toFixed(2),
  dl: (-((i * 4.7) % 11)).toFixed(2),
  beat: (.76 + (i * .13) % .3).toFixed(2)
}));
</script>

<template>
  <div class="field" :class="{ frozen }">
    <div v-for="(s, i) in stalks" :key="i" class="stalk"
      :style="{ '--amp': s.amp + 'deg', '--lean': s.lean + 'deg', '--dur': s.dur + 's', '--dl': s.dl + 's' }">
      <svg :width="s.h * 0.45" :height="s.h" viewBox="0 0 26 60">
        <path d="M13 60 Q12 40 13 30" stroke="#B89B5E" stroke-width="1.6" fill="none"/>
        <g class="ear">
          <g fill="#E6C86E" stroke="#C9A24B" stroke-width=".6">
            <ellipse cx="13" cy="10" rx="3" ry="5"/>
            <ellipse cx="8.5" cy="17" rx="2.6" ry="4.4" transform="rotate(-24 8.5 17)"/>
            <ellipse cx="17.5" cy="17" rx="2.6" ry="4.4" transform="rotate(24 17.5 17)"/>
            <ellipse cx="8.5" cy="25" rx="2.6" ry="4.4" transform="rotate(-24 8.5 25)"/>
            <ellipse cx="17.5" cy="25" rx="2.6" ry="4.4" transform="rotate(24 17.5 25)"/>
          </g>
          <g stroke="#D9BE72" stroke-width="1">
            <path d="M13 6 L10 0"/><path d="M13 6 L17 1"/><path d="M9 13 L3 8"/><path d="M17 13 L23 8"/>
          </g>
        </g>
      </svg>
    </div>

    <!-- 草、花、蝴蝶不跟着麦子排队，各自钉在自己的位置上，才不像种出来的 -->
    <svg v-for="(t, i) in tufts" :key="'t' + i" class="tuft" :style="{ left: t.x + '%', '--amp': t.amp + 'deg', '--dur': t.dur + 's', '--dl': t.dl + 's' }"
      :height="t.h" :width="t.h * .92" viewBox="0 0 24 26">
      <g fill="none" :stroke="t.c" stroke-width="1.5" stroke-linecap="round">
        <path d="M12 26 Q10 16 6 8"/><path d="M12 26 Q12 15 12.5 4"/>
        <path d="M12 26 Q14 17 18.5 9"/><path d="M12 26 Q9 20 3 17"/>
      </g>
    </svg>

    <Glyph v-for="(f, i) in blooms" :key="'b' + i" class="bloom" name="daisy" :size="f.s" :boil="false"
      :style="{ left: f.x + '%', bottom: f.b + '%', color: f.c, '--rot': f.rot + 'deg',
        '--amp': f.amp + 'deg', '--dur': f.dur + 's', '--dl': f.dl + 's' }"/>

    <span v-for="(b, i) in flies" :key="'f' + i" class="flit"
      :style="{ left: b.x + '%', bottom: b.b + '%', '--fx': b.fx + 'px', '--up': b.up + 'px',
        animationDuration: b.dur + 's', animationDelay: b.dl + 's' }">
      <Glyph class="bfly" name="fly" :size="b.s" :boil="false"
        :style="{ color: b.c, animationDuration: b.beat + 's', animationDelay: b.dl + 's' }"/>
    </span>
  </div>
</template>

<style scoped>
.field {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 0 3vw;
  height: 120px;
  overflow: hidden;   /* 麦秆不换行，窄屏就让它顺势长出画外，别把整页撑出横滚 */
  pointer-events: none;
}
.stalk { transform-origin: bottom center; animation: sway var(--dur) ease-in-out var(--dl) infinite alternate; }
.ear { transform-box: view-box; transform-origin: 13px 30px;
  animation: nod calc(var(--dur) * 1.45) ease-in-out var(--dl) infinite alternate; }

.tuft { position: absolute; bottom: -2px; transform-origin: bottom center; opacity: .8; --lean: 0deg;
  animation: sway var(--dur) ease-in-out var(--dl) infinite alternate; }
.bloom { position: absolute; transform-origin: bottom center; opacity: .88;
  transform: rotate(var(--rot));
  animation: bloomSway var(--dur) ease-in-out var(--dl) infinite alternate; }
/* 花自己那点倾角得留住，风只能在这个基础上再推一把 */
@keyframes bloomSway {
  from { transform: rotate(calc(var(--rot) - var(--amp))); }
  to { transform: rotate(calc(var(--rot) + var(--amp))); }
}

.flit { position: absolute; animation: flit linear infinite alternate; }
.bfly { display: block; animation: beat ease-in-out infinite alternate; }
/* 慢慢晃过去，落到麦梢上停一阵，再慢慢起身 */
@keyframes flit {
  0% { transform: translate(0, 0) rotate(-5deg); }
  22% { transform: translate(calc(var(--fx) * .45), calc(var(--up) * -.55)) rotate(7deg); }
  41% { transform: translate(var(--fx), 3px) rotate(-2deg); }
  60% { transform: translate(var(--fx), 3px) rotate(-2deg); }
  81% { transform: translate(calc(var(--fx) * 1.35), calc(var(--up) * -.8)) rotate(9deg); }
  100% { transform: translate(calc(var(--fx) * 1.75), 0) rotate(-4deg); }
}
@keyframes beat { from { transform: scaleX(1); } to { transform: scaleX(.68); } }

.frozen .stalk, .frozen .ear, .frozen .tuft, .frozen .bloom,
.frozen .flit, .frozen .bfly { animation-play-state: paused; }
</style>
