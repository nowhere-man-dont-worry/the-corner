// Members — grid of everyone in the class, from the profiles table.

import { state } from '../core/state.js';
import { avatarSVG } from '../avatars/render.js';
import { escapeHtml } from '../utils/html.js';
import { flagHTML, countryName } from '../core/countries.js';
import { onlineUserIds } from '../core/presence.js';

let filter = 'all';   // 'all' | 'online'

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
      <div class="mem-chip-row" id="mem-chips" role="group" aria-label="Filter members"></div>
    </div>

    <div class="page-wrap">
      <div class="mem-grid" id="mem-grid"></div>
    </div>
  </div>
`;

function renderHeader(profiles, online) {
  const key = document.getElementById('mem-key');
  if (key) {
    const countries = new Set(profiles.map((p) => p.country_code).filter(Boolean)).size;
    key.textContent = `MSCI 1 · ${profiles.length} OF US · ${countries} ${countries === 1 ? 'COUNTRY' : 'COUNTRIES'}`;
  }
  const chips = document.getElementById('mem-chips');
  if (!chips) return;
  const onlineCount = profiles.filter((p) => online.has(p.user_id)).length;
  chips.innerHTML = [
    ['all', `All · ${profiles.length}`],
    ['online', `Online now · ${onlineCount}`],
  ].map(([k, label]) => `<button class="chip ${filter === k ? 'on' : ''}" data-filter="${k}" aria-pressed="${filter === k}">${label}</button>`).join('');
  chips.querySelectorAll('[data-filter]').forEach((b) =>
    b.addEventListener('click', () => { filter = b.dataset.filter; renderMembers(); })
  );
}

export function renderMembers() {
  const grid = document.getElementById('mem-grid');
  if (!grid) return;
  const all = state.profiles || [];
  const online = onlineUserIds();
  renderHeader(all, online);
  const profiles = filter === 'online' ? all.filter((p) => online.has(p.user_id)) : all;
  if (all.length && !profiles.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1">Nobody else is online right now.</div>';
    return;
  }
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
        ${online.has(p.user_id) ? '<span class="who-dot" title="online now" aria-label="online now"></span>' : ''}
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
