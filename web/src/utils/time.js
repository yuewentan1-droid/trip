const parse = s => new Date(String(s || '').replace(' ', 'T'));
const start = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

// 只看日历上的天，不看几点几分
export function daysAgo(s) {
  const d = parse(s);
  if (!s || isNaN(d)) return null;
  return Math.max(0, Math.round((start(new Date()) - start(d)) / 86400000));
}

export function spoken(s) {
  const n = daysAgo(s);
  if (n === null) return '还没人说过话';
  return n === 0 ? '今天有人留过话' : `${n} 天前有人留过话`;
}

export function said(s) {
  const n = daysAgo(s);
  if (n === 0) return '今天';
  if (n === 1) return '昨天';
  return `${n} 天前`;
}
