export const DIMS = [
  { key: '学科', color: 'var(--grass-deep)', glyph: 'openbook' },
  { key: '行业', color: 'var(--wheat)', glyph: 'rock' },
  { key: '学生', color: 'var(--sky)', glyph: 'pen' },
  { key: '社会人', color: 'var(--clay)', glyph: 'gear' },
  { key: '老人', color: 'var(--lilac)', glyph: 'moons' },
  { key: '幻想', color: 'var(--sakura)', glyph: 'stars' }
];

export const dimOf = k => DIMS.find(d => d.key === k) || DIMS[0];
