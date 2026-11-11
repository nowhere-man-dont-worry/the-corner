// Members — grid of everyone in the class, from the profiles table.

import { state } from '../core/state.js';
import { avatarSVG } from '../avatars/render.js';
import { escapeHtml } from '../utils/html.js';
import { flagHTML, countryName } from '../core/countries.js';
import { onlineUserIds } from '../core/presence.js';
import { saveProfile } from '../core/profile.js';
import { loadMyMatch } from '../core/matcher.js';
import { toast } from '../core/toast.js';

let filter = 'all';   // 'all' | 'online' | a profile tag like 'MUSICIAN'
let query = '';

// Chip labels for the profile tags (the allow-list in prof_tags_allowed).
const TAG_CHIPS = {
  OPEN: 'Open to hangs', DEFENSE: 'Defense partners', MUSICIAN: 'Musicians', COOKS: 'Cooks',
  FRANCOPHONE: 'Francophone', NEW: 'New in Paris', GUIDE: 'Guides', COUNCIL: 'Council',
};

function matchesQuery(p, q) {
  if (!q) return true;
  const hay = [p.display_name, p.handle, p.country_code, p.country_code ? countryName(p.country_code) : '',
    p.locality, p.bio, ...(p.tags || []), ...(p.tags || []).map((t) => TAG_CHIPS[t] || '')]
    .filter(Boolean).join(' ').toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}

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
      <div class="mem-tools">
        <label class="search" for="mem-search">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="6" cy="6" r="4" stroke="#9a8ca8" stroke-width="1.5"/><path d="M9 9l3 3" stroke="#9a8ca8" stroke-width="1.5" stroke-linecap="round"/></svg>
          <input id="mem-search" type="search" placeholder="name, country, interest…" aria-label="Search members"/>
        </label>
        <div class="mem-chip-row" id="mem-chips" role="group" aria-label="Filter members"></div>
      </div>
    </div>

    <div class="page-wrap">
      <div class="mem-grid" id="mem-grid"></div>
      <div class="match-card" id="match-card"></div>
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
  const tagCounts = {};
  for (const p of profiles) for (const t of p.tags || []) tagCounts[t] = (tagCounts[t] || 0) + 1;
  if (TAG_CHIPS[filter] && !tagCounts[filter]) filter = 'all';
  chips.innerHTML = [
    ['all', `All · ${profiles.length}`],
    ['online', `Online now · ${onlineCount}`],
    ...Object.keys(TAG_CHIPS).filter((t) => tagCounts[t]).map((t) => [t, `${TAG_CHIPS[t]} · ${tagCounts[t]}`]),
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
  const profiles = all
    .filter((p) => filter === 'all' || (filter === 'online' ? online.has(p.user_id) : (p.tags || []).includes(filter)))
    .filter((p) => matchesQuery(p, query));
  if (all.length && !profiles.length) {
    const why = query ? `Nobody matches “${escapeHtml(query)}”${filter !== 'all' ? ' with that filter' : ''}.`
      : filter === 'online' ? 'Nobody else is online right now.' : 'Nobody in that group yet.';
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">${why}</div>`;
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

// ---- weekly matcher ----
let myMatch = null;

function personChip(userId) {
  const p = (state.profiles || []).find((x) => x.user_id === userId);
  const name = p?.display_name || (p ? '@' + p.handle : 'a classmate');
  const look = p ? { hair: p.hair, hairColor: p.hair_color, skin: p.skin, top: p.top, bottom: p.bottom } : {};
  return `<span class="match-person" title="${escapeHtml(name)}">${avatarSVG(look, 28)}${flagHTML(p?.country_code)}<span class="author-name">${escapeHtml(name)}</span></span>`;
}

export function renderMatcher() {
  const card = document.getElementById('match-card');
  if (!card) return;
  if (!state.auth) { card.hidden = true; return; }
  card.hidden = false;
  const optedIn = !!state.profile?.matcher_opt_in;
  let status;
  if (myMatch && myMatch.user_ids.length) {
    status = `<div class="match-status">This week you're with ${myMatch.user_ids.map(personChip).join('')}</div>`;
  } else if (!optedIn) {
    status = `<div class="match-status muted">You're not in the matcher. Opt in and you'll be put in a group of three every Sunday at 18:00 (Paris).</div>`;
  } else {
    status = `<div class="match-status muted">You're in. No match yet — the next draw is Sunday at 18:00 (Paris).</div>`;
  }
  card.innerHTML = `
    <div style="min-width:0;flex:1">
      <div class="page-key" style="color:var(--butter)">◉ CLASSMATE MATCHER · WEEKLY</div>
      <div style="font-size:14px;color:var(--body);line-height:1.45">Every Sunday everyone who opted in gets shuffled into groups of three for a coffee. Opt out any time.</div>
      ${status}
    </div>
    <button class="match-btn ${optedIn ? 'on' : ''}" data-match role="switch" aria-checked="${optedIn}">${optedIn ? "✓ I'm in" : "I'm in"}</button>`;
  card.querySelector('[data-match]').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    const saved = await saveProfile({ matcher_opt_in: !optedIn });
    btn.disabled = false;
    if (!saved) { toast("Couldn't save that — try again."); return; }
    toast(!optedIn ? "You're in for Sunday's draw." : "You're out of the matcher.");
    renderMatcher();
  });
}

export async function refreshMatcher() {
  myMatch = await loadMyMatch();
  renderMatcher();
}

export function initMembers() {
  const root = document.querySelector('.subview[data-sub="members"]');
  root.querySelector('#mem-search').addEventListener('input', (e) => { query = e.target.value.trim(); renderMembers(); });
  renderMembers();
  renderMatcher();
  if (state.auth) refreshMatcher();
}
