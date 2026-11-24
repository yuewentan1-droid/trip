<script setup>
import { computed, ref } from 'vue';
import { iconUri } from '../icons';
import { TREE_CAP } from '../utils/grove';
import PlotSign from './PlotSign.vue';

// 一棵树从一万个种子里长出来：六根主枝从树干上错开抽出去，每根主枝再分五根侧枝，
// 侧枝上各挑两根嫩梢，一共六十个落点。地里有几块，树上就醒几处；先有地，后有枝，
// 没有数据的新树只剩主干和根，鳞片一样一层层往外长。
const props = defineProps({
  sessions: { type: Array, default: () => [] },
  peek: Boolean,
  seed: { type: [Number, String], default: 1 },
  variant: { type: Number, default: 0 },
  cap: { type: Number, default: TREE_CAP },
  fresh: { type: Number, default: 0 }
});
const emit = defineEmits(['open']);

const hash = s => [...String(s)].reduce((h, c) => (h * 31 + c.codePointAt(0)) >>> 0, 11);
const seg = (h, s, n) => (h >>> s) % n;
// 一片小水珠：上尖下圆，挂在叶底，不抢叶子的颜色
const dewPath = s => `M0 ${(-s * .55).toFixed(2)} C ${(s * .42).toFixed(2)} ${(-s * .18).toFixed(2)}, `
  + `${(s * .46).toFixed(2)} ${(s * .28).toFixed(2)}, 0 ${(s * .5).toFixed(2)} C `
  + `${(-s * .46).toFixed(2)} ${(s * .28).toFixed(2)}, ${(-s * .42).toFixed(2)} ${(-s * .18).toFixed(2)}, 0 ${(-s * .55).toFixed(2)} Z`;

const X = 150, GROUND = 400, ROOT_NECK = 368, POOL = 10000, FORK = 258;
const LIMBS = 6, SIDE_BOUGHS = 5, TWIG_PAIRS = 2;
const SLOT_ORDER = [0, 2, 4, 6, 8, 1, 3, 5, 7, 9];
// 五棵树不是五份复制：老槐圆冠、白桦瘦高、垂柳左右挂枝、双干树从腰里分开、松树一层一层
const FORMS = [
  { crown: 'sprout', top: 72, lean: 0, bend: 6.5, trunk: [15, 11, 6.5],
    ys: [120, 158, 196, 234, 272, 310], sides: [1, -1, 1, 1, -1, -1],
    start: .78, rise: .24, end: .10, endVar: .16, jitter: .18, sway: .18,
    len: [62, 42, 24], thick: [4.2, 1.9, .8], vine: [96, 190] },
  { crown: 'leaf', top: 52, lean: 7, bend: 1.6, trunk: [12, 9, 5.2],
    ys: [82, 118, 154, 190, 226, 262], sides: [1, -1, 1, -1, 1, -1], asym: false,
    start: 1.06, rise: .14, end: .58, endVar: .16, jitter: .08, sway: .07,
    len: [42, 15, 12], thick: [3.4, 1.1, .5], vine: [76, 190] },
  { crown: 'leaf', top: 64, lean: 2, bend: 2.8, trunk: [13, 9.4, 5.4],
    ys: [116, 154, 192, 230, 268, 306], sides: [1, -1, 1, -1, 1, -1], asym: false,
    start: .62, rise: .18, end: -.42, endVar: .18, jitter: .12, sway: .10, weep: true,
    len: [60, 24, 18], thick: [4, 1.5, .7], vine: [96, 190] },
  { crown: 'flower', top: 92, lean: 0, bend: 2.4, trunk: [15, 10, 6],
    start: .76, rise: .20, end: .28, endVar: .20, jitter: .14, sway: .12,
    len: [50, 20, 16], thick: [3.8, 1.4, .6], vine: [268, 0] },
  { crown: 'pine', top: 78, lean: -3, bend: 2.1, trunk: [14, 10, 6],
    ys: [118, 118, 190, 190, 262, 262], sides: [1, -1, 1, -1, 1, -1], asym: false,
    start: .34, rise: .16, end: -.02, endVar: .08, jitter: .07, sway: .05,
    len: [48, 68, 18], thick: [4.4, 1.8, .7], vine: [96, 190] }
];
// 树上不只有花：芽、叶、果子、过路的蝶鸟，都从这块地里长出来
const TREE_GROW = ['leaf', 'sprout', 'maple-leaf', 'pine', 'plant'];
const TREE_BLOOM = ['blossom', 'daisy', 'sakura', 'flower', 'tulip', 'rose', 'dandelion',
  'sunflower', 'flower', 'corn', 'pumpkin', 'potted-plant', 'butterfly', 'bird'];
const LEAF_KINDS = ['leaf', 'sprout', 'maple-leaf', 'pine'];
const TREE_INK = {
  leaf: '#4F6B3A', sprout: '#7E9A5F', 'maple-leaf': '#B07A55', pine: '#4F6B3A',
  'falling-leaves': '#C9A24B', blossom: '#C09384', daisy: '#C9A24B', sakura: '#C09384',
  'cherry-blossom': '#C09384', tulip: '#B07A55', rose: '#B07A55', sunflower: '#C9A24B',
  dandelion: '#C9A24B', 'dandelion-seed': '#B9A27A',
  flower: '#8C7C94', corn: '#C9A24B', pumpkin: '#B07A55', butterfly: '#8C7C94',
  bird: '#7E9FAE', fly: '#8B6B4A', plant: '#7E9A5F', 'potted-plant': '#8B6B4A'
};
const treeInk = g => TREE_INK[g] || '#4F6B3A';
// 树梢那撮芽也按户换：同一副骨架上，有的顶叶，有的顶花
const CROWNS = {
  sprout: ['sprout', 'leaf'],
  leaf: ['leaf', 'sprout'],
  flower: ['flower', 'blossom', 'tulip'],
  pine: ['pine', 'sprout']
};

// 一万个数，一次抽完。用户的种子决定整棵树，刷新、串门看见的都是同一棵
const pool = computed(() => {
  let s = Math.abs(Number(props.seed)) % 2147483646 || 17;
  return Array.from({ length: POOL }, () => (s = s * 16807 % 2147483647) / 2147483647);
});
const rand = (i, salt = 0) => pool.value[(i * 131 + salt * 977 + 409) % POOL];

