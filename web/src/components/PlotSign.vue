<script setup>
defineProps({
  text: { type: String, default: '' },
  align: { type: String, default: 'center' }
});
</script>

<template>
  <span class="plot-sign" :class="align" aria-hidden="true">
    <i class="rail"/>
    <i class="cord"/>
    <b class="board">{{ text }}</b>
  </span>
</template>

<style scoped>
/* 一块挂在矮篱上的木牌：先横着长，长到一行十三个字就折到第二行 */
.plot-sign { position: absolute; z-index: 30; display: block; pointer-events: none; }
.plot-sign.center { left: 50%; transform: translateX(-50%); }
.plot-sign.left { left: 0; }
.plot-sign.right { right: 0; }

.rail { position: relative; display: block; width: 36px; height: 2px; margin: 0 auto;
  border-radius: 2px; background: rgba(139, 107, 74, .62); transform: rotate(-1.4deg); }
.rail::before, .rail::after { content: ''; position: absolute; top: 2px; width: 1.2px; height: 5px;
  background: rgba(90, 83, 64, .45); }
.rail::before { left: 3px; }
.rail::after { right: 3px; }

.cord { position: relative; display: block; width: 32px; height: 11px; margin: 0 auto; }
.cord::before, .cord::after { content: ''; position: absolute; top: 0; width: 1px; height: 12px;
  background: rgba(90, 83, 64, .58); transform-origin: top; }
.cord::before { left: 2px; transform: rotate(11deg); }
.cord::after { right: 2px; transform: rotate(-11deg); }

/* 一行只放十三个字：话再长也排成两行，后头收成省略号，牌子不横穿整片田 */
.board { position: relative; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2;
  width: max-content; max-width: min(calc(13.6em + 26px), 68vw); overflow: hidden;
  padding: 3px 13px 5px; color: #FBF7EE; background: #8B6B4A; transform: rotate(-1.4deg);
  white-space: normal; overflow-wrap: anywhere; text-align: left;
  border-radius: 4px 10px 5px 9px / 9px 4px 10px 5px;
  box-shadow: inset 0 0 0 1.2px rgba(255, 253, 244, .22), inset 0 -3px 7px rgba(63, 48, 32, .3);
  font-weight: 400; font-family: var(--pen-fam, var(--font-main));
  letter-spacing: var(--pen-sp, .02em); font-size: var(--fs-base); line-height: 1.5; }
.board::before { content: ''; position: absolute; inset: 0; border-radius: inherit; opacity: .28;
  background: repeating-linear-gradient(92deg, rgba(63, 48, 32, .35) 0 1px, transparent 1px 7px); }
</style>
