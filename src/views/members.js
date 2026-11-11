// Members — grid of everyone in the class + weekly matcher opt-in.

import { state } from '../core/state.js';
import { toast } from '../core/toast.js';
import { avatarSVG } from '../avatars/render.js';
import { escapeHtml } from '../utils/html.js';
import { flagOf, countryName } from '../core/countries.js';

// "🇵🇰 Pakistan → Vitry-Sur-Seine", "🇵🇰 Pakistan", or "" with no country.
function originLine(p) {
  if (!p.country_code) return '';
  const base = `${flagOf(p.country_code)} ${countryName(p.country_code)}`;
  return p.locality ? `${base} → ${p.locality}` : base;
}

export const membersHTML = `
  <div class="page">
    <div class="page-head">
      <div class="mem-head-row">
        <div>
          <div class="page-key">MSCI 1 · 28 OF US · 11 COUNTRIES · 1 CLASS</div>
          <h1 class="page-title">Who's in the <span class="accent">corner</span>.</h1>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <div class="search">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4" stroke="#9a8ca8" stroke-width="1.5"/><path d="M9 9l3 3" stroke="#9a8ca8" stroke-width="1.5" stroke-linecap="round"/></svg>
            <input placeholder="name, country, interest…"/>
          </div>
          <button class="btn btn-ghost" data-matcher style="padding:9px 14px;font-size:13px">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 1v10m6-10v10M1 3h10M1 9h10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
            classmate matcher
          </button>
        </div>
      </div>
      <div class="mem-chip-row">
        <button class="chip on">All · 28</button>
        <button class="chip">Online now · 14</button>
        <button class="chip">Open to hangs</button>
        <button class="chip">Looking for defense partners</button>
        <button class="chip">Musicians</button>
        <button class="chip">Cooks</button>
        <button class="chip">Francophone</button>
        <button class="chip">New in Paris</button>
      </div>
    </div>

    <div class="page-wrap">
      <div class="mem-grid" id="mem-grid"></div>
      <div class="match-card">
        <div style="min-width:0">
          <div class="page-key" style="color:var(--butter)">◉ CLASSMATE MATCHER · WEEKLY</div>
          <div style="font-size:14px;color:#c8bcaf;line-height:1.45">Every Sunday, 3 people from the class get randomly matched for a coffee. Opt in, opt out. Takes 20 seconds.</div>
        </div>
        <button class="match-btn" data-match>I'm in for Sunday</button>
      </div>
    </div>
  </div>
`;

export function renderMembers() {
  const grid = document.getElementById('mem-grid');
  if (!grid) return;
  const profiles = state.profiles || [];
  if (profiles.length === 0) {
    grid.innerHTML = '<div style="padding:40px 20px;text-align:center;color:var(--muted);font-style:italic;grid-column:1/-1">no one has signed in yet. be first.</div>';
    return;
  }
  grid.innerHTML = profiles.map(p => {
    const isMe = state.auth && p.user_id === state.auth.id;
    const name = p.display_name || p.handle;
    const tags = p.tags || [];
    return `
      <div class="mcard ${isMe ? 'me' : ''}">
        <span class="who-dot"></span>
        ${avatarSVG({ hair: p.hair || 'mop', hairColor: p.hair_color, skin: p.skin, top: p.top, bottom: p.bottom }, 72)}
        <div class="mcard-name">${escapeHtml(name)}</div>
        <div class="mcard-origin">${escapeHtml(originLine(p))}</div>
        <div class="mcard-bio">${p.bio ? '"' + escapeHtml(p.bio) + '"' : ''}</div>
        <div class="mcard-tags">
          ${isMe ? '<span class="mcard-tag you">YOU</span>' : ''}
          ${tags.map(t => `<span class="mcard-tag">${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function toggleMatch() {
  state.matched = !state.matched;
  const b = document.querySelector('[data-match]');
  b.classList.toggle('on', state.matched);
  b.textContent = state.matched ? "✓ You're in" : "I'm in for Sunday";
  toast(
    state.matched
      ? "In! You'll be matched Sunday 20:00."
      : "You're out of this Sunday's match."
  );
}

export function initMembers() {
  const root = document.querySelector('.subview[data-sub="members"]');
  root.querySelector('[data-matcher]').addEventListener('click', () =>
    toast('Classmate matcher opens Sunday 20:00.')
  );
  root.querySelector('[data-match]').addEventListener('click', toggleMatch);
  renderMembers();
}