// 像二维码那样，先从种子里排出一张 36 格的点阵；格子的黑白就是这棵树的暗号
const CODE = 36;
const code = computed(() => {
  let n = (Number(props.seed) ^ 0x9E3779B9) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x85EBCA6B) >>> 0;
  n = Math.imul(n ^ (n >>> 13), 0xC2B2AE35) >>> 0;
  n = (n ^ (n >>> 16)) >>> 0;
  return Array.from({ length: CODE }, () => {
    n ^= n << 13; n >>>= 0;
    n ^= n >>> 17;
    n ^= n << 5; n >>>= 0;
    return n & 1;
  });
});
const bit = i => code.value[i % CODE];
const lv = i => bit(i) + bit(i + 7) * 2 + bit(i + 13) * 4 + bit(i + 19) * 8;

const cubic = (a, b, c, d, t) => {
  const u = 1 - t;
  return {
    x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
    y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y
  };
};
const slope = (a, b, c, d, t) => {
  const u = 1 - t;
  return Math.atan2(
    3 * u * u * (b.y - a.y) + 6 * u * t * (c.y - b.y) + 3 * t * t * (d.y - c.y),
    3 * u * u * (b.x - a.x) + 6 * u * t * (c.x - b.x) + 3 * t * t * (d.x - c.x)
  );
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// 五款骨架只是骨架；点阵再把偏、弯、疏、密拧一遍，所以没有两户长成同一棵
const form = computed(() => {
  const f = FORMS[props.variant];
  const mix = (i, a, b) => a + lv(i) / 15 * (b - a);
  const flip = bit(0) ? -1 : 1;
  return {
    ...f,
    top: clamp(f.top + (lv(1) / 15 - .5) * 22, 48, 98),
    lean: f.lean + flip * mix(2, 1.5, 9),
    bend: mix(3, 1.3, 6.8),
    trunk: [mix(4, 10.5, 15.5), mix(5, 7.2, 10.8), mix(6, 4.2, 6.8)],
    ys: f.ys?.map(y => Math.min(338, f.top + (y - f.top) * mix(7, .9, 1.12))),
    sides: (f.sides || [1, -1, 1, -1, 1, -1]).map((s, k) => bit(8 + k) ? -s : s),
    start: mix(14, .32, 1.16),
    rise: mix(15, .09, .27),
    end: mix(16, -.34, .52),
    endVar: mix(17, .06, .2),
    jitter: mix(18, .06, .18),
    sway: mix(19, .04, .17),
    len: f.len.map((v, k) => v * mix(20 + k, .84, 1.16)),
    thick: f.thick.map((v, k) => v * mix(23 + k, .88, 1.14)),
    crown: CROWNS[f.crown][lv(26) % CROWNS[f.crown].length]
  };
});
// 树身先从根到梢慢慢偏出去，再叠一点手绘的起伏；五棵树各偏各的
const trunkX = y => {
  const f = form.value;
  const t = (GROUND - y) / (GROUND - f.top);
  return X + (f.lean || 0) * t + Math.sin((y - 78) / 53) * f.bend
    + Math.sin((y - 78) / 19) * f.bend * .22;
};
const baseX = computed(() => trunkX(GROUND));
// 刚种下的树苗先不长根，等这块地攒下几片叶子，根才从土里慢慢露出来
const rootReady = computed(() => props.sessions.length >= 3);

// 折线过成圆滑的曲线：相邻两点各给三分之一的切向，枝才会转弯，不是折尺
function curveOf(pts) {
  return pts.slice(0, -1).map((a, i) => {
    const p = pts[i - 1] || a, d = pts[i + 2] || pts[i + 1];
    const b = { x: a.x + (pts[i + 1].x - p.x) / 6, y: a.y + (pts[i + 1].y - p.y) / 6 };
    const c = { x: pts[i + 1].x - (d.x - a.x) / 6, y: pts[i + 1].y - (d.y - a.y) / 6 };
    return { a, b, c, d: pts[i + 1] };
  });
}
const dOf = (segs, from = 0, to = segs.length) => segs.slice(from, to).map((s, i) =>
  (i ? 'C' : 'M' + s.a.x.toFixed(1) + ' ' + s.a.y.toFixed(1) + ' C')
  + `${s.b.x.toFixed(1)} ${s.b.y.toFixed(1)}, ${s.c.x.toFixed(1)} ${s.c.y.toFixed(1)}, `
  + `${s.d.x.toFixed(1)} ${s.d.y.toFixed(1)}`).join(' ');
function pointAt(segs, t) {
  const u = clamp(t, 0, .9999) * segs.length;
  const i = Math.floor(u), s = segs[i];
  return cubic(s.a, s.b, s.c, s.d, u - i);
}
function angAt(segs, t) {
  const u = clamp(t, 0, .9999) * segs.length;
  const i = Math.floor(u), s = segs[i];
  return slope(s.a, s.b, s.c, s.d, u - i);
}
// 一枝往外抽：每一节都换一点方向，梢头慢慢挑起来，但不会拐回树心里去
function shoot(base, ang, len, parts, r, lift, side) {
  const pts = [base];
  let a = ang;
  for (let k = 0; k < parts; k++) {
    a += (r(20 + k) - .5) * .34 + lift;
    if (side > 0) a = clamp(a, -1.52, .24);
    else {
      const left = norm(a) < 0 ? norm(a) + Math.PI * 2 : norm(a);
      a = Math.PI + clamp(left - Math.PI, -.24, 1.52);
    }
    const step = len / parts * (.78 + r(30 + k) * .44);
    pts.push({
      x: clamp(pts[k].x + Math.cos(a) * step, 18, 282),
      y: clamp(pts[k].y + Math.sin(a) * step, 28, 390)
    });
  }
  return { segs: curveOf(pts), tip: pts[pts.length - 1], ang: a };
}
// 主枝不是从树心射出去的辐条：起手向上，一路缓缓放平，中段再轻轻起伏，
// 每一小步只转一点点，弯就留在整根枝上，不会有折尺那样的硬拐
function limb(base, side, len, top, r, f) {
  const steps = 9;
  const start = f.start + top * f.rise + (r(1) - .5) * f.jitter;
  const end = f.end + r(2) * f.endVar + (r(3) - .5) * .12;
  const sway = (r(4) - .5) * f.sway;
  const phase = r(5) * Math.PI;
  const pts = [base];
  let x = base.x, y = base.y;
  for (let k = 1; k <= steps; k++) {
    const t = k / steps;
    const dir = end + (start - end) * Math.pow(1 - t, 1.35)
      + Math.sin(t * Math.PI + phase) * sway;
    const step = len / steps * (.9 + r(10 + k) * .2);
    x = clamp(x + side * Math.cos(dir) * step + (f.drift || 0) * step, 20, 280);
    y = clamp(y - Math.sin(dir) * step, 30, 392);
    pts.push({ x, y });
  }
  return { pts, segs: curveOf(pts), tip: pts[steps] };
}
// 双干树：主干到腰里分成左右两根，后面的枝一半归左干，一半归右干
const leaders = computed(() => {
  if (props.variant !== 3) return [];
  const b = { x: trunkX(FORK), y: FORK };
  return [
    [b, { x: b.x - 8, y: 214 }, { x: b.x - 22, y: 166 }, { x: b.x - 36, y: 104 }],
    [b, { x: b.x + 9, y: 210 }, { x: b.x + 25, y: 158 }, { x: b.x + 40, y: 96 }]
  ].map(pts => ({ pts, segs: curveOf(pts), tip: pts[pts.length - 1] }));
});
const norm = a => Math.atan2(Math.sin(a), Math.cos(a));
// 侧枝和嫩梢都不许耷拉：原本朝下的，顺手挑回斜上方
const upward = a => {
  const n = norm(a);
  if (Math.sin(n) <= -.06) return n;
  return Math.cos(n) >= 0
    ? Math.atan2(-.12, Math.abs(Math.cos(n)))
    : Math.PI + Math.atan2(.12, Math.abs(Math.cos(n)));
};

// 六根主枝：下面的厚、上面的薄，左右错开，长度不齐
const limbs = computed(() => {
  const f = form.value;
  const asym = f.asym === false || props.variant === 3 ? 1 : (rand(700, 3) < .5 ? 1 : -1);
  return Array.from({ length: LIMBS }, (_, i) => {
    const r = k => rand(1100 + i * 67, k);
    const top = props.variant === 3 ? [.9, .64, .38][i % 3] : 1 - i * .19;
    let base, side;
    if (props.variant === 3) {
      const g = i < 3 ? 0 : 1, k = i % 3;
      const p = pointAt(leaders.value[g].segs, [.26, .5, .76][k]);
      side = g ? 1 : -1;
      base = { x: p.x + side * 2, y: p.y };
    } else {
      side = f.sides[i] * asym;
      const y0 = f.ys[i] + (r(1) - .5) * (props.variant === 4 ? 4 : 14);
      base = { x: trunkX(y0) + side * (2 + r(2) * 3), y: y0 };
    }
    const len = f.len[0] + (1 - top) * f.len[1] + r(4) * f.len[2];
    const main = limb(base, side, len, top, r, f);
    const w = f.thick[0] + (1 - top) * f.thick[1] + r(5) * f.thick[2];
    const pieces = [
      { k: 0, d: dOf(main.segs, 0, 3), w },
      { k: 1, d: dOf(main.segs, 3, 7), w: w * .68 },
      { k: 2, d: dOf(main.segs, 7), w: w * .36 }
    ];
    const secs = [];

    for (let j = 0; j < SIDE_BOUGHS; j++) {
      const q = k => rand(2300 + i * 83 + j * 17, k);
      const t = .18 + j * .17 + (q(1) - .5) * .08;
      const base = pointAt(main.segs, t);
      const tan = angAt(main.segs, t);
      // 一根朝上、一根放平，长短也参差，交替着从主枝上抽出去，才不是一把梳子
      const turn = j % 2 ? side * (.04 + q(2) * .28) : -side * (.30 + q(2) * .52);
      const a = f.weep ? tan + turn : upward(tan + turn);
      const slen = len * (.24 + q(3) * .38);
      const sw = w * (.30 + q(4) * .12);
      const lift = -side * (.05 + q(5) * .03);
      const sec = shoot(base, a, slen, 3, q, lift, side);
      const twigs = [];

      for (let k = 0; k < TWIG_PAIRS; k++) {
        const p = z => rand(3900 + i * 113 + j * 29 + k * 7, z);
        const tt = [.58, .86][k] + (p(1) - .5) * .08;
        const tb = pointAt(sec.segs, tt);
        const ta = angAt(sec.segs, tt);
        const bend = ta + (k ? -1 : 1) * (.36 + p(2) * .50);
        const wa = f.weep ? bend : upward(bend);
        const wside = Math.cos(wa) >= 0 ? 1 : -1;
        const twig = shoot(tb, wa, slen * (.22 + p(3) * .42), 2, p, lift * .6, wside);
        // 花不一定都挤在梢头，沿嫩枝里外错开，枝才不显得光秃
        const at = [.56, .92][k] + (p(6) - .5) * .12;
        const spot = pointAt(twig.segs, at);
        twigs.push({
          k, base: tb, tip: twig.tip, segs: twig.segs, w: sw * (.42 + p(4) * .18),
          x: spot.x, y: spot.y,
          rot: angAt(twig.segs, at) * 180 / Math.PI + (p(5) - .5) * 22
        });
      }
      secs.push({ j, base, segs: sec.segs, tip: sec.tip, w: sw, twigs });
    }

    const flat = secs.flatMap(sec => sec.twigs.map(tw => ({
      ...tw, sec: sec.j
    })));
    const slots = SLOT_ORDER.map(n => flat[n]);
    return { i, main, w, pieces, secs, slots, tip: main.tip };
  });
});

const list = computed(() => props.sessions
  .filter(s => s.placement === 'tree' || !s.placement)
  .slice(0, props.cap)
  .sort((a, b) => a.id - b.id));
// 六根枝轮着落，一根枝上再按里外轮着落；后长的地只占新梢，早先的叶不挪窝
const placed = computed(() => list.value.map((s, i) => {
  const limb = limbs.value[i % LIMBS];
  return { s, limb, slot: limb.slots[Math.floor(i / LIMBS)] };
}));

const canopy = computed(() => {
  const n = list.value.length;
  const density = 1 - Math.min(.16, n / 300);
  const roomy = props.cap < TREE_CAP ? 1.22 : 1;
  const gap = props.cap < TREE_CAP ? 20 : 17;
  const by = new Map();
  placed.value.forEach(p => {
    if (!by.has(p.limb.i)) by.set(p.limb.i, []);
    by.get(p.limb.i).push(p);
  });
  return limbs.value.filter(l => by.has(l.i)).map(l => {
    const items = by.get(l.i);
    const usedSec = new Set(items.map(p => p.slot.sec));
    const usedTwigs = new Set(items.map(p => p.slot.sec + ':' + p.slot.k));
    const secs = l.secs.filter(s => usedSec.has(s.j)).map(s => ({
      k: s.j,
      dBase: dOf(s.segs, 0, 1), dTip: dOf(s.segs, 1),
      w: s.w, wt: s.w * .46,
      twigs: s.twigs.filter(t => usedTwigs.has(s.j + ':' + t.k)).map(t => ({
        k: t.k, d: dOf(t.segs), w: t.w, base: t.base, tip: t.tip
      }))
    }));
    const leaves = items.map(({ s, slot }, i) => {
      const h = hash(props.seed + ':' + s.id + ':' + s.title);
      const sealed = s.status === 'finished';
      const bloom = sealed
        ? TREE_BLOOM[seg(h, 6, TREE_BLOOM.length)]
        : TREE_GROW[seg(h, 9, TREE_GROW.length)];
      const size = (18 + seg(h, 3, 10)) * density * roomy;
      // 叶下一串水滴：挖得越深，挂得越多；封了的地最少也留一滴
      const dropN = sealed ? Math.min(4, Math.max(1, s.level || 1))
        : Math.min(2, s.thought_count || 0);
      const drops = Array.from({ length: dropN }, (_, d) => {
        const hh = hash(s.id + ':d' + d);
        return {
          k: d,
          dx: (d % 2 ? 1 : -1) * (2 + seg(hh, 7, 4)) * (d ? 1 : 0),
          dy: size * .36 + 4 + d * (6.5 + seg(hh, 3, 2)),
          size: (4.4 + seg(hh, 15, 3.6)) - d * .45, rot: seg(hh, 19, 30) - 15
        };
      });
      // 每片叶下再垂一根细藤，粗细、弯法、长短都不同，像从枝上自己爬下来的
      const stem = 9 + seg(h, 31, 11) + (s.level || 1) * 1.4;
      const side = seg(h, 33, 2) ? 1 : -1;
      const sway = 3 + seg(h, 35, 6);
      const y0 = size * .3;
      const A = { x: 0, y: y0 };
      const B = { x: side * sway, y: y0 + stem * .32 };
      const C = { x: -side * sway * .7, y: y0 + stem * .74 };
      const D = { x: side * 2.6, y: y0 + stem };
      const g = LEAF_KINDS[seg(h, 37, LEAF_KINDS.length)];
      const vine = {
        d: `M${A.x.toFixed(1)} ${A.y.toFixed(1)} C ${B.x.toFixed(1)} ${B.y.toFixed(1)}, ${C.x.toFixed(1)} ${C.y.toFixed(1)}, ${D.x.toFixed(1)} ${D.y.toFixed(1)}`,
        w: (.6 + seg(h, 39, 100) / 100 * 1.6).toFixed(2),
        o: (.34 + seg(h, 41, 100) / 100 * .34).toFixed(2),
        leaves: Array.from({ length: 1 + seg(h, 43, 2) }, (_, k) => {
          const t = k ? .78 : .5;
          const p = cubic(A, B, C, D, t);
          const hh = hash(h + ':lv' + k);
          return {
            k, x: p.x + (k ? 1 : -1) * (3 + seg(hh, 3, 2)), y: p.y,
            s: 5 + seg(hh, 7, 3), rot: seg(hh, 11, 70) - 35,
            icon: iconUri(g, treeInk(g))
          };
        })
      };
      return {
        s, drops, vine,
        x: slot.x, y: slot.y,
        rot: slot.rot + seg(h, 7, 20) - 10,
        size,
        icon: iconUri(bloom, treeInk(bloom)),
        amp: 1.6 + seg(h, 17, 100) / 100 * 2.4,
        dur: 4.2 + seg(h, 22, 100) / 100 * 3.2,
        dl: -(seg(h, 27, 100) / 100 * 7).toFixed(2),
        grow: (.45 + i * .055 + seg(h, 5, 50) / 100).toFixed(2),
        hit: 11 + (18 + seg(h, 3, 10)) * density * roomy * .5
      };
    });
    // 同一根枝上的花别挤成一团：轻轻推开，留出呼吸的地方
    for (let pass = 0; pass < 3; pass++) {
      for (let a = 0; a < leaves.length; a++) {
        for (let b = a + 1; b < leaves.length; b++) {
          let dx = leaves[b].x - leaves[a].x, dy = leaves[b].y - leaves[a].y;
          let d = Math.hypot(dx, dy);
          if (d >= gap) continue;
          if (d < .01) {
            const t = (a * 7 + b * 13) % 628 / 100;
            dx = Math.cos(t); dy = Math.sin(t); d = 1;
          }
          const push = (gap - d) / 2;
          leaves[a].x -= dx / d * push;
          leaves[a].y -= dy / d * push;
          leaves[b].x += dx / d * push;
          leaves[b].y += dy / d * push;
        }
      }
    }
    return {
      k: l.i, w: l.w, tip: l.tip, leaves, secs, main: l.pieces,
      delay: (.2 + l.i * .08).toFixed(2)
    };
  });
});

// 一条青藤从土里出发，绕着树干往上爬；树越有年头，藤越多
// 每根的粗细、深浅和绕法都不一样，像各自从土里找的路
const trunkVines = computed(() => {
  if (!list.value.length) return [];
  const f = form.value;
  const n = Math.min(4, 1 + Math.floor(list.value.length / 14));
  return Array.from({ length: n }, (_, v) => {
    const phase = rand(900 + v, 3) * Math.PI * 2;
    const to = f.vine[0] + rand(903 + v, 4) * f.vine[1];
    const wide = 5.5 + rand(906 + v, 5) * 4.5;
    const wob = 1.4 + rand(907 + v, 5) * 2.2;
    const pts = [];
    for (let y = 396; y >= to; y -= 18) {
      pts.push([
        trunkX(y) + Math.sin(y / (15 + v * 2.4) + phase) * wide
          + Math.sin(y / 6.8 + phase * 1.7) * wob,
        y
      ]);
    }
    return {
      k: 'v' + v,
      d: pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' '),
      w: (.8 + rand(908 + v, 5) * 1.2).toFixed(2),
      o: (.4 + rand(909 + v, 5) * .28).toFixed(2),
      dl: (.8 + v * .3).toFixed(2)
    };
  });
});

