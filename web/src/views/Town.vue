<script setup>
import BackVine from '../components/BackVine.vue';
</script>

<template>
  <div class="town">
    <BackVine/>
    <header class="t-head">
      <div class="t-inner">
        <h1>进城</h1>
        <p class="t-sub">—— 城门还掩着，城里在拾掇</p>
      </div>
    </header>

    <main class="t-main roll">
      <div class="t-inner t-center">
        <svg class="gate" viewBox="0 0 260 170" fill="none" aria-hidden="true">
          <g class="ink">
            <path class="far" d="M4 92 C 22 84, 44 84, 60 92 M200 92 C 218 84, 240 84, 256 92"/>
            <path class="roof" d="M22 72 C 54 50, 88 42, 130 42 C 172 42, 206 50, 238 72"/>
            <path class="roof" d="M40 68 C 74 54, 102 48, 130 48 C 158 48, 186 54, 220 68"/>
            <path class="roof" d="M22 72 C 14 70, 9 65, 6 58 M238 72 C 246 70, 251 65, 254 58"/>
            <path class="ridge" d="M54 84 C 88 68, 172 68, 206 84"/>
            <path class="tile" d="M92 62 C 96 57, 102 53, 108 51 M152 51 C 158 53, 164 57, 168 62"/>
            <path class="plaque" d="M103 68 C 120 65, 140 65, 157 68 L155 86 C 139 89, 121 89, 105 86 Z"/>
            <circle class="pin" cx="111" cy="77" r="1.2"/><circle class="pin" cx="149" cy="77" r="1.2"/>
            <path class="post" d="M62 86 C 60 108, 62 130, 61 154"/>
            <path class="post" d="M198 86 C 200 108, 198 130, 199 154"/>
            <path class="door" d="M81 88 C 79 110, 81 132, 80 154"/>
            <path class="door" d="M179 88 C 181 110, 179 132, 180 154"/>
            <path class="door" d="M81 88 C 110 86, 150 86, 179 88"/>
            <path class="door" d="M80 154 C 100 152, 121 153, 128.5 153"/>
            <path class="door" d="M131.5 153 C 139 153, 160 152, 180 154"/>
            <path class="door" d="M128 88 C 129 110, 128 132, 129 153"/>
            <path class="door" d="M132 88 C 133 110, 132 132, 131 153"/>
            <circle class="ring" cx="119" cy="121" r="3.2"/><circle class="ring" cx="141" cy="121" r="3.2"/>
            <path class="step" d="M64 154 C 100 157, 160 157, 196 154"/>
            <path class="string" d="M204 68 C 205 74, 203 79, 204 84"/>
            <path class="lantern" d="M196 84 C 199 80, 209 80, 212 84 C 213 91, 209 96, 204 96 C 199 96, 195 91, 196 84 Z"/>
            <path class="tuft" d="M46 156 C 45 151, 44 148, 42 145 M50 156 C 50 151, 51 148, 53 145 M55 156 C 56 152, 58 150, 61 148"/>
            <path class="tuft" d="M207 156 C 206 151, 205 148, 203 145 M212 156 C 212 151, 213 148, 215 145"/>
            <path class="vine" d="M62 140 C 72 132, 76 120, 72 108 C 68 96, 74 88, 84 86"/>
            <path class="leaf" d="M73 120 C 67 117, 63 118, 60 122 C 65 124, 70 123, 73 120 Z"/>
            <path class="leaf" d="M70 100 C 65 96, 61 96, 58 99 C 62 102, 66 102, 70 100 Z"/>
          </g>
        </svg>

        <p class="t-say">城门口刚挂上木牌。</p>
        <p class="t-soft">门闩还没落，檐下也还没点灯。等摊子支起来，再请你进城坐坐。</p>
        <p class="t-tag">待开放 · 敬请期待</p>
        <router-link class="t-back" to="/">先回原野</router-link>
      </div>
    </main>
  </div>
</template>

<style scoped>
.town { position: relative; height: 100vh; height: 100dvh; display: flex; flex-direction: column;
  overflow: hidden; padding-left: clamp(72px, 7vw, 112px); padding-bottom: env(safe-area-inset-bottom); }

.t-head { flex: none; min-height: 24vh; display: flex; flex-direction: column; justify-content: flex-end;
  padding: max(18px, env(safe-area-inset-top)) 0 14px; }
.t-inner { width: 100%; margin: 0 auto; padding: 0 max(24px, 4vw); }
h1 { font-size: var(--fs-hero); font-weight: 400; letter-spacing: 2px; color: var(--ink); }
.t-sub { margin-top: 2px; font-size: var(--fs-base); letter-spacing: 1px; color: var(--ink-soft); }

.t-main { flex: 1; min-height: 0; overflow-y: auto; }
.t-center { min-height: 100%; display: flex; flex-direction: column; align-items: center;
  justify-content: center; text-align: center; padding: 20px max(24px, 4vw) 7vh; }

.gate { width: clamp(220px, 40vw, 330px); height: auto; overflow: visible; margin-bottom: 16px; }
.gate .ink { filter: url(#boil-soft); }
.gate path { stroke: var(--wood); stroke-width: 1.5; stroke-linecap: round; opacity: .72; }
.gate .roof, .gate .ridge { stroke-width: 1.7; }
.gate .far { opacity: .34; stroke-width: 1.2; }
.gate .door, .gate .plaque { opacity: .58; }
.gate .tile { opacity: .4; stroke-width: 1.2; }
.gate .ring, .gate .lantern, .gate .string { stroke: var(--clay); opacity: .82; }
.gate .lantern { fill: color-mix(in srgb, var(--clay) 13%, transparent); }
.gate .pin { fill: var(--wood); stroke: none; opacity: .5; }
.gate .vine, .gate .tuft { stroke: var(--grass); opacity: .64; }
.gate .leaf { fill: var(--grass); stroke: none; opacity: .55; }

.t-say { font-size: var(--fs-read); line-height: 1.9; letter-spacing: 1px; color: var(--ink-soft); }
.t-soft { margin-top: 6px; font-size: var(--fs-sm); line-height: 2; letter-spacing: .06em; color: var(--ink-faint); }
.t-tag { margin-top: 18px; padding: 4px 12px 5px; font-size: var(--fs-sm); letter-spacing: .18em;
  color: var(--wood); background: color-mix(in srgb, var(--paper-2) 70%, transparent);
  border-radius: 3px 10px 4px 9px / 9px 4px 10px 5px;
  box-shadow: inset 0 0 0 1.2px rgba(150, 133, 100, .34); transform: rotate(-.8deg); }
body[data-night="1"] .t-tag { box-shadow: inset 0 0 0 1.2px rgba(148, 160, 176, .3); }
.t-back { margin-top: 22px; font-size: var(--fs-base); color: var(--wood); letter-spacing: 1px;
  text-decoration: underline wavy rgba(139, 107, 74, .65) 1px; text-underline-offset: 6px; }
.t-back:hover { color: var(--grass-deep); }

@media (max-width: 720px) {
  .town { padding-left: max(60px, env(safe-area-inset-left)); }
  .t-head { min-height: 18vh; padding: max(14px, env(safe-area-inset-top)) 0 14px; }
  .t-inner { padding: 0 max(14px, env(safe-area-inset-right)) 0 max(14px, env(safe-area-inset-left)); }
  .t-center { padding: 16px 14px 7vh; }
}
@media (max-width: 480px) {
  .t-head { min-height: 0; padding-bottom: 8px; }
  h1 { font-size: var(--fs-title); }
  .t-sub { font-size: var(--fs-sm); }
  .gate { width: 220px; }
}
</style>
