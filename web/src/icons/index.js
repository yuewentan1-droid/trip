const files = import.meta.glob('../assets/doodle/*.svg', { query: '?raw', import: 'default', eager: true });

export const ICONS = Object.fromEntries(
  Object.entries(files).map(([p, svg]) => [p.split('/').pop().slice(0, -4), svg])
);

/** 把库里的手绘图标染成某个颜色，好嵌进 SVG 里当树叶、花和种子 */
export const iconUri = (name, color = '#4F6B3A') =>
  'data:image/svg+xml,' + encodeURIComponent((ICONS[name] || ICONS.leaf).replace(/currentColor/g, color));

/** 四大气候区里，新撒的种子默认长什么样 */
export const ZONE_GLYPH = { 学科: 'openbook', 行业: 'rock', 人群: 'home', 幻想: 'moons' };

/** 系统预置的那几块地：数据库里存的是 emoji，这里按名字认领一个手绘图形 */
export const TOPIC_GLYPH = {
  哲学: 'openbook', 心理学: 'puzzle', 经济学: 'bills', 生物学: 'leaf', 历史学: 'scroll',
  互联网: 'laptop', 教育: 'note', 医疗: 'shield', 农业: 'sun',
  学生: 'pen', 社会人: 'gear', 老人: 'moons',
  如果时间可以倒流: 'undo', 一百年后的城市: 'cube', 如果动物会说话: 'bird', 平行世界的我: 'copy'
};

/** 用户自定义的地：icon 列存的就是图标名；不认识的（旧的 emoji）按气候区兜底 */
export function glyphOf(topic) {
  if (ICONS[topic.icon]) return topic.icon;
  return TOPIC_GLYPH[topic.name] || ZONE_GLYPH[topic.category] || 'leaf';
}

/** 撒种时可以挑的那几枚 */
export const SEED_CHOICES = [
  'leaf', 'sprout', 'flower', 'blossom', 'pine', 'plant', 'daisy', 'sun', 'moon', 'cloud', 'rain',
  'star', 'bird', 'cat', 'fish', 'home', 'rock', 'openbook', 'scroll', 'note', 'heart',
  'bulb', 'map', 'quote', 'undo'
];