// 哪根枝上挖得深，枝梢就垂一条长藤；一路还挂着碎叶
const tails = computed(() => canopy.value
  .filter((b, i) => props.variant === 2 || i % 3 === 0)
  .map(b => {
    const lv = Math.max(...b.leaves.map(l => l.s.level || 1));
    if (lv < 2) return null;
    const h = hash('tail' + b.k);
    const room = 432 - b.tip.y;
    if (room < 12) return null;
    const reach = props.variant === 2 ? 36 + lv * 30 : 22 + lv * 22;
    const len = Math.min(room, reach * (.8 + seg(h, 4, 20) / 100));
    const x0 = b.tip.x, y0 = b.tip.y, side = b.tip.x >= X ? 1 : -1;
    const A = { x: x0, y: y0 };
    const B = { x: x0 + side * 7, y: y0 + len * .34 };
    const C = { x: x0 - side * 3, y: y0 + len * .72 };
    const D = { x: x0 + side * 3, y: y0 + len };
    const g = LEAF_KINDS[seg(h, 8, LEAF_KINDS.length)];
    const icon = iconUri(g, treeInk(g));
    return {
      k: 't' + b.k, lv, icon,
      d: `M${x0.toFixed(1)} ${y0.toFixed(1)} C ${B.x.toFixed(1)} ${B.y.toFixed(1)}, ${C.x.toFixed(1)} ${C.y.toFixed(1)}, ${D.x.toFixed(1)} ${D.y.toFixed(1)}`,
      x: D.x, y: D.y, s: 11 + seg(h, 12, 6),
      vine: [.22, .42, .62, .8].map((t, i) => {
        const p = cubic(A, B, C, D, t);
        const hh = hash(h + ':' + i);
        return {
          k: t, x: p.x + (i % 2 ? 1 : -1) * (4 + seg(hh, 3, 4)), y: p.y,
          s: 8 + seg(hh, 7, 4), rot: seg(hh, 11, 80) - 40
        };
      })
    };
  })
  .filter(Boolean));

