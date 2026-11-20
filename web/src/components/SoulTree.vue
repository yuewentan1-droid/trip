<script setup>
import { computed, ref } from 'vue';
import { usePen } from '../store/pen';
import { iconUri } from '../icons';

// 这棵树是用户种过的地长出来的：一块地一根枝。先种的在最下头，枝往横里伸得最远；
// 后种的往上叠，枝越收越短。挖得深了，枝梢再垂下一两条长长的藤。
const props = defineProps({
  sessions: { type: Array, default: () => [] },
  peek: Boolean
});
const emit = defineEmits(['open']);
const pen = usePen();

const hash = s => [...String(s)].reduce((h, c) => (h * 31 + c.codePointAt(0)) >>> 0, 11);
const seg = (h, s, n) => (h >>> s) % n;

const X = 120, GROUND = 218, TOP = 52;
// 从下往上六层，底下最宽，头顶只留一小撮
const WEIGHTS = [7, 6, 5, 4, 3, 2];

const rows = computed(() => {
  const list = props.sessions
    .filter(s => s.placement === 'tree' || !s.placement)
    .slice()
    .sort((a, b) => a.id - b.id);
  // 封存时挑过枝的，就认那根枝；没挑过的照旧从下往上匀着落
  const at = s => (Number.isInteger(s.branch) && s.branch >= 0 && s.branch < 12 ? s.branch : null);
  const free = list.filter(s => at(s) === null);
  const total = WEIGHTS.reduce((a, w) => a + w, 0);
  let rest = free.length;
  const caps = WEIGHTS.map(w => {
    const c = Math.min(rest, Math.round(free.length * w / total));
    rest -= c;
    return c;
  });
  for (let i = 0; rest > 0; i = (i + 1) % caps.length) { caps[i]++; rest--; }

  const buckets = Array.from({ length: 6 }, () => [[], []]);
  let k = 0;
  caps.forEach((cap, r) => {
    free.slice(k, k + cap).forEach((s, i) => buckets[r][i % 2].push(s));
    k += cap;
  });
  list.filter(s => at(s) !== null).forEach(s => {
    const b = at(s);
    buckets[b >> 1][b & 1].push(s);
  });

  return buckets.map((sides, r) => {
    if (!sides[0].length && !sides[1].length) return null;
    return {
      r,
      y: 198 - r * 29 + r * r * .9,
      len: 104 - r * 11,
      sides: [
        { side: -1, list: sides[0].sort((a, b) => a.id - b.id) },
        { side: 1, list: sides[1].sort((a, b) => a.id - b.id) }
      ]
    };
  }).filter(Boolean);
});

// 把一根枝上的每一块地算成一张叶/一朵花的位置；沿着枝排，谁也不压谁
function point(p0, c, p1, t) {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x,
    y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y,
    a: Math.atan2(
      2 * u * (c.y - p0.y) + 2 * t * (p1.y - c.y),
      2 * u * (c.x - p0.x) + 2 * t * (p1.x - c.x)
    ) * 180 / Math.PI
  };
}
const cubic = (a, b, c, d, t) => {
  const u = 1 - t;
  return {
    x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
    y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y
  };
};

