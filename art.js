// 圖示與 Q 版小月亮吉祥物（全部用 SVG 畫，不需要外部圖片）

const svg = (inner, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

export const ICON = {
  // 底部選單
  people: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle class="pulse" cx="18.5" cy="7.5" r="2.6" fill="currentColor" stroke="none"/>'),
  gallery: svg('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="9" r="1.8"/><path d="M21 16l-5-5-9 9"/>'),
  bubble: svg('<path d="M4 5h16v11H9.5L4 20.5z"/><g class="waves"><circle cx="9" cy="10.5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="10.5" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="10.5" r="1" fill="currentColor" stroke="none"/></g>'),
  bell: svg('<path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15z"/><path d="M10 21a2.2 2.2 0 0 0 4 0"/>'),
  user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>'),
  // 其他
  pen: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
  heart: svg('<path d="M12 20s-7-4.4-9-9a4.6 4.6 0 0 1 9-2.6A4.6 4.6 0 0 1 21 11c-2 4.6-9 9-9 9z"/>', 'heart'),
  comment: svg('<path d="M4 5h16v11H9.5L4 20.5z"/>'),
  more: svg('<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>'),
  camera: svg('<rect x="3" y="7" width="18" height="13" rx="3"/><path d="M8.5 7l1.8-3h3.4l1.8 3"/><circle cx="12" cy="13.5" r="3.5"/>'),
  video: svg('<rect x="2.5" y="6" width="13" height="12" rx="2.5"/><path d="M15.5 10.5 21.5 7v10l-6-3.5z"/>'),
  play: svg('<path d="M8 5v14l11-7z" fill="currentColor"/>'),
  plane: svg('<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>'),
};

// 小月亮：pose = hello | torch(載入中，拿星星魔杖) | sleep | shield | lock
export function mascot(pose = 'hello', size = '') {
  const eyesOpen = `<g class="eyes">
      <ellipse cx="57" cy="74" rx="6" ry="7.5" fill="#3a2a1a"/><ellipse cx="83" cy="74" rx="6" ry="7.5" fill="#3a2a1a"/>
      <circle cx="59" cy="71" r="2.2" fill="#fff"/><circle cx="85" cy="71" r="2.2" fill="#fff"/></g>`;
  const eyesSleep = `<path d="M50 75q7 6 14 0M76 75q7 6 14 0" stroke="#3a2a1a" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
  const mouth = pose === 'sleep'
    ? `<ellipse cx="70" cy="90" rx="3" ry="2.4" fill="#c46a5a"/>`
    : `<path d="M63 87q7 7 14 0" stroke="#3a2a1a" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  const armL = `<ellipse cx="24" cy="92" rx="8" ry="12" fill="#ffcf5c" transform="rotate(30 24 92)"/>`;
  const armR = `<ellipse cx="116" cy="92" rx="8" ry="12" fill="#ffcf5c" transform="rotate(-30 116 92)"/>`;

  let extraBack = '', extraFront = '', rightArm = `<g class="wing-r">${armR}</g>`, leftArm = `<g class="wing-l">${armL}</g>`;
  if (pose === 'hello') rightArm = `<g class="wing-r wave">${armR}</g>`;
  if (pose === 'torch') {
    rightArm = `<g class="torch">
      <path d="M118 82 138 50" stroke="#c99a3a" stroke-width="4" stroke-linecap="round"/>
      <path d="M139 36l3.6 7.4 8.2 1.2-5.9 5.8 1.4 8.1-7.3-3.8-7.3 3.8 1.4-8.1-5.9-5.8 8.2-1.2z" fill="#fff3b0" stroke="#f5b942" stroke-width="2" stroke-linejoin="round"/>
      <circle class="spark" cx="152" cy="34" r="2" fill="#fff"/><circle class="spark s2" cx="128" cy="32" r="1.6" fill="#fff"/>
      <ellipse cx="116" cy="84" rx="8" ry="12" fill="#ffcf5c" transform="rotate(30 116 84)"/></g>`;
  }
  if (pose === 'shield') {
    extraFront = `<g class="hold"><path d="M12 82l16-6 16 6v12c0 11-8 18-16 21-8-3-16-10-16-21z" fill="#3d7bd9" stroke="#fff" stroke-width="2.5"/>
      <path d="M28 86v12" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="28" cy="105" r="2.6" fill="#fff"/></g>`;
    leftArm = '';
  }
  if (pose === 'lock') {
    extraFront = `<g class="hold"><path d="M106 90v-8a10 10 0 0 1 20 0v8" stroke="#c9d2e6" stroke-width="5" fill="none"/>
      <rect x="100" y="89" width="32" height="26" rx="5" fill="#7c5cff"/><circle cx="116" cy="100" r="3.5" fill="#fff"/><rect x="114.5" y="101" width="3" height="8" rx="1.5" fill="#fff"/></g>`;
    rightArm = '';
  }
  if (pose === 'sleep') {
    extraBack = `<text class="z z1" x="112" y="34" font-size="16" font-weight="800" fill="#c9d2e6">Z</text>
      <text class="z z2" x="124" y="22" font-size="12" font-weight="800" fill="#c9d2e6">z</text>`;
  }

  return `<svg class="mascot ${size} pose-${pose}" viewBox="0 0 160 136" aria-hidden="true">
    <defs><radialGradient id="moonG" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#fff6cf"/><stop offset=".6" stop-color="#ffe08a"/><stop offset="1" stop-color="#f7c95a"/></radialGradient></defs>
    ${extraBack}
    <ellipse cx="70" cy="128" rx="30" ry="4.5" fill="rgba(0,0,0,.28)"/>
    <g class="owl">
      <circle cx="70" cy="74" r="54" fill="#ffe08a" opacity=".14"/>
      ${leftArm}
      <circle cx="70" cy="74" r="44" fill="url(#moonG)"/>
      <circle cx="46" cy="52" r="6" fill="#f2c45a" opacity=".55"/><circle cx="96" cy="56" r="4" fill="#f2c45a" opacity=".55"/>
      <circle cx="92" cy="104" r="7" fill="#f2c45a" opacity=".5"/><circle cx="44" cy="100" r="3.5" fill="#f2c45a" opacity=".5"/>
      ${pose === 'sleep' ? eyesSleep : eyesOpen}
      ${mouth}
      <circle cx="47" cy="86" r="5" fill="#ff8fa0" opacity=".55"/><circle cx="93" cy="86" r="5" fill="#ff8fa0" opacity=".55"/>
      <path d="M86 26l2.4 5 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z" fill="#ff8fa0"/>
      ${rightArm}
      ${extraFront}
    </g>
  </svg>`;
}