// 树干从根颈到梢头一路收细：下段厚，上段薄，像真树一样承着六根枝
const trunkPaths = computed(() => {
  const f = form.value;
  if (props.variant === 3) {
    const pts = [];
    for (let y = ROOT_NECK; y > FORK; y -= 14) pts.push({ x: trunkX(y), y });
    // 主干收到岔口正中间，两根主干从同一点分出去，肩窝才接得严
    pts.push({ x: trunkX(FORK), y: FORK });
    const [L, R] = leaders.value;
    return [
      { k: 'base', d: dOf(curveOf(pts)), w: f.trunk[0], o: 1, dl: .15 },
      { k: 'll', d: dOf(L.segs, 0, 1), w: f.trunk[1], o: 1, dl: .2 },
      { k: 'lt', d: dOf(L.segs, 1), w: f.trunk[2], o: .96, dl: .25 },
      { k: 'rl', d: dOf(R.segs, 0, 1), w: f.trunk[1], o: 1, dl: .22 },
      { k: 'rt', d: dOf(R.segs, 1), w: f.trunk[2], o: .96, dl: .27 }
    ];
  }
  const pts = [];
  for (let y = ROOT_NECK; y >= f.top; y -= 16) pts.push({ x: trunkX(y), y });
  const segs = curveOf(pts);
  return [
    { k: 'base', d: dOf(segs, 0, 6), w: f.trunk[0], o: 1, dl: .15 },
    { k: 'mid', d: dOf(segs, 6, 13), w: f.trunk[1], o: 1, dl: .2 },
    { k: 'tip', d: dOf(segs, 13), w: f.trunk[2], o: .92, dl: .25 }
  ];
});
// 头顶那撮新芽也跟着树形走；双干树两边各冒一撮
const crowns = computed(() => {
  const f = form.value;
  if (props.variant === 3) {
    return leaders.value.map((l, i) => ({ k: i, x: l.tip.x, y: l.tip.y - 24, icon: f.crown }));
  }
  return [{ k: 0, x: trunkX(f.top), y: f.top - 28, icon: f.crown }];
});

