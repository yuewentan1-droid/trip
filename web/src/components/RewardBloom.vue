<script setup>
import { onMounted, ref } from 'vue';
import Glyph from './Glyph.vue';

// 每跨过 3 的倍数层递一礼。苗按层数往上长：破土、抽枝、打苞、初绽、结果，
// 到第六阶转「共生季」，之后只往长成的这棵上添活物，不重头再长一遍。
const props = defineProps({ stage: Number });
const emit = defineEmits(['done']);

const GIFT = [['破', '土'], ['抽', '枝'], ['打', '苞'], ['初', '绽'], ['结', '果'], ['共生', '季']];
const GUEST = ['fly', 'rain', 'rabbit'];
const gift = GIFT[Math.min(props.stage, 6) - 1];
const guest = GUEST[props.stage % 3];

// 引子都是本地攒的话，不接任何模型：口语、像心里冒出来的一句、留一个没答完的口子
const WHISPER = [
  '土松了一点，根可以往更深的地方再探探。',
  '你刚才一直在用同一片叶子看它——换个角度，枝上会多长出来什么？',
  '走到这儿，其实最难的部分你已经想过了。',
  '如果把这个想法交给十年前的你，他会先问你什么？',
  '慢没关系，你已经在往下走了。',
  '这一层好像有点意思，别急着翻篇，再坐一会儿。',
  '有没有一个你一直绕开的那个词？现在它就在门口。',
  '果子里带着花开时的雨，你记不记得那场雨是什么。',
  '再挖一层，看看是不是同一个人会害怕同一样东西。',
  '今天先长到这儿，根还在夜里继续伸。',
  '你写下的最重的那句，多半是你不敢说出口的那句。',
  '试着从「失去它」的角度，再看一遍。'
];
const whisper = WHISPER[Math.floor(Math.random() * WHISPER.length)];

// 蔓上的东西都钉在 120 见方的格子里，换算成百分比就不跟着尺寸跑
const at = (x, y, spin) => ({ left: x / 1.2 + '%', top: y / 1.2 + '%', '--spin': spin + 'deg' });

// 图形长稳之后再把字留够读完的工夫，然后自己安静收走
const box = ref(null);
onMounted(() => {
  const sc = box.value?.closest('.roll');
  if (sc) sc.scrollTo({ top: sc.scrollHeight, behavior: 'smooth' });
  setTimeout(() => emit('done'), 5200);
});
</script>

<template>
  <div ref="box" class="bloom">
    <div class="bloom-in">
      <div class="grove">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <path class="soil" d="M12 104 H108"/>
          <path class="shell draw" :class="{ fresh: stage === 1 }" pathLength="1" d="M53 103 C 52 97, 56 94, 60 94"/>
          <path class="shell draw" :class="{ fresh: stage === 1 }" pathLength="1" d="M67 103 C 68 97, 64 94, 60 94"/>
          <path class="stalk draw" :class="{ fresh: stage === 1 }" pathLength="1" d="M60 100 C 57 84, 63 68, 60 48"/>
          <template v-if="stage >= 2">
            <path class="bough draw" :class="{ fresh: stage === 2 }" pathLength="1" d="M59 80 C 50 76, 44 68, 41 58"/>
            <path class="bough draw" :class="{ fresh: stage === 2 }" pathLength="1" d="M61 66 C 70 62, 76 54, 79 44"/>
          </template>
          <circle v-if="stage >= 5" class="berry" :class="{ fresh: stage === 5 }" cx="46" cy="66" r="5"/>
          <circle v-if="stage >= 5" class="berry" :class="{ fresh: stage === 5 }" cx="74" cy="52" r="4.4"/>
        </svg>

        <Glyph v-if="stage >= 2" class="hang pop" :class="{ fresh: stage === 2 }" name="leaf" :size="19"
          :style="at(41, 58, -26)"/>
        <Glyph v-if="stage >= 2" class="hang pop" :class="{ fresh: stage === 2 }" name="leaf" :size="17"
          :style="at(79, 44, 148)"/>
        <Glyph v-if="stage === 3" class="hang pop fresh" name="blossom" :size="21" :style="at(60, 44, -6)"/>
        <Glyph v-if="stage >= 4" class="hang pop" :class="{ fresh: stage === 4 }" name="daisy" :size="30"
          :style="at(60, 40, 8)"/>
        <Glyph v-if="stage >= 6" class="hang pop fresh guest" :name="guest" :size="23" :style="at(100, 76, 0)"/>
      </div>

      <div class="say">
        <p class="gift">{{ gift[0] }}<b>{{ gift[1] }}</b></p>
        <p class="whisper">{{ whisper }}</p>
      </div>

      <button class="shoo" title="我先接着想" @click="emit('done')"><Glyph name="close" :size="13" :boil="false"/></button>
    </div>
  </div>
