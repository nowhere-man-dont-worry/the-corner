// Draws a pixel-art avatar as an SVG string.
//
// Takes an object describing the character:
//   { hair: 'mop', hairColor: '#3d2a1f', skin: '#f5c9a0',
//     top: '#c589e8', bottom: '#241b2e' }
//
// Backwards-compat: in some seed data `hair` holds a color hex instead of a
// style name. We detect that and fall back to the 'mop' shape.

import { hairStyles } from './hair/index.js';

function safeColor(c) {
  return typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c) ? c : '#9a8ca8';
}

export function avatarSVG(a, scale = 72) {
  const h = (scale * 1.5) | 0;
  const H = safeColor(a.hairColor || a.hair);
  const S = safeColor(a.skin);
  const T = safeColor(a.top);
  const B = safeColor(a.bottom);

  const shapeKey =
    a.hair && typeof a.hair === 'string' && !a.hair.startsWith('#') ? a.hair : 'mop';
  const hairShape = (hairStyles[shapeKey] || hairStyles.mop).shape(H);

  return `<svg width="${scale}" height="${h}" viewBox="0 0 20 30" shape-rendering="crispEdges">
    ${hairShape}
    <rect x="6" y="7" width="8" height="5" fill="${S}"/>
    <rect x="8" y="9" width="1" height="1" fill="#1a1420"/>
    <rect x="11" y="9" width="1" height="1" fill="#1a1420"/>
    <rect x="9" y="11" width="2" height="1" fill="#8a4a3d"/>
    <rect x="4" y="12" width="12" height="9" fill="${T}"/>
    <rect x="3" y="13" width="2" height="6" fill="${T}"/>
    <rect x="15" y="13" width="2" height="6" fill="${T}"/>
    <rect x="3" y="19" width="2" height="2" fill="${S}"/>
    <rect x="15" y="19" width="2" height="2" fill="${S}"/>
    <rect x="6" y="21" width="3" height="7" fill="${B}"/>
    <rect x="11" y="21" width="3" height="7" fill="${B}"/>
    <rect x="5" y="28" width="4" height="2" fill="#f2e8d5"/>
    <rect x="11" y="28" width="4" height="2" fill="#f2e8d5"/>
  </svg>`;
}