// 树根不是一圈围脖：树脚先鼓出一小块根颈，再从底下分出几股主根，贴着地皮往外走，
// 半路上各分一次叉，梢头再散成细根。五棵树的根形各不一样：老槐铺得开，白桦根细，
// 垂柳一路往下探，双干树两边各走各的，松树根短而深。
const LIGHT_TONES = ['#E7B759', '#D98263', '#93B27A', '#7FA7BB', '#C79AAF', '#E3CE8D'];
const ROOT_FORMS = [
  { n: 3, len: 46, w: 6.4, spread: 3 },
  { n: 3, len: 33, w: 4.8, spread: 2.5 },
  { n: 2, len: 56, w: 6.8, spread: 3.6, deep: true },
  { n: 3, len: 42, w: 5.8, spread: 4.4, split: true },
  { n: 3, len: 30, w: 6.6, spread: 2.3, deep: true }
];
function smoothRoot(pts, close = false) {
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)},`
      + `${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)},`
      + `${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return close ? d + ' Z' : d;
}
// 主根从树脚边往外扑，前半段还在地皮上，后半段已经扎进土里；
// 一路拧着弯，粗的一截接到细的一截，半路再分两个小叉，梢头都朝土里去
function rootRun(out, x, y, side, reach, w, seed, deep) {
  const r = k => rand(seed, k);
  const pts = [[x, y]];
  for (let k = 1; k <= 5; k++) {
    const t = k / 5;
    const swing = Math.sin(t * 4.6 + r(30) * 3.4) * reach * .13;
    const px = x + side * (reach * t * (.84 + r(k) * .3) + swing);
    const foot = GROUND + (deep ? 16 : 12);
    const py = Math.min(foot, y + (foot - y) * Math.pow(t, deep ? 1.02 : 1.28)
      + Math.sin(t * 5.4 + r(40) * 3) * 2.6);
    pts.push([px, py]);
  }
  // 夜里根上也缠一串灯：沿着主根露在地皮上的那一段，隔几步挂一颗
  const lights = [.28, .55, .84].map((t, j) => {
    const f = t * 5, i = Math.min(4, Math.floor(f)), u = f - i;
    const px = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u;
    const py = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u;
    const h = hash('rl' + seed + ':' + j);
    return {
      k: j,
      x: +(px + side * .8).toFixed(1),
      y: +(py - 1.2).toFixed(1),
      c: LIGHT_TONES[h % LIGHT_TONES.length],
      s: 1.1 + seg(h, 5, 6) / 10,
      dur: (2.4 + seg(h, 9, 100) / 26).toFixed(2),
      dl: (-(seg(h, 13, 100) / 10)).toFixed(1)
    };
  });
  out.push({ d: smoothRoot(pts.slice(0, 3)), wire: smoothRoot(pts), w: w.toFixed(2), o: '.94', lights });
  out.push({ d: smoothRoot(pts.slice(2, 5)), w: (w * (.52 + r(60) * .14)).toFixed(2), o: '.9', lights: [] });
  out.push({ d: smoothRoot(pts.slice(4)), w: (w * (.22 + r(61) * .12)).toFixed(2), o: '.86', lights: [] });
  const base = pts[2 + (seed % 2)];
  for (const dir of [-1, 1]) {
    const ex = base[0] + side * reach * (.2 + r(20 + dir) * .2) + dir * 3;
    const ey = Math.min(GROUND + (deep ? 18 : 14), base[1] + 2 + (dir > 0 ? 4 + r(30 + dir) * 3 : 0));
    out.push({
      d: smoothRoot([base, [base[0] + side * 4, base[1] + (dir > 0 ? 1.6 : -1)], [ex, ey]]),
      w: (w * (.24 + r(70 + dir) * .16)).toFixed(2), o: '.8', lights: []
    });
  }
}
const rootFan = computed(() => {
  const base = ROOT_FORMS[props.variant];
  // 根也认这户的暗号：铺得开一点、扎得深一点、多一股少一股，都不重样
  const f = {
    ...base,
    len: base.len * (.84 + lv(27) / 15 * .32),
    w: base.w * (.86 + lv(28) / 15 * .28),
    n: base.n + (bit(29) ? 1 : 0)
  };
  const x0 = baseX.value, v = props.variant * 311;
  const out = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < f.n; i++) {
      const seed = 9200 + v + i * 71 + (side > 0 ? 500 : 0);
      // 主根从树脚正中抽出去，先贴着木杆，再各自散开；树脚下才不空出一块
      const x = x0 + side * (1 + i * 1.2 + rand(seed, 1) * 2);
      const y = ROOT_NECK - 12 + i * 3 + rand(seed, 2) * 4;
      const reach = f.len * (.72 + rand(seed, 4) * .68);
      const w = Math.max(1.6, f.w * (.5 + rand(seed, 5) * .95) - i * .45);
      rootRun(out, x, y, side, reach, w, seed + 11, f.deep);
    }
  }
  // 两条地表根从树脚两边各绕一次，和主根拧在一起；根盘才不散，也不会中间直直扎一根
  for (const dir of [-1, 1]) {
    const seed = 9700 + v + (dir > 0 ? 137 : 0);
    const sx = x0 - dir * (4 + rand(seed, 1) * 5);
    const sy = GROUND - 27 - rand(seed, 2) * 10;
    const cross = [
      [sx, sy],
      [x0 + dir * 5, GROUND - 7 - rand(seed, 3) * 3],
      [x0 + dir * (17 + rand(seed, 4) * 9), GROUND + 3 + rand(seed, 5) * 5],
      [x0 + dir * (f.len * .82 + rand(seed, 6) * 10), GROUND + 2 + rand(seed, 7) * 7],
      [x0 + dir * (f.len * 1.12 + 5), GROUND + 7 + rand(seed, 8) * 8]
    ];
    out.push({ d: smoothRoot(cross.slice(0, 3)), w: (f.w * (.5 + rand(seed, 9) * .24)).toFixed(2), o: '.9', lights: [] });
    out.push({ d: smoothRoot(cross.slice(2)), w: (f.w * (.24 + rand(seed, 10) * .14)).toFixed(2), o: '.84', lights: [] });
  }
  return out;
});

