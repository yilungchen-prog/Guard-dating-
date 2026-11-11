// 圖示與 Q 版貓頭鷹吉祥物（全部用 SVG 畫，不需要外部圖片）

const svg = (inner, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

export const ICON = {
  // 底部選單
  radar: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><g class="sweep"><path d="M12 12 18.4 5.6"/></g><circle cx="15.5" cy="15" r="1.4" fill="currentColor" stroke="none"/>'),
  logbook: svg('<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M9 3v18"/><path d="M12 8h4M12 12h4M12 16h2"/>'),
  walkie: svg('<rect x="7" y="8" width="10" height="13" rx="2.5"/><path d="M10 8V2.5"/><path d="M10 12h4M10 15h4M10 18h4"/><path class="waves" d="M13 4.2a2.6 2.6 0 0 1 2.2 1.4M13.4 1.6a5 5 0 0 1 4 2.6"/>'),
  whistle: svg('<circle cx="8.5" cy="14" r="5"/><path d="M11.5 10H21v4h-6.5"/><circle cx="8.5" cy="14" r="1.4" fill="currentColor" stroke="none"/><path d="M6 9 4 5.5"/>'),
  cap: svg('<path d="M5 14a7 7 0 0 1 14 0z"/><path d="M3 14h12c3.5 0 6 1.2 6.5 3H7c-2.4 0-4-1.2-4-3z"/><circle cx="12" cy="10" r="1.3" fill="currentColor" stroke="none"/>'),
  // 其他
  heart: svg('<path d="M12 20s-7-4.4-9-9a4.6 4.6 0 0 1 9-2.6A4.6 4.6 0 0 1 21 11c-2 4.6-9 9-9 9z"/>', 'heart'),
  comment: svg('<path d="M4 5h16v11H9.5L4 20.5z"/>'),
  more: svg('<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>'),
  camera: svg('<rect x="3" y="7" width="18" height="13" rx="3"/><path d="M8.5 7l1.8-3h3.4l1.8 3"/><circle cx="12" cy="13.5" r="3.5"/>'),
  plane: svg('<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>'),
};

// 貓頭鷹保全：pose = hello | torch | sleep | shield | lock
export function mascot(pose = 'hello', size = '') {
  const eyesOpen = `<g class="eyes">
      <circle cx="56" cy="64" r="13" fill="#fff"/><circle cx="84" cy="64" r="13" fill="#fff"/>
      <circle cx="57.5" cy="65" r="6.5" fill="#1b2238"/><circle cx="82.5" cy="65" r="6.5" fill="#1b2238"/>
      <circle cx="60" cy="62" r="2.3" fill="#fff"/><circle cx="85" cy="62" r="2.3" fill="#fff"/></g>`;
  const eyesSleep = `<path d="M46 65q10 7 20 0M74 65q10 7 20 0" stroke="#1b2238" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
  const wingL = `<ellipse cx="36" cy="92" rx="10" ry="20" fill="#7a5638" transform="rotate(15 36 92)"/>`;
  const wingR = `<ellipse cx="104" cy="92" rx="10" ry="20" fill="#7a5638" transform="rotate(-15 104 92)"/>`;

  let extraBack = '', extraFront = '', rightWing = `<g class="wing-r">${wingR}</g>`, leftWing = `<g class="wing-l">${wingL}</g>`;
  if (pose === 'hello') rightWing = `<g class="wing-r wave">${wingR}</g>`;
  if (pose === 'torch') {
    rightWing = `<g class="torch">
      <polygon points="122,82 158,58 158,112" fill="url(#beam)"/>
      <rect x="106" y="78" width="18" height="9" rx="2.5" fill="#3a4766"/><rect x="121" y="76" width="5" height="13" rx="1.5" fill="#f5b942"/>
      <ellipse cx="106" cy="86" rx="10" ry="17" fill="#7a5638" transform="rotate(-60 106 86)"/></g>`;
  }
  if (pose === 'shield') {
    extraFront = `<g class="hold"><path d="M28 80l16-6 16 6v12c0 11-8 18-16 21-8-3-16-10-16-21z" fill="#3d7bd9" stroke="#fff" stroke-width="2.5"/>
      <path d="M44 84v12" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="44" cy="103" r="2.6" fill="#fff"/></g>`;
    leftWing = '';
  }
  if (pose === 'lock') {
    extraFront = `<g class="hold"><path d="M94 88v-8a10 10 0 0 1 20 0v8" stroke="#c9d2e6" stroke-width="5" fill="none"/>
      <rect x="88" y="87" width="32" height="26" rx="5" fill="#f5b942"/><circle cx="104" cy="98" r="3.5" fill="#6b4d12"/><rect x="102.5" y="99" width="3" height="8" rx="1.5" fill="#6b4d12"/></g>`;
    rightWing = '';
  }
  if (pose === 'sleep') {
    extraBack = `<text class="z z1" x="104" y="34" font-size="16" font-weight="800" fill="#c9d2e6">Z</text>
      <text class="z z2" x="116" y="22" font-size="12" font-weight="800" fill="#c9d2e6">z</text>`;
  }

  return `<svg class="mascot ${size} pose-${pose}" viewBox="0 0 160 136" aria-hidden="true">
    <defs><linearGradient id="beam" x1="0" x2="1"><stop offset="0" stop-color="#ffe08a" stop-opacity=".75"/><stop offset="1" stop-color="#ffe08a" stop-opacity="0"/></linearGradient></defs>
    ${extraBack}
    <g class="owl">
      ${leftWing}
      <ellipse cx="70" cy="86" rx="36" ry="38" fill="#8a6545"/>
      <ellipse cx="70" cy="96" rx="23" ry="25" fill="#f2dfc0"/>
      <path d="M61 92q4.5 3 9 0q4.5 3 9 0M59 103q5.5 3 11 0q5.5 3 11 0" stroke="#d9bf95" stroke-width="2" fill="none"/>
      <ellipse cx="70" cy="66" rx="31" ry="21" fill="#a37b55"/>
      ${pose === 'sleep' ? eyesSleep : eyesOpen}
      <path d="M65.5 74l4.5 6.5 4.5-6.5z" fill="#f5b942"/>
      <circle cx="46" cy="77" r="4.2" fill="#ff9aa2" opacity=".6"/><circle cx="94" cy="77" r="4.2" fill="#ff9aa2" opacity=".6"/>
      <g transform="translate(0,-9)">
        <path d="M40 51q0-25 30-25t30 25z" fill="#24345c"/>
        <rect x="38" y="47" width="64" height="7" rx="3.5" fill="#1a2747"/>
        <path d="M42 53q28 8 56 0l3 2q-31 11-62 0z" fill="#121b33"/>
        <path d="M70 31l5 3.5v6l-5 3-5-3v-6z" fill="#f5b942"/>
      </g>
      ${rightWing}
      ${extraFront}
      <ellipse cx="60" cy="124" rx="7" ry="3.5" fill="#f5b942"/><ellipse cx="80" cy="124" rx="7" ry="3.5" fill="#f5b942"/>
    </g>
  </svg>`;
}
