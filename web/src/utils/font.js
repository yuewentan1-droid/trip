import { computed } from 'vue';
import { usePen } from '../store/pen';
import { isLatin } from '../constants/pens';

// 全站的字都从这里取笔：输入框挂 cls，成段的字走 runs，选了什么笔就长什么样
export function useFontStyle() {
  const pen = usePen();
  const cls = computed(() => 'p-' + pen.zh);

  // 一句话按中英文切成几截，各截认各的笔，混排的时候两支笔都算数
  function runs(text) {
    const out = [];
    for (const ch of String(text ?? '')) {
      const latin = isLatin(ch);
      const last = out[out.length - 1];
      // 空格跟着前一截走，免得整句被切成一地碎渣
      if (last && (last.latin === latin || ch === ' ')) last.t += ch;
      else out.push({ t: ch, latin, cls: 'p-' + (latin ? pen.en : pen.zh) });
    }
    return out;
  }

  return { cls, runs };
}