// 夜里树上缠的彩灯：主线顺着每根主枝走，灯泡在枝两旁错开挂着，
// 颜色和稻草人、篱笆上的是同一串，白天一根线都不露
const treeFairy = computed(() => {
  const lit = new Set(canopy.value.map(b => b.k));
  return limbs.value.filter(l => lit.has(l.i)).map(l => {
    const bulbs = [];
    const n = props.variant === 4 ? 9 : 7;
    for (let k = 0; k < n; k++) {
      const t = clamp(.08 + k * (.9 / n), 0, .97);
      const p = pointAt(l.main.segs, t);
      const a = angAt(l.main.segs, t);
      const h = hash(props.seed + ':fl' + l.i + ':' + k);
      bulbs.push({
        k: 'm' + k, x: p.x + Math.sin(a) * 3.2, y: p.y + Math.cos(a) * 3.2,
        c: LIGHT_TONES[h % LIGHT_TONES.length], s: 1.6 + seg(h, 5, 8) / 10,
        dur: 2.4 + seg(h, 9, 100) / 25, dl: -(seg(h, 13, 100) / 10)
      });
    }
    l.secs.forEach((sec, j) => {
      if (j % 2) return;
      const p = pointAt(sec.segs, .82);
      const h = hash(props.seed + ':fs' + l.i + ':' + j);
      bulbs.push({
        k: 's' + j, x: p.x, y: p.y, c: LIGHT_TONES[h % LIGHT_TONES.length],
        s: 1.5 + seg(h, 5, 6) / 10, dur: 2.6 + seg(h, 9, 100) / 24, dl: -(seg(h, 13, 100) / 10)
      });
    });
    return { k: l.i, wire: dOf(l.main.segs), bulbs };
  });
});

// 树身中间也得缠一圈：灯线绕着树干左右穿过去，每棵树都亮，不等枝上有叶才亮
const trunkFairy = computed(() => {
  const f = form.value;
  const top = f.top + 46;
  const n = 10;
  const pts = [];
  const bulbs = [];
  for (let i = 0; i < n; i++) {
    const y = GROUND - 14 - (GROUND - 14 - top) * (i / (n - 1));
    const x = trunkX(y) + Math.sin(i * 1.9) * 4.2;
    pts.push([x, y]);
    const h = hash(props.seed + ':tf' + i);
    bulbs.push({
      k: i, x: +x.toFixed(1), y: +y.toFixed(1),
      c: LIGHT_TONES[h % LIGHT_TONES.length],
      s: 1.5 + seg(h, 5, 6) / 10,
      dur: 2.5 + seg(h, 9, 100) / 26,
      dl: -(seg(h, 13, 100) / 10)
    });
  }
  return { wire: smoothRoot(pts), bulbs };
});

const hot = ref(null);
const over = m => (hot.value = m);
const off = () => (hot.value = null);
</script>

