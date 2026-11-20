export const DIMS = [
  { key: '学科', color: 'var(--grass-deep)', glyph: 'openbook' },
  { key: '行业', color: 'var(--wheat)', glyph: 'rock' },
  { key: '学生', color: 'var(--sky)', glyph: 'pen' },
  { key: '社会人', color: 'var(--clay)', glyph: 'gear' },
  { key: '老人', color: 'var(--lilac)', glyph: 'moons' },
  { key: '幻想', color: 'var(--sakura)', glyph: 'stars' }
];

export const dimOf = k => DIMS.find(d => d.key === k) || DIMS[0];

export const HOOKS = [
  '如果把这件事交给一个 70 岁的人来决定，他会先问什么？',
  '一个从没接触过这行的中学生，第一眼会觉得哪里怪？',
  '假设这件事彻底失败了，最先烂掉的是哪个环节？',
  '如果一分钱不用花，你会先改哪里？',
  '一百年后的人回看这件事，会觉得我们哪儿傻？',
  '把这事儿讲给一个种地的人听，他会拿什么打比方？',
  '哪个前提是所有人都默认对的？你真的验证过吗？',
  '如果只能留下其中很小的一块，你留哪块？',
  '换一个特别怕麻烦的人来做，他会走哪条捷径？',
  '这件事里，哪部分是你真在乎的，哪部分只是惯性？',
  '要是没人会知道你在这件事上花了功夫，你还做吗？',
  '五年前你会怎么看待现在纠结的这个点？'
];