const canopy = computed(() => rows.value.flatMap(row => row.sides.map(({ side, list }) => {
  // 左右枝不一样长、不一样高，才不像被谁剪过
  const h0 = hash(row.r + ':' + side);
  const p0 = { x: X, y: row.y + (seg(h0, 5, 7) - 3) };
  const len = row.len * (.86 + seg(h0, 9, 26) / 100);
  const p1 = { x: X + side * len, y: row.y - (8 + row.r * 5 + seg(h0, 15, 30)) };
  const c = { x: X + side * len * .46, y: row.y - (2 + row.r * 3) };
  const n = list.length;
  const leaves = list.map((s, i) => {
    const h = hash(s.id + s.title);
    const t = n === 1 ? .72 : .3 + i * .66 / (n - 1);
    const p = point(p0, c, p1, t);
    const sealed = s.status === 'finished';
    const size = Math.max(12.5, 19 - n * .8) * (seg(h, 3, 20) / 100 + .95);
    const bloom = sealed ? (seg(h, 6, 3) ? 'blossom' : 'daisy') : (seg(h, 9, 4) ? 'leaf' : 'sprout');
    // 一滴一片叶/一朵花：这块地挖了多少滴，枝上就多长几片，最多铺到八片
    const drops = Array.from({ length: Math.min(8, Math.max(1, s.thought_count || 1)) - 1 }, (_, k) => {
      const hh = hash(s.id + ':d' + k);
      const a = seg(hh, 3, 360) * Math.PI / 180;
      const r = 6 + seg(hh, 7, 8);
      const g = sealed
        ? ['blossom', 'daisy', 'sakura', 'flower'][seg(hh, 11, 4)]
        : ['leaf', 'sprout', 'leaf', 'tulip'][seg(hh, 11, 4)];
      return {
        k, dx: Math.cos(a) * r, dy: Math.sin(a) * r * .72 - 1,
        size: 6.5 + seg(hh, 15, 5),
        rot: seg(hh, 19, 60) - 30,
        icon: iconUri(g, sealed ? (seg(hh, 23, 2) ? '#C9A24B' : '#B07A55') : '#4F6B3A'),
        dur: 5 + seg(hh, 27, 100) / 100 * 3,
        amp: 1 + seg(hh, 29, 100) / 100 * 2
      };
    });
    return {
      s, x: p.x, y: p.y,
      rot: p.a + (seg(h, 12, 30) - 15),
      size, drops,
      icon: iconUri(bloom, sealed ? (bloom === 'daisy' ? '#C9A24B' : '#B07A55') : '#4F6B3A'),
      amp: 1.6 + seg(h, 17, 100) / 100 * 2.4,
      dur: 4.2 + seg(h, 22, 100) / 100 * 3.2,
      dl: -(seg(h, 27, 100) / 100 * 7).toFixed(2)
    };
  });
  // 枝上零零碎碎的叶子，不认哪块地，只负责把树撑得像棵树
  const sprays = Array.from({ length: 4 + (row.r % 2) }, (_, k) => {
    const h = hash(h0 + ':' + k);
    const t = .52 + k * .13;
    const p = point(p0, c, p1, t);
    const off = (k % 2 ? 1 : -1) * (4 + seg(h, 4, 6));
    return {
      k: h0 + 's' + k,
      x: p.x, y: p.y + off,
      size: 9.5 + seg(h, 8, 5),
      rot: p.a + seg(h, 12, 70) - 35,
      icon: iconUri(seg(h, 17, 3) ? 'leaf' : 'sprout', seg(h, 20, 2) ? '#7E9A5F' : '#4F6B3A'),
      dur: 5 + seg(h, 24, 100) / 100 * 3
    };
  });
  // 半道上斜出一根小杈，树才不是一把梯子
  const b0 = point(p0, c, p1, .48 + seg(h0, 27, 16) / 100);
  const tw = { x: b0.x + side * (15 + seg(h0, 11, 9)), y: b0.y - (19 + seg(h0, 13, 11)) };
  const twig = `M${b0.x.toFixed(1)} ${b0.y.toFixed(1)} q ${side * (8 + seg(h0, 3, 5))} ${-8 - seg(h0, 7, 6)}, ${(tw.x - b0.x).toFixed(1)} ${(tw.y - b0.y).toFixed(1)}`;
  return {
    k: row.r + ':' + side,
    d: `M${p0.x} ${p0.y} Q ${c.x} ${c.y}, ${p1.x} ${p1.y}`,
    twig,
    twigTip: {
      ...tw,
      rot: seg(h0, 23, 60) - 30,
      size: 8 + seg(h0, 25, 4),
      icon: iconUri(seg(h0, 29, 3) ? 'leaf' : 'sprout', '#4F6B3A')
    },
    r: row.r, side, p1, leaves, sprays
  };
})));

