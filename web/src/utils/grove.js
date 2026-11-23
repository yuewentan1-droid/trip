export const TREE_CAP = 60;
export const TREE_EDGE_CAP = 30;
export const TREE_MAX = 5;
export const GROUND_CAP = 15;
export const WIND_CAP = 200;
// 五棵树各有各的地界：主树六十，第二棵三十，第三棵二十，第四棵二十五，第五棵三十
export const TREE_CAPS = [60, 30, 20, 25, 30];

const key = uid => 'grove_' + uid;
const kept = n => Math.min(TREE_MAX - 1, Math.max(0, Math.floor(Number(n) || 0)));

// 本机记着种过几棵，服务器上也记了一份；换台机器串门时也看得见别人的第二棵
export const extraTrees = (uid, saved = 0) =>
  kept(Math.max(Number(localStorage.getItem(key(uid))) || 0, Number(saved) || 0));

export const plantTree = (uid, saved = 0) => {
  const n = kept(extraTrees(uid, saved) + 1);
  localStorage.setItem(key(uid), n);
  return n;
};

export const treeTotal = sessions => sessions.filter(s =>
  s.status === 'finished' && (s.placement === 'tree' || !s.placement)).length;

// 每棵树的叶子数不一样，后面的树站在边上，地界也窄
export const treeCap = i => TREE_CAPS[i] || TREE_CAPS[TREE_CAPS.length - 1];
export const treeLimit = n => TREE_CAPS.slice(0, Math.max(0, Math.min(TREE_MAX, n)))
  .reduce((a, b) => a + b, 0);

export const groveCount = (count, extra = 0) => {
  let n = Math.min(TREE_MAX, Math.max(1, Math.floor(Number(extra) || 0) + 1));
  while (n < TREE_MAX && count > treeLimit(n)) n++;
  return n;
};

export const treeGroups = (list, extra = 0) => {
  // 空院子先留一块地，树要等真落下东西才冒头；本机多种的那一棵也一样
  if (!list.length) return [];
  const n = groveCount(list.length, extra);
  let at = 0;
  return Array.from({ length: n }, (_, i) => {
    const group = list.slice(at, at + treeCap(i));
    at += treeCap(i);
    return group;
  });
};

// 五棵树按用户 id 换一套种序：每户都长齐五种，序号先打散，相邻的几户也不会长成同一排
const FACTS = [1, 1, 2, 6, 24, 120];
// 先把 id 搅一遍再拆种序，像二维码排点那样，挨着的号也不会分到同一副骨架
const seedOf = uid => {
  let n = Math.imul(Math.abs(Math.floor(Number(uid) || 0)) + 0x9E3779B9, 0x85EBCA6B) >>> 0;
  n ^= n >>> 13;
  n = Math.imul(n, 0xC2B2AE35) >>> 0;
  return (n ^ (n >>> 16)) >>> 0;
};
export const treeForm = (uid, i) => {
  let n = seedOf(uid) % 120;
  const left = [0, 1, 2, 3, 4];
  const order = [];
  for (let k = 5; k > 0; k--) {
    const f = Math.floor(n / FACTS[k - 1]);
    n %= FACTS[k - 1];
    order.push(left.splice(f, 1)[0]);
  }
  return order[i % TREE_MAX];
};

// 后来种下的树挨着最高的那棵一株株矮下去，个头差得不远，五棵都留在画里，根还扎在同一条土线上
const TREE_SPOTS = ['43.5%', '56.8%', '70.2%', '83.6%'];
// 左边要让给垂下来的藤，后排的树往里收半步
// 第五棵再往右挪三十；主树和第四棵往下沉得更低，第四棵再往上长一百四十五像素
const HOME_SPOTS = ['34.8%', '48%', '59%', 'calc(70% + 50px)'];
const HOME_DROP = [46, 0, 0, 46, 0];
const TREE_SCALES = [.90, .82, .76, .70];
// 主树高百分之五，第三棵百分之十四，第四棵百分之十；其余两棵照旧
const TREE_BOOST = [1.05, 1, 1.14, 1.10, 1];
// 树跟着这块地里的东西长：第一片叶子才冒头时只是一棵小树苗，装满这棵树才长到全高
export const treeGrow = (n, cap) =>
  +(0.38 + 0.62 * Math.pow(Math.max(1, Math.min(cap, n)) / cap, .55)).toFixed(3);
export const treeStyle = (i, where, n = 0, cap = treeCap(i)) => {
  const spots = where === 'home' ? HOME_SPOTS : TREE_SPOTS;
  return {
    '--tree-left': i ? spots[i - 1] || spots[spots.length - 1] : null,
    '--tree-scale': i ? TREE_SCALES[i - 1] || TREE_SCALES[TREE_SCALES.length - 1] : null,
    '--tree-drop': (where === 'home' ? HOME_DROP[i] || 0 : 0) + 'px',
    '--tree-extra': i === 3 ? '145px' : null,
    '--tree-boost': TREE_BOOST[i] || 1,
    '--tree-grow': treeGrow(n, cap)
  };
};

// 地上长的分给每棵树根，主树还是贴着原野那根位置，后几棵跟着自己的树走
export const treeRoots = (n, where) => {
  const spots = where === 'home' ? HOME_SPOTS : TREE_SPOTS;
  return Array.from({ length: n }, (_, i) => i ? spots[i - 1] : 'var(--tree-x)');
};
