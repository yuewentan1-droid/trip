<script setup>
import scarecrow from '../assets/pastoral/scarecrow.svg';
import FestoonLights from './FestoonLights.vue';

defineProps({ count: { type: Number, default: 0 } });
defineEmits(['open']);
</script>

<template>
  <button class="field-fold" type="button" title="把收起的水滴展开" @click="$emit('open')">
    <span class="scare">
      <img class="scare-img" :src="scarecrow" alt=""/>
      <FestoonLights class="sc-lights" :count="11" :seed="7" :sag="9"/>
      <span class="sign">
        <span class="sg-num">{{ count }}<i>滴</i></span>
        <span class="sg-act">展开</span>
      </span>
    </span>
  </button>
</template>

<style scoped>
/* 收起来的时候田里只剩一个稻草人，胳膊张开，替人守着还没摊开的水滴 */
.field-fold { position: relative; display: block; width: 100%; max-width: 230px; margin: 0 auto;
  padding: 0; color: var(--ink); background: none; text-align: left;
  animation: foldIn .5s cubic-bezier(.22, .8, .26, 1) backwards; }
.scare { position: relative; display: block; }
.scare-img { display: block; width: 100%; height: auto; opacity: .88; mix-blend-mode: multiply;
  filter: sepia(.52) saturate(.85) contrast(1.03); transform-origin: 50% 100%;
  transition: transform .45s cubic-bezier(.22, .8, .26, 1), opacity .35s, filter .35s; }
.field-fold:hover .scare-img { transform: translateY(-2px) rotate(-.8deg); opacity: .96;
  filter: sepia(.66) saturate(.95) contrast(1.04); }
.field-fold:focus-visible { outline: 2px solid var(--ember); outline-offset: 5px; }
.sc-lights { inset: 13% -9% auto; height: 57%; z-index: 1; }
/* 天黑：稻草人退进暗里，彩灯替它亮着 */
body[data-night="1"] .scare-img { mix-blend-mode: normal; opacity: .78;
  filter: brightness(.72) sepia(.18) saturate(.78) contrast(.98); }
body[data-night="1"] .field-fold:hover .scare-img { filter: brightness(.82) sepia(.24) saturate(.86); }

/* 脚下钉一块木牌：收着几滴、点一下展开，字要站远也看得清 */
.sign { position: absolute; left: 50%; bottom: -3px; z-index: 2; display: flex; align-items: baseline;
  gap: 13px; width: max-content; min-width: 150px; padding: 9px 16px 10px;
  transform: translateX(-50%) rotate(-1.6deg); color: #FBF7EE;
  background: linear-gradient(95deg, #77583D, #9B7A53 45%, #846443);
  border-radius: 5px 10px 6px 9px / 9px 5px 10px 6px;
  box-shadow: inset 0 0 0 1.1px rgba(255, 253, 244, .18), inset 0 -4px 7px rgba(63, 48, 32, .28),
    0 4px 9px rgba(63, 48, 32, .17);
  transition: transform .35s, background .35s; }
.sign::before { content: ''; position: absolute; inset: 0; border-radius: inherit; opacity: .2;
  background: repeating-linear-gradient(93deg, rgba(63, 48, 32, .4) 0 1px, transparent 1px 9px); }
.sign::after { content: ''; position: absolute; left: 50%; top: -7px; width: 9px; height: 9px;
  margin-left: -4px; border-radius: 50%; background: #D9C79F;
  box-shadow: 0 1px 2px rgba(63, 48, 32, .35); }
.field-fold:hover .sign { transform: translateX(-50%) rotate(-.6deg) translateY(-2px);
  background: linear-gradient(95deg, #816044, #A6845C 45%, #8D6B49); }
.sg-num { font-size: clamp(calc(26px * var(--ui-scale)), 2.3vw, calc(32px * var(--ui-scale)));
  line-height: 1; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
.sg-num i { font-style: normal; font-size: calc(15px * var(--ui-scale)); letter-spacing: .08em; margin-left: 2px; }
.sg-act { font-size: calc(18px * var(--ui-scale)); letter-spacing: .12em; padding-bottom: 1px;
  border-bottom: 1px dashed rgba(255, 253, 244, .55); }
@keyframes foldIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
</style>
