<script setup>
// 底纹：旧信纸上若有若无的远山与水痕，只在最底下慢慢呼气
</script>

<template>
  <svg class="veil" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <g class="far">
      <path d="M0 470 C 90 452, 150 402, 232 386 C 300 372, 340 418, 404 404 C 470 390, 512 336, 586 330
               C 660 324, 700 380, 772 372 C 846 364, 884 306, 962 302 C 1040 298, 1080 358, 1154 352
               C 1230 346, 1276 296, 1352 300 C 1400 302, 1424 322, 1440 336"/>
      <path d="M0 470 C 120 486, 240 470, 360 480 C 520 494, 640 470, 800 482 C 960 494, 1120 470, 1280 484
               C 1360 490, 1410 486, 1440 482"/>
    </g>
    <g class="mid">
      <path d="M0 606 C 110 590, 176 540, 268 528 C 356 516, 402 566, 494 560 C 588 554, 634 496, 736 494
               C 840 492, 886 552, 984 548 C 1082 544, 1136 490, 1236 496 C 1330 502, 1382 552, 1440 546"/>
      <path d="M0 608 C 160 626, 320 604, 480 618 C 660 634, 820 606, 1000 622 C 1160 636, 1300 612, 1440 626"/>
    </g>
    <g class="near">
      <path d="M0 742 C 130 730, 210 690, 330 684 C 450 678, 520 720, 640 716 C 760 712, 840 668, 960 672
               C 1080 676, 1170 720, 1290 714 C 1370 710, 1410 692, 1440 686"/>
    </g>
    <g class="water">
      <path d="M60 812 C 150 806, 240 816, 330 810"/>
      <path d="M420 838 C 540 830, 660 844, 790 836"/>
      <path d="M880 808 C 970 802, 1060 812, 1150 806"/>
      <path d="M1180 852 C 1270 846, 1340 856, 1410 850"/>
      <path d="M140 866 C 260 858, 380 872, 500 864"/>
    </g>
  </svg>
</template>

<style scoped>
.veil {
  position: fixed; inset: 0; width: 100%; height: 100%;
  z-index: -1; pointer-events: none;
  fill: none; stroke: #5A5340; stroke-width: 2.4; stroke-linecap: round;
}
.veil g { animation: breathe 14s ease-in-out infinite; }
.far { opacity: .05; }
.mid { opacity: .055; animation-delay: -4s; }
.near { opacity: .06; animation-delay: -8s; }
.water { opacity: .07; stroke-width: 1.8; animation-delay: -11s; }
</style>