</template>

<style scoped>
/* 就长在左边那栏，抽个引子的下头；像从纸边自己冒出来的一小丛 */
.bloom { position: relative; width: 100%; margin-top: auto; z-index: 1; pointer-events: none; }
.bloom-in { position: relative; pointer-events: none;
  display: flex; flex-direction: column; align-items: flex-start;
  padding: 4px 0 2px; animation: rise .7s ease-out backwards; }

/* 形在上，字在下：眼睛先看见长出来的东西，再落到那句话上 */
.grove { position: relative; width: 88px; height: 88px; margin-left: 2px; }
.grove svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible;
  fill: none; stroke-linecap: round; stroke-linejoin: round; }
.soil { stroke: var(--dry); stroke-width: 1.3; stroke-dasharray: 4 5; opacity: .55; }
.shell { stroke: var(--wood); stroke-width: 1.6; }
.stalk { stroke: var(--grass-deep); stroke-width: 2.1; }
.bough { stroke: var(--grass-deep); stroke-width: 1.5; opacity: .85; }
.berry { fill: rgba(230, 200, 110, .55); stroke: var(--wheat); stroke-width: 1.1;
  transform-box: fill-box; transform-origin: center; }

.hang { position: absolute; color: var(--grass-deep); transform: translate(-50%, -50%) rotate(var(--spin)); }
.guest { color: var(--sky); }

.say { min-width: 0; width: 100%; padding-bottom: 3px; }
.gift { font-size: var(--fs-title); font-weight: normal; letter-spacing: .14em; line-height: 1.3; color: var(--ink); }
/* 一整幅里只许这一处点睛 */
.gift b { font-weight: normal; color: #C0553B; }
.whisper { font-size: var(--fs-md); line-height: 1.7; color: var(--ink-soft); margin-top: 4px;
  animation: rise .9s ease-out .6s backwards; }

.shoo { position: absolute; top: 0; right: 0; padding: 3px 4px; line-height: 0; pointer-events: auto;
  color: var(--ink-faint); transition: color .4s, transform .5s cubic-bezier(.3, .9, .3, 1); }
.shoo:hover { color: var(--clay); transform: rotate(90deg); }

/* 一笔笔画出来。静止态就是画完的样子，所以关掉动画也照样看得见 */
.draw { stroke-dasharray: 1; stroke-dashoffset: 0; }
.draw.fresh { animation: draw 1.45s cubic-bezier(.3, .7, .3, 1) backwards; }
@keyframes draw { from { stroke-dashoffset: 1; } }

/* 花和果子缓缓胀大，挂点在自己身上，慢尾收尾，绝不弹跳 */
.pop.fresh { animation: swell 1.25s cubic-bezier(.22, .8, .26, 1) .18s backwards; }
@keyframes swell { from { opacity: 0; transform: translate(-50%, -50%) rotate(var(--spin)) scale(.2); } }
.berry.fresh { animation: plump 1.3s cubic-bezier(.22, .8, .26, 1) .2s backwards; }
@keyframes plump { from { opacity: 0; transform: scale(.2); } }

@keyframes rise { from { opacity: 0; transform: translateY(7px); } }

/* 手机上左栏整个摊到河上头，礼跟着走，字别太小 */
@media (max-width: 620px) {
  .bloom-in { align-items: center; }
  .grove { margin-left: 0; }
  .say { text-align: center; }
  .gift { font-size: var(--fs-head); }
}
</style>
