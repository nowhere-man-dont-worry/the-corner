// Members — grid of everyone in the class, from the profiles table.

import { state } from '../core/state.js';
import { avatarSVG } from '../avatars/render.js';
import { escapeHtml } from '../utils/html.js';
import { flagHTML, countryName } from '../core/countries.js';

// "[flag] Pakistan → Vitry-Sur-Seine", "[flag] Pakistan", or "" with no
// country. Returns HTML: the flag is an image span, the text is escaped.
function originLine(p) {
  const flag = flagHTML(p.country_code);
  if (!flag) return '';
  const base = `${flag} ${escapeHtml(countryName(p.country_code))}`;
  return p.locality ? `${base} → ${escapeHtml(p.locality)}` : base;
}

export const membersHTML = `
  <div class="page">
    <div class="page-head">
      <div class="mem-head-row">
        <div>
          <div class="page-key" id="mem-key">MSCI 1</div>
          <h1 class="page-title">Who's in the <span class="accent">corner</span>.</h1>
        </div>
      </div>
    </div>

    <div class="page-wrap">
      <div class="mem-grid" id="mem-grid"></div>
    </div>
  </div>
`;

export function renderMembers() {
  const grid = document.getElementById('mem-grid');
  if (!grid) return;
  const profiles = state.profiles || [];
  if (profiles.length === 0) {
    grid.innerHTML = '<div style="padding:40px 20px;text-align:center;color:var(--muted);font-style:italic;grid-column:1/-1">No members yet — sign in and you’re the first.</div>';
    return;
  }
  grid.innerHTML = profiles.map(p => {
    const isMe = state.auth && p.user_id === state.auth.id;
    const name = p.display_name || p.handle;
    const tags = p.tags || [];
    return `
      <div class="mcard ${isMe ? 'me' : ''}">
        ${avatarSVG({ hair: p.hair || 'mop', hairColor: p.hair_color, skin: p.skin, top: p.top, bottom: p.bottom }, 72)}
        <div class="mcard-name" title="${escapeHtml(name)}">${escapeHtml(name)}</div>
        <div class="mcard-origin">${originLine(p)}</div>
        <div class="mcard-bio">${p.bio ? '"' + escapeHtml(p.bio) + '"' : ''}</div>
        <div class="mcard-tags">
          ${isMe ? '<span class="mcard-tag you">YOU</span>' : ''}
          ${tags.map(t => `<span class="mcard-tag">${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>
    `;
  }).join('');
}

export function initMembers() {
  renderMembers();
}