<template>
  <div class="soul">
    <svg class="tree" viewBox="0 0 300 420" fill="none" aria-hidden="true">
      <g class="ink">
        <path v-for="t in trunkPaths" :key="'trunk' + t.k" class="trunk" pathLength="1" :d="t.d"
          :style="{ strokeWidth: t.w, opacity: t.o, animationDelay: t.dl + 's' }"/>

        <path v-for="v in trunkVines" :key="v.k" class="trunk-vine" pathLength="1" :d="v.d"
          :style="{ animationDelay: v.dl + 's', strokeWidth: v.w, opacity: v.o }"/>

        <!-- 树脚鼓出一小块根颈，几股主根从底下分出去，半路再分叉；小树苗先不长根 -->
        <g v-if="rootReady" class="root-bed">
          <path v-for="(r, i) in rootFan" :key="'root' + i" class="root-line" :d="r.d"
            :style="{ strokeWidth: r.w, opacity: r.o }"/>
          <template v-for="(r, i) in rootFan" :key="'wire' + i">
            <path v-if="r.wire" class="root-wire" :d="r.wire"/>
          </template>
          <g class="fairy root-lights">
            <template v-for="(r, i) in rootFan" :key="'rl' + i">
              <template v-for="b in r.lights" :key="i + ':' + b.k">
                <circle class="bulb-halo" :cx="b.x" :cy="b.y" :r="(b.s * 3).toFixed(1)" :style="{ '--c': b.c }"/>
                <circle class="bulb" :cx="b.x" :cy="b.y" :r="b.s"
                  :style="{ '--c': b.c, animationDuration: b.dur + 's', animationDelay: b.dl + 's' }"/>
              </template>
            </template>
          </g>
        </g>
        <template v-for="b in canopy" :key="'b' + b.k">
          <path v-for="m in b.main" :key="'m' + m.k" class="bough bough-main" pathLength="1" :d="m.d"
            :style="{ strokeWidth: m.w, animationDelay: (+b.delay + m.k * .04) + 's' }"/>
          <template v-for="s in b.secs" :key="'s' + s.k">
            <path class="bough bough-side" pathLength="1" :d="s.dBase"
              :style="{ strokeWidth: s.w, animationDelay: (+b.delay + .12 + s.k * .04) + 's' }"/>
            <path class="bough bough-side bough-soft" pathLength="1" :d="s.dTip"
              :style="{ strokeWidth: s.wt, animationDelay: (+b.delay + .16 + s.k * .04) + 's' }"/>
            <path v-for="t in s.twigs" :key="'t' + t.k" class="twig" pathLength="1" :d="t.d"
              :style="{ strokeWidth: t.w, animationDelay: (+b.delay + .2 + s.k * .04 + t.k * .03) + 's' }"/>
          </template>
        </template>
        <path v-for="t in tails" :key="t.k" class="tendril" pathLength="1" :d="t.d"
          :style="{ animationDelay: 1.2 + t.y * .004 + 's' }"/>

        <!-- 头顶那一撮新芽，树再旧也得往上长；双干树两边各冒一撮 -->
        <template v-if="list.length">
          <image v-for="c in crowns" :key="'crown' + c.k" :href="iconUri(c.icon, '#4F6B3A')"
            :x="c.x - 15" :y="c.y" width="30" height="30" class="crown"/>
        </template>
      </g>

      <!-- 夜里才缠上枝子的彩灯，白天连一根线都看不见 -->
      <g class="fairy">
        <path class="light-wire" :d="trunkFairy.wire"/>
        <template v-for="b in trunkFairy.bulbs" :key="'tb' + b.k">
          <circle class="bulb-halo" :cx="b.x" :cy="b.y" :r="(b.s * 3).toFixed(1)" :style="{ '--c': b.c }"/>
          <circle class="bulb" :cx="b.x" :cy="b.y" :r="b.s"
            :style="{ '--c': b.c, animationDuration: b.dur + 's', animationDelay: b.dl + 's' }"/>
        </template>
      </g>
      <g v-for="f in treeFairy" :key="'fairy' + f.k" class="fairy">
        <path class="light-wire" :d="f.wire"/>
        <template v-for="b in f.bulbs" :key="b.k">
          <circle class="bulb-halo" :cx="b.x.toFixed(1)" :cy="b.y.toFixed(1)"
            :r="(b.s * 3.1).toFixed(1)" :style="{ '--c': b.c }"/>
          <circle class="bulb" :cx="b.x.toFixed(1)" :cy="b.y.toFixed(1)" :r="b.s"
            :style="{ '--c': b.c, animationDuration: b.dur + 's', animationDelay: b.dl + 's' }"/>
        </template>
      </g>

      <g v-for="b in canopy" :key="'l' + b.k">
        <g v-for="l in b.leaves" :key="l.s.id" class="mark" :data-id="l.s.id"
          :class="{ hot: hot === l, fresh: fresh === l.s.id }"
          :transform="`translate(${l.x.toFixed(1)} ${l.y.toFixed(1)})`"
          @mouseenter="over(l)" @mouseleave="off" @click="emit('open', l.s)">
          <circle class="hit" :r="l.hit"/>
          <g class="bud" :style="{ '--grow': l.grow + 's' }">
            <path class="leaf-vine" :d="l.vine.d" :style="{ strokeWidth: l.vine.w, opacity: l.vine.o }"/>
            <g class="sway" :style="{ '--amp': l.amp + 'deg', animationDuration: l.dur + 's', animationDelay: l.dl + 's' }">
              <image :href="l.icon" :x="-l.size / 2" :y="-l.size / 2" :width="l.size" :height="l.size"
                :transform="`rotate(${l.rot})`"/>
            </g>
            <path v-for="d in l.drops" :key="d.k" class="dew"
              :d="dewPath(d.size)" :transform="`translate(${d.dx} ${d.dy}) rotate(${d.rot})`"/>
            <image v-for="v in l.vine.leaves" :key="'v' + v.k" class="leaf-vine-tip" :href="v.icon"
              :x="v.x - v.s / 2" :y="v.y - v.s / 2" :width="v.s" :height="v.s"
              :transform="`rotate(${v.rot} ${v.x} ${v.y})`"/>
          </g>
        </g>
      </g>

      <g v-for="t in tails" :key="'l' + t.k" class="tail-tip"
        :style="{ animationDelay: (1.2 + t.y * .004).toFixed(2) + 's' }">
        <image v-for="v in t.vine" :key="v.k" :href="t.icon" :x="v.x - v.s / 2" :y="v.y - v.s / 2"
          :width="v.s" :height="v.s" :transform="`rotate(${v.rot} ${v.x} ${v.y})`" opacity=".58"/>
        <image :href="t.icon" :x="t.x - t.s / 2" :y="t.y - t.s / 2" :width="t.s" :height="t.s"/>
      </g>
    </svg>

    <Transition name="hang">
      <PlotSign v-if="hot" class="hang-sign" :text="peek ? (hot.s.peek || hot.s.title) : hot.s.title"
        :style="{ left: hot.x / 3 + '%', top: hot.y / 4.2 + '%' }"/>
    </Transition>
  </div>
