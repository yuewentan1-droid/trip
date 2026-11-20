// 十支笔的墨性变量定义在 theme.css，这里只留名册和样字
export const PENS = {
  zh: [
    { id: 'xingkai', label: '行楷', sample: '永' },
    { id: 'shoujin', label: '瘦金', sample: '永' },
    { id: 'kuangcao', label: '狂草', sample: '永' },
    { id: 'tongqu', label: '童趣', sample: '永' },
    { id: 'tuimo', label: '褪色墨', sample: '永' }
  ],
  en: [
    { id: 'roundhand', label: '圆体', sample: 'Ag' },
    { id: 'cursive', label: '连笔草书', sample: 'Ag' },
    { id: 'typewriter', label: '打字机', sample: 'Ag' },
    { id: 'pencil', label: '细铅笔', sample: 'Ag' },
    { id: 'calligraphy', label: '花体', sample: 'Ag' }
  ]
};

export const isLatin = ch => /[A-Za-z0-9]/.test(ch);
