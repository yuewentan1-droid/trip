<script setup>
// 手绘线条的“呼吸”： turbulence 位移图 + 逐帧换 seed，碳素笔的抖动就靠它
// 全页挂一份即可（App.vue），各处用 filter:url(#boil) 复用
</script>

<template>
  <svg class="defs" width="0" height="0" aria-hidden="true">
    <filter id="boil" x="-24%" y="-24%" width="148%" height="148%">
      <feTurbulence type="fractalNoise" baseFrequency="0.055" numOctaves="2" seed="1" result="n">
        <animate attributeName="seed" values="1;2;3;4;5;6" dur="0.94s" repeatCount="indefinite" calcMode="discrete"/>
      </feTurbulence>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="boil-soft" x="-14%" y="-14%" width="128%" height="128%">
      <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="4" result="n">
        <animate attributeName="seed" values="4;5;6;7" dur="1.7s" repeatCount="indefinite" calcMode="discrete"/>
      </feTurbulence>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="ink-blot" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="11" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <!-- 落在字上的那点墨渣：颗粒极细又不动，只让笔画毛一点，不许把字推糊 -->
    <filter id="ink-grain" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="1.1" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </svg>
</template>

<style scoped>
.defs { position: absolute; pointer-events: none; }
</style>