// 哪根枝上挖得深，枝梢就垂一条长藤；层数越多，藤越长，一路还挂着碎叶
const tails = computed(() => canopy.value
  .map(b => {
    const lv = Math.max(...b.leaves.map(l => l.s.level || 1));
    if (lv < 2) return null;
    const h = hash(b.k);
    const room = 228 - b.p1.y;
    const len = Math.min(room, (24 + lv * 11) * (.8 + seg(h, 4, 20) / 100));
    const x0 = b.p1.x, y0 = b.p1.y;
    const A = { x: x0, y: y0 };
    const B = { x: x0 + b.side * 7, y: y0 + len * .34 };
    const C = { x: x0 - b.side * 3, y: y0 + len * .72 };
    const D = { x: x0 + b.side * 3, y: y0 + len };
    const icon = iconUri(seg(h, 8, 2) ? 'leaf' : 'sprout', '#4F6B3A');
    return {
      k: 't' + b.k, lv, icon,
      d: `M${x0.toFixed(1)} ${y0.toFixed(1)} C ${B.x.toFixed(1)} ${B.y.toFixed(1)}, ${C.x.toFixed(1)} ${C.y.toFixed(1)}, ${D.x.toFixed(1)} ${D.y.toFixed(1)}`,
      x: D.x, y: D.y,
      s: 8 + seg(h, 12, 4),
      vine: [.22, .42, .62, .8].map((t, i) => {
        const p = cubic(A, B, C, D, t);
        const hh = hash(h + ':' + i);
        return {
          k: t, x: p.x + (i % 2 ? 1 : -1) * (3 + seg(hh, 3, 3)), y: p.y,
          s: 5.5 + seg(hh, 7, 3), rot: seg(hh, 11, 80) - 40
        };
      })
    };
  })
  .filter(Boolean));

const hot = ref(null);
const over = m => (hot.value = m);
const off = () => (hot.value = null);
</script>

<template>
  <div class="soul">
    <svg class="tree" viewBox="0 0 240 240" fill="none" aria-hidden="true">
      <g class="ink">
        <path class="root" pathLength="1"
          d="M120 218 C 104 216, 92 221, 82 228 M120 218 C 136 216, 148 221, 158 228 M120 216 C 116 224, 112 231, 108 238"/>
        <path class="trunk" pathLength="1" style="animation-delay:.15s"
          d="M120 218 C 113 194, 127 176, 120 152 C 113 128, 127 108, 120 84 C 117 72, 119 62, 120 50"/>

        <path v-for="b in canopy" :key="'b' + b.k" class="bough" pathLength="1" :d="b.d"
          :style="{ animationDelay: .5 + b.r * .12 + 's' }"/>
        <path v-for="b in canopy" :key="'w' + b.k" class="twig" pathLength="1" :d="b.twig"
          :style="{ animationDelay: .9 + b.r * .12 + 's' }"/>
        <path v-for="t in tails" :key="t.k" class="tendril" pathLength="1" :d="t.d"
          :style="{ animationDelay: 1.4 + t.y * .004 + 's' }"/>

        <!-- 头顶那一撮新芽，树再旧也得往上长 -->
        <image :href="iconUri('sprout', '#4F6B3A')" x="110" y="36" width="20" height="20" class="crown"/>
      </g>

      <g v-for="b in canopy" :key="b.k">
        <g class="spray" :transform="`translate(${b.twigTip.x.toFixed(1)} ${b.twigTip.y.toFixed(1)})`">
          <g :transform="`rotate(${b.twigTip.rot})`">
            <image :href="b.twigTip.icon" :x="-b.twigTip.size / 2" :y="-b.twigTip.size / 2"
              :width="b.twigTip.size" :height="b.twigTip.size"/>
          </g>
        </g>
        <g v-for="sp in b.sprays" :key="sp.k" class="spray"
          :transform="`translate(${sp.x.toFixed(1)} ${sp.y.toFixed(1)})`">
          <g :transform="`rotate(${sp.rot.toFixed(1)})`">
            <image :href="sp.icon" :x="-sp.size / 2" :y="-sp.size / 2" :width="sp.size" :height="sp.size"
              :style="{ animationDuration: sp.dur + 's' }"/>
          </g>
        </g>
        <g v-for="l in b.leaves" :key="l.s.id" class="mark" :class="{ hot: hot === l }"
          :transform="`translate(${l.x.toFixed(1)} ${l.y.toFixed(1)})`"
          @mouseenter="over(l)" @mouseleave="off" @click="emit('open', l.s)">
          <circle class="hit" r="13"/>
          <g class="sway" :style="{ '--amp': l.amp + 'deg', animationDuration: l.dur + 's', animationDelay: l.dl + 's' }">
            <image :href="l.icon" :x="-l.size / 2" :y="-l.size / 2" :width="l.size" :height="l.size"
              :transform="`rotate(${l.rot})`"/>
          </g>
          <image v-for="d in l.drops" :key="d.k" class="drop" :href="d.icon"
            :x="d.dx - d.size / 2" :y="d.dy - d.size / 2" :width="d.size" :height="d.size"
            :transform="`rotate(${d.rot} ${d.dx} ${d.dy})`"
            :style="{ animationDuration: d.dur + 's', '--amp': d.amp + 'deg' }"/>
        </g>
      </g>

      <g v-for="t in tails" :key="'l' + t.k" class="tail-tip">
        <image v-for="v in t.vine" :key="v.k" :href="t.icon" :x="v.x - v.s / 2" :y="v.y - v.s / 2"
          :width="v.s" :height="v.s" :transform="`rotate(${v.rot} ${v.x} ${v.y})`" opacity=".58"/>
        <image :href="t.icon" :x="t.x - t.s / 2" :y="t.y - t.s / 2" :width="t.s" :height="t.s"/>
      </g>
    </svg>

    <Transition name="hang">
      <div v-if="hot" class="sign" :style="{ left: hot.x / 2.4 + '%', top: hot.y / 2.4 + '%' }">
        <i class="cord"/>
        <b class="board" :class="'p-' + pen.zh">{{ peek ? (hot.s.peek || hot.s.title) : hot.s.title }}</b>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.soul { position: relative; width: 100%; height: 100%; }