</template>

<style scoped>
.soul { position: relative; width: 100%; height: 100%; }
.tree { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
.ink { filter: url(#boil-soft); animation: breatheHard 12s ease-in-out infinite; }
.ink path { stroke: var(--graphite); stroke-linecap: round; animation: strokeIn 1.2s ease-out backwards; }
/* 树根和树身同一种墨：根颈鼓出来，几股主根贴着地皮走，半路再分叉 */
.root-bed { animation: rootFade .9s .05s ease-out backwards; }
.ink .root-line { fill: none; stroke: color-mix(in srgb, var(--graphite) 78%, var(--wood));
  stroke-linecap: round; animation: none; }
.root-wire { display: none; fill: none; stroke: rgba(214, 190, 148, .3); stroke-width: .9; stroke-linecap: round; }
body[data-night="1"] .root-wire { display: block; }
@keyframes rootFade { from { opacity: 0; } to { opacity: 1; } }
/* 主枝压在后头，侧枝和前梢一层层往前，树才有前后 */
.bough { stroke-linecap: round; }
.bough-main { opacity: .9; stroke: color-mix(in srgb, var(--wood) 52%, var(--graphite)); }
.bough-side { opacity: .76; stroke: color-mix(in srgb, var(--wood) 66%, var(--graphite)); }
.bough-soft { opacity: .68; }
.twig { opacity: .62; stroke: var(--wood); }
.trunk-vine { stroke-width: 1.5; opacity: .55; stroke: var(--grass-deep); }
.tendril { stroke-width: 1.55; opacity: .6; stroke: var(--grass-deep); }
/* 夜里树干不吃月光，还是深色的，只是从墨棕退成带蓝的灰 */
body[data-night="1"] .trunk { stroke: color-mix(in srgb, var(--graphite) 56%, #37433E); }
body[data-night="1"] .bough-main { stroke: color-mix(in srgb, var(--graphite) 58%, #37433E); }
body[data-night="1"] .bough-side { stroke: color-mix(in srgb, var(--graphite) 50%, #37433E); }
body[data-night="1"] .twig { stroke: color-mix(in srgb, var(--graphite) 42%, #37433E); }
body[data-night="1"] .ink .root-line { stroke: color-mix(in srgb, var(--graphite) 58%, #37433E); }
.crown { opacity: .8; animation: fadeIn .8s .7s ease-out backwards; }
/* 天黑：叶子和藤退进暗里，彩灯才有地方亮 */
body[data-night="1"] .mark image { opacity: .84; filter: brightness(.84) saturate(.7) hue-rotate(-4deg); }
body[data-night="1"] .mark.hot image { opacity: 1; filter: brightness(1) saturate(.84); }
body[data-night="1"] .crown { opacity: .56; filter: brightness(.74) saturate(.66); }
body[data-night="1"] .trunk-vine, body[data-night="1"] .tendril,
body[data-night="1"] .leaf-vine { opacity: .46; }

/* 树上缠的彩灯：白天一根线都不露，天黑才沿着枝子亮起来 */
.fairy { display: none; }
body[data-night="1"] .fairy { display: block; }
.fairy .light-wire { fill: none; stroke: rgba(214, 190, 148, .26); stroke-width: .7; stroke-linecap: round; }
.fairy .bulb-halo { fill: var(--c); opacity: .15; filter: blur(1.4px); }
.fairy .bulb { fill: var(--c); animation: bulbTwinkle 3s ease-in-out infinite alternate; }
@keyframes bulbTwinkle { from { opacity: .3; } to { opacity: 1; } }

.mark { pointer-events: all; cursor: pointer; }
.hit { fill: transparent; }
/* 刚种回来的那一片：圈一圈虚线，顺着藤一眼认出 */
.mark.fresh .hit { fill: color-mix(in srgb, var(--wheat) 16%, transparent);
  stroke: var(--wood); stroke-width: 1.2; stroke-dasharray: 3 5;
  animation: findRing 1.4s ease-in-out infinite alternate; }
@keyframes findRing { from { opacity: .22; } to { opacity: .9; } }
/* 每一块地都是慢慢顶出来的，不是刷新时一起贴上去的 */
.bud { transform-box: fill-box; transform-origin: center;
  animation: budIn .9s cubic-bezier(.2, .8, .3, 1) var(--grow) backwards; }
.sway { transform-box: fill-box; transform-origin: center; animation-name: leafSway; animation-timing-function: ease-in-out;
  animation-iteration-count: infinite; animation-direction: alternate; }
.mark image { opacity: .92; transition: opacity .35s; }
.mark.hot .sway { animation: none; transform: scale(1.38); }
.mark.hot image { opacity: 1; }
/* 叶底挂的水珠：一滴比一滴小，半透，像刚凝出来的 */
.mark .dew { fill: color-mix(in srgb, var(--sky) 58%, transparent);
  stroke: color-mix(in srgb, var(--sky) 78%, var(--paper)); stroke-width: .45;
  pointer-events: none; }
.mark .dew:nth-child(2n) { opacity: .72; }
/* 叶下垂的细藤：不跟叶子一起转，始终往下找土 */
.leaf-vine { fill: none; stroke: var(--grass-deep); stroke-linecap: round;
  filter: url(#boil-soft); pointer-events: none; }
.leaf-vine-tip { opacity: .62; pointer-events: none; }
.tail-tip { animation: fadeIn .9s ease-out backwards; }
.tail-tip image { opacity: .7; }

/* 枝头的木牌从同一块篱上取：位置由叶子定，牌子自己按字长短 */
.hang-enter-active, .hang-leave-active { transition: opacity .3s; }
.hang-enter-from, .hang-leave-to { opacity: 0; }

@keyframes leafSway { from { transform: rotate(calc(var(--amp) * -1)); } to { transform: rotate(var(--amp)); } }
@keyframes breatheHard { 0%, 100% { opacity: .82; } 50% { opacity: 1; } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes budIn {
  from { opacity: 0; transform: scale(.05) translateY(2px); }
  to { opacity: 1; transform: none; }
}
</style>
