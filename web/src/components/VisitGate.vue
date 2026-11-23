<script setup>
import { ref } from 'vue';
import Glyph from './Glyph.vue';

const emit = defineEmits(['go', 'town', 'advice']);
const leaving = ref(false);
// 牌子的另一面朝着城：翻过来看一眼，再决定往哪边走
const side = ref('visit');

function flip() {
  side.value = side.value === 'visit' ? 'town' : 'visit';
}
function enter() {
  if (leaving.value) return;
  leaving.value = true;
  emit(side.value === 'visit' ? 'go' : 'town');
}
</script>

<template>
  <div class="signpost" :class="{ leaving }">
    <span class="post" aria-hidden="true"/>
    <span class="board-flip" :class="{ flipped: side === 'town' }">
      <button class="board front" :tabindex="side === 'visit' ? 0 : -1" :aria-hidden="side !== 'visit'"
        aria-label="串门，看看别人公开的心田" @click="enter">
        <span class="word">串门</span>
        <Glyph name="right" :size="16"/>
        <i class="nail n1"/><i class="nail n2"/>
      </button>
      <button class="board back" :tabindex="side === 'town' ? 0 : -1" :aria-hidden="side !== 'town'"
        aria-label="进城，城里的门还没开" @click="enter">
        <span class="word">进城</span>
        <Glyph name="right" :size="16"/>
        <i class="nail n1"/><i class="nail n2"/>
      </button>
    </span>
    <button class="flip-tag" :aria-label="side === 'visit' ? '翻到另一面：进城' : '翻到另一面：串门'"
      @click="flip">
      <Glyph name="undo" :size="12"/>
      另一面：{{ side === 'visit' ? '进城' : '串门' }}
    </button>
    <Glyph class="leaflet" name="leaf" :size="19" aria-hidden="true"/>
    <Glyph class="sprout" name="sprout" :size="24" aria-hidden="true"/>
    <Glyph class="rock" name="rock" :size="20" aria-hidden="true"/>
    <i class="grass g1"/><i class="grass g2"/><i class="grass g3"/>
    <span class="flutter"><Glyph name="butterfly" :size="23"/></span>
    <span class="hint">{{ side === 'visit' ? '去看看别人种了什么' : '城里的门还关着' }}</span>
    <button class="advice" aria-label="您的宝贵意见，点开写两句" @click="emit('advice')">
      <span class="advice-string" aria-hidden="true"/>
      <span class="advice-paper">
        <span class="advice-title"><Glyph name="pen" :size="15"/> 您的宝贵意见</span>
        <i>点一下，写两句</i>
      </span>
    </button>
  </div>
</template>

<style scoped>
/* 田埂边插着一块指路的木牌：一根木桩，一块削成箭头的板，蝶绕着板梢转 */
.signpost { position: fixed; right: 4.5vw; top: 59%; z-index: 20; display: block;
  width: 200px; height: 172px; perspective: 700px; transition: opacity .3s, translate .3s; }
.signpost.leaving { opacity: 0; translate: 0 -8px; }
/* 桩脚底下洇开一点土影，牌子才是插在地里的，不是浮着的 */
.signpost::after { content: ''; position: absolute; left: 16px; bottom: -3px; width: 62px; height: 9px;
  border-radius: 50%; background: radial-gradient(closest-side, rgba(63, 48, 32, .18), transparent);
  pointer-events: none; }