.tree { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
.ink { filter: url(#boil-soft); animation: breatheHard 12s ease-in-out infinite; }
.ink path { stroke: var(--graphite); stroke-linecap: round; animation: strokeIn 1s ease-out backwards; }
.root { stroke-width: 1.6; opacity: .5; }
.trunk { stroke-width: 3.2; }
.bough { stroke-width: 1.7; }
.twig { stroke-width: 1.05; opacity: .62; }
.tendril { stroke-width: 1.15; opacity: .6; stroke: var(--grass-deep); }
.crown { opacity: .8; }

/* 碎叶只是陪衬，压得很淡，不跟谁抢 */
.spray image { opacity: .52; transform-box: fill-box; transform-origin: center;
  animation: leafSway 6.5s ease-in-out infinite alternate; }

.mark { pointer-events: all; cursor: pointer; }
.hit { fill: transparent; }
.sway { transform-box: fill-box; transform-origin: center; animation-name: leafSway; animation-timing-function: ease-in-out;
  animation-iteration-count: infinite; animation-direction: alternate; }
.mark image { opacity: .92; transition: opacity .35s; }
.mark.hot .sway { animation: none; transform: scale(1.38); }
.mark.hot image { opacity: 1; }
/* 一滴一片的小叶子：安静地围在那一块地旁边，不抢主叶 */
.mark .drop { opacity: .68; transform-box: fill-box; transform-origin: center;
  animation: leafSway 5.8s ease-in-out infinite alternate; pointer-events: none; }
.tail-tip image { opacity: .7; }

/* 手绘木牌：一根细线从枝头垂下来，木色底上手写一句题 */
.sign { position: absolute; z-index: 20; transform: translateX(-50%); pointer-events: none; text-align: center; }
.hang-enter-active, .hang-leave-active { transition: opacity .3s; }
.hang-enter-from, .hang-leave-to { opacity: 0; }
.cord { display: block; width: 1px; height: 15px; margin: 0 auto; background: rgba(90, 83, 64, .55); }
.board { position: relative; display: inline-block; max-width: 200px; padding: 4px 13px 6px; font-weight: inherit;
  font-family: var(--pen-fam); letter-spacing: var(--pen-sp);
  color: #FBF7EE; background: #8B6B4A; transform: rotate(-1.6deg);
  border-radius: 4px 10px 5px 9px / 9px 4px 10px 5px;
  box-shadow: inset 0 0 0 1.2px rgba(255, 253, 244, .2), inset 0 -3px 7px rgba(63, 48, 32, .3);
  font-size: 13.5px; line-height: 1.5; text-align: left; }
.board::before { content: ''; position: absolute; inset: 0; border-radius: inherit; opacity: .3;
  background: repeating-linear-gradient(92deg, rgba(63, 48, 32, .35) 0 1px, transparent 1px 7px); }

@keyframes leafSway { from { transform: rotate(calc(var(--amp) * -1)); } to { transform: rotate(var(--amp)); } }
@keyframes breatheHard { 0%, 100% { opacity: .82; } 50% { opacity: 1; } }
</style>