/* 桩子往土里斜插一点，木纹不齐，顶上削出个尖 */
.post { position: absolute; left: 34px; bottom: 4px; width: 12px; height: 144px;
  border-radius: 3px 2px 1px 2px; transform: rotate(1.6deg); transform-origin: 50% 100%;
  background:
    repeating-linear-gradient(88deg, transparent 0 4px, rgba(63, 48, 32, .13) 4px 5px, transparent 5px 12px),
    linear-gradient(90deg, #6F543B, #A4845E 40%, #8F6E4A 70%, #634A33);
  box-shadow: inset 1px 0 rgba(255, 253, 244, .22), inset -1px 0 rgba(63, 48, 32, .2),
    1px 2px 4px rgba(63, 48, 32, .16); }
.post::before { content: ''; position: absolute; left: 0; top: -8px; width: 12px; height: 10px;
  background: linear-gradient(90deg, #6F543B, #A4845E 45%, #634A33);
  clip-path: polygon(50% 0, 100% 55%, 90% 100%, 10% 100%, 0 55%); }
.post::after { content: ''; position: absolute; left: 3px; top: 52px; width: 5px; height: 7px;
  border-radius: 50% 44% 52% 46%; background: rgba(63, 48, 32, .26); }

/* 箭头牌朝右指，一头削尖；牌面两枚钉子钉在桩上。整块牌子能翻面，背面朝着城 */
.board-flip { position: absolute; left: 20px; top: 28px; z-index: 2; display: grid;
  transform: rotate(-2.4deg); transform-style: preserve-3d;
  transition: transform .62s cubic-bezier(.35, .12, .28, 1); }
.board-flip.flipped { transform: rotate(-2.4deg) rotateY(180deg); }
.signpost:hover .board-flip { transform: rotate(-1.4deg); }
.signpost:hover .board-flip.flipped { transform: rotate(-3.4deg) rotateY(180deg); }
.board { position: relative; grid-area: 1 / 1; display: inline-flex; align-items: center;
  width: max-content; white-space: nowrap; gap: 9px; padding: 8px 34px 9px 30px;
  color: #FBF7EE; background: #8B6B4A;
  clip-path: polygon(0 8%, 84% 0, 100% 50%, 84% 100%, 0 92%);
  filter: drop-shadow(0 5px 6px rgba(63, 48, 32, .16));
  backface-visibility: hidden; -webkit-backface-visibility: hidden;
  transition: background .35s; }
.board.back { transform: rotateY(180deg); }
.board::before { content: ''; position: absolute; inset: 0; opacity: .24;
  background: repeating-linear-gradient(93deg, rgba(63, 48, 32, .36) 0 1px, transparent 1px 8px); }
.word { position: relative; display: inline-block; font-size: calc(var(--fs-read) + 10px);
  letter-spacing: 6px; padding-left: 3px; line-height: 1.3; }
.board :deep(.gl) { position: relative; opacity: .78; }
.nail { position: absolute; top: 50%; width: 3px; height: 3px; margin-top: -1.5px; border-radius: 50%;
  background: rgba(63, 48, 32, .55); box-shadow: inset 0 .5px rgba(255, 253, 244, .25); }
.n1 { left: 13px; }
.n2 { left: 26px; }
.signpost:hover .board { background: #957253; }

/* 牌下钉一张小纸条：明说另一面还有一条路 */
.flip-tag { position: absolute; left: 23px; top: 92px; z-index: 4; display: inline-flex;
  align-items: center; gap: 4px; padding: 3px 7px 4px; font-size: var(--fs-xs);
  letter-spacing: .04em; color: var(--wood); background: color-mix(in srgb, var(--paper) 82%, transparent);
  border-radius: 3px 9px 4px 8px / 8px 4px 9px 5px;
  box-shadow: inset 0 0 0 1px rgba(150, 133, 100, .38);
  transform: rotate(1.6deg); transition: background .25s, color .25s; }
.flip-tag:hover { color: var(--grass-deep); background: color-mix(in srgb, var(--paper) 94%, transparent); }
.flip-tag :deep(.gl) { opacity: .7; }

/* 板下露半片叶，桩脚一颗石、一株苗、几根草，像是从这片地里长出来的 */
.leaflet { position: absolute; left: 5px; top: 68px; z-index: 1; color: var(--grass-deep);
  opacity: .72; transform: rotate(-30deg); pointer-events: none; }
.sprout { position: absolute; left: 52px; bottom: 2px; color: var(--grass-deep);
  opacity: .8; transform: rotate(5deg); pointer-events: none; }
.rock { position: absolute; left: 20px; bottom: 0; color: var(--ink-faint);
  opacity: .62; transform: rotate(-8deg); pointer-events: none; }
.grass { position: absolute; bottom: 2px; width: 2px; height: 15px; border-radius: 50% 50% 0 0;
  background: var(--grass); opacity: .55; transform-origin: bottom; pointer-events: none; }
.g1 { left: 44px; height: 13px; transform: rotate(-18deg); }
.g2 { left: 58px; height: 17px; transform: rotate(9deg); opacity: .42; }
.g3 { left: 70px; height: 12px; transform: rotate(20deg); opacity: .5; }

/* 一只蝶绕着牌梢转，翅膀自己轻轻开合；凑近读字时它先飞开 */
.flutter { position: absolute; left: 174px; top: 6px; z-index: 3; pointer-events: none; line-height: 0;
  color: var(--clay); animation: signFly 13s ease-in-out infinite; transition: opacity .3s; }
.signpost:hover .flutter { opacity: 0; }
.flutter :deep(svg) { transform-box: fill-box; transform-origin: center;
  animation: signWing .48s ease-in-out infinite alternate; }
@keyframes signWing { from { transform: scaleX(1); } to { transform: scaleX(.68); } }
@keyframes signFly {
  0% { transform: translate(0, 0) rotate(-10deg); }
  28% { transform: translate(-26px, -15px) rotate(12deg); }
  55% { transform: translate(-44px, 5px) rotate(-7deg); }
  80% { transform: translate(-14px, 18px) rotate(8deg); }
  100% { transform: translate(0, 0) rotate(-10deg); }
}

.hint { position: absolute; left: 20px; top: -10px; z-index: 4; white-space: nowrap; line-height: 1.4;
  font-size: var(--fs-base); color: var(--ink-soft); letter-spacing: 1.5px; opacity: 0;
  transform: translateY(4px); transition: opacity .25s, transform .25s; pointer-events: none; }
.signpost:hover .hint { opacity: 1; transform: translateY(0); }

/* 桩上垂一张意见纸：不是又一块木牌，是路过的人能随手写字的地方。
   平时先收着，别挡住树；手落到牌子上，纸才垂下来 */
.advice { position: absolute; left: -184px; top: min(0px, calc(41vh - 320px)); z-index: 3;
  width: 186px; text-align: left; transform-origin: 100% 0;
  opacity: 0; translate: 0 5px; pointer-events: none;
  transition: opacity .25s, translate .25s; animation: noteSway 9s ease-in-out infinite; }
.signpost:hover .advice, .signpost:focus-within .advice {
  opacity: 1; translate: 0 0; pointer-events: auto; }
.advice-string { position: absolute; right: -36px; top: 17px; width: 36px; height: 1px;
  background: rgba(139, 107, 74, .5); }
.advice-paper { position: relative; display: flex; flex-direction: column; gap: 1px;
  padding: 7px 13px 9px; border: 1px solid rgba(150, 133, 100, .32);
  border-radius: 2px 7px 3px 8px / 6px 3px 7px 2px;
  background: color-mix(in srgb, var(--paper) 96%, transparent);
  box-shadow: 0 3px 9px rgba(63, 48, 32, .13);
  transition: background .3s, box-shadow .3s; }
.advice-paper::after { content: ''; position: absolute; right: -1px; top: -1px; width: 10px; height: 10px;
  background: linear-gradient(225deg, color-mix(in srgb, var(--paper) 80%, transparent) 50%,
    rgba(150, 133, 100, .24) 50%); clip-path: polygon(0 0, 100% 0, 100% 100%); }
.advice-title { display: flex; align-items: center; gap: 5px; font-size: var(--fs-base);
  letter-spacing: .08em; color: var(--ink); }
.advice-title :deep(.gl) { flex: none; color: var(--wood); opacity: .8; }
.advice-paper i { font-style: normal; font-size: var(--fs-xs); letter-spacing: .06em; color: var(--ink-faint); }
.advice:hover .advice-paper { background: color-mix(in srgb, var(--paper) 100%, transparent);
  box-shadow: 0 5px 13px rgba(63, 48, 32, .17); }
.advice:hover .advice-title { color: var(--grass-deep); }
@keyframes noteSway {
  0%, 100% { transform: rotate(-1.7deg); }
  50% { transform: rotate(-.5deg); }
}

/* 窄屏不压在藤上：牌子和原野上下排开，纸页翻到头也总看得见 */
@media (max-width: 1000px) {
  .signpost { position: relative; top: auto; right: auto; zoom: .66; margin: 0 14px 8px auto; }
  .hint { display: none; }
  /* 牌缩小了，意见纸不能再跟着缩成一行小字；窄屏没有 hover，纸照常露着 */
  .advice { scale: 1.4; opacity: 1; translate: 0 0; pointer-events: auto; }
}
@media (prefers-reduced-motion: reduce) {
  .signpost, .board-flip, .board, .hint, .flutter, .flutter :deep(svg), .advice { animation: none; transition: none; }
}
</style>
