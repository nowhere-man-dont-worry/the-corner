// Guide — hand-drawn Paris map + categories + place cards, backed by Supabase.
// Classmates add spots themselves; seed rows read "— class seed".

import { state } from '../core/state.js';
import { toast } from '../core/toast.js';
import { escapeHtml } from '../utils/html.js';
import { PLACE_CATEGORIES, getPlaces, loadPlaces, addPlace, deletePlace, subscribePlaces, canDeletePlace } from '../core/places.js';

export const guideHTML = `
  <div class="guide-grid">
    <aside class="guide-side">
      <div class="page-key">THE GUIDE</div>
      <h2 style="font-family:var(--display);font-weight:700;font-size:28px;line-height:1;margin:0 0 4px;letter-spacing:-0.03em">By us, <span class="accent">for us</span>.</h2>
      <div style="font-size:12px;color:var(--muted);margin-bottom:22px;line-height:1.4">Everything a classmate has vouched for.</div>

      <div class="page-key">CATEGORIES</div>
      <div id="cat-list" style="display:flex;flex-direction:column;gap:3px"></div>

    </aside>

    <main class="guide-mid">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;gap:12px">
        <div>
          <div class="page-key" id="cat-head">● FOOD</div>
          <div style="font-size:13px;color:var(--muted)" id="cat-blurb"></div>
        </div>
        <span id="add-spot-wrap">
          <button class="btn btn-primary" data-add style="padding:8px 13px;font-size:12px">+ Add a spot</button>
        </span>
      </div>

      <form id="add-spot-form" hidden style="margin-bottom:14px;padding:14px;border:1px solid var(--border);border-radius:12px;background:var(--surface)">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <select class="profile-input" id="spot-category"></select>
          <input class="profile-input" id="spot-name" placeholder="name *" maxlength="80" required/>
        </div>
        <input class="profile-input" id="spot-address" placeholder="address or area (optional)" maxlength="200" style="margin-top:8px"/>
        <textarea class="profile-ta" id="spot-tip" placeholder="your tip — why go, when, what to order (optional)" maxlength="400"></textarea>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
          <input class="profile-input" id="spot-lat" placeholder="lat (optional, e.g. 48.8606)" inputmode="decimal"/>
          <input class="profile-input" id="spot-long" placeholder="long (optional, e.g. 2.3522)" inputmode="decimal"/>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">
          <button type="button" class="btn btn-ghost" data-spot-cancel style="padding:7px 12px;font-size:12px">cancel</button>
          <button type="submit" class="btn btn-primary" style="padding:7px 12px;font-size:12px">add spot</button>
        </div>
      </form>

      <div class="map-stage">
        <svg viewBox="0 0 580 530" aria-hidden="true">
          <defs><pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="13" cy="13" r="0.8" fill="#3d3050"/></pattern></defs>
          <rect width="580" height="530" fill="url(#dots)"/>
          <circle cx="290" cy="265" r="155" fill="none" stroke="#3d3050" stroke-width="1" stroke-dasharray="2 5"/>
          <circle cx="290" cy="265" r="230" fill="none" stroke="#3d3050" stroke-width="1" stroke-dasharray="2 5" opacity="0.6"/>
          <path d="M 40 290 Q 140 200, 240 240 T 400 250 Q 480 260, 540 220" stroke="#4a90c7" stroke-width="9" fill="none" opacity="0.5" stroke-linecap="round"/>
          <path d="M 40 290 Q 140 200, 240 240 T 400 250 Q 480 260, 540 220" stroke="#6ab4d8" stroke-width="3" fill="none" stroke-linecap="round"/>
          <g font-family="VT323, monospace" font-size="13" fill="#6b5f7a" letter-spacing="0.08em">
            <text x="110" y="180">XVIII</text><text x="360" y="140">XIX</text>
            <text x="440" y="300">XX</text><text x="400" y="420">XII</text>
            <text x="250" y="440">XIII</text><text x="110" y="400">XV</text>
            <text x="80" y="250">XVI</text>
          </g>
          <g id="map-pins"></g>
          <text x="290" y="60" text-anchor="middle" font-family="Hanken Grotesk" font-size="22" font-weight="700" fill="#f2e8d5" opacity="0.6">Paris</text>
          <text x="290" y="78" text-anchor="middle" font-family="VT323" font-size="12" fill="#6b5f7a" letter-spacing="0.2em">AS SEEN BY MSCI 1</text>
        </svg>
        <div class="map-legend" id="map-legend"></div>
      </div>
    </main>

    <aside class="guide-right">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div class="page-key" style="margin:0">SPOTS · <span id="cat-top">FOOD</span></div>
        <span style="font-size:11px;color:var(--muted)">oldest first</span>
      </div>
      <div id="place-list"></div>
    </aside>
  </div>
`;

// Project lat/long onto the stylised 580×530 map: Paris centre at (290, 265),
// ~24 px per km, equal scale on both axes. Spots without coordinates get no pin.
const PARIS = { lat: 48.8566, long: 2.3522 };
function project(lat, long) {
  const dxKm = (long - PARIS.long) * 73.2;   // km per degree of longitude at Paris
  const dyKm = (lat - PARIS.lat) * 111.2;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  return { x: clamp(290 + dxKm * 24, 16, 564), y: clamp(265 - dyKm * 24, 16, 514) };
}

function currentCat() {
  if (!PLACE_CATEGORIES[state.guideCat]) state.guideCat = 'food';
  return state.guideCat;
}

function byline(p) {
  if (p.pending) return 'adding…';
  return p.submitted_handle && p.submitted_handle !== 'seed' ? `— @${p.submitted_handle}` : '— class seed';
}

function renderGuide() {
  const key = currentCat();
  const cat = PLACE_CATEGORIES[key];
  const all = getPlaces();
  const counts = Object.fromEntries(Object.keys(PLACE_CATEGORIES).map((k) => [k, all.filter((p) => p.category === k).length]));
  const places = all.filter((p) => p.category === key);

  const catList = document.getElementById('cat-list');
  catList.innerHTML = Object.entries(PLACE_CATEGORIES)
    .map(([k, c]) => `
    <button class="cat ${k === key ? 'on' : ''}" data-cat="${k}">
      <span class="cdot" style="background:${c.color}"></span>${c.name}<span class="cn">${counts[k]}</span>
    </button>`)
    .join('');
  catList.querySelectorAll('.cat').forEach((b) =>
    b.addEventListener('click', () => {
      state.guideCat = b.dataset.cat;
      hideForm();
      renderGuide();
    })
  );

  document.getElementById('cat-head').textContent = `● ${cat.name.toUpperCase()} · ${counts[key]} spot${counts[key] === 1 ? '' : 's'}`;
  document.getElementById('cat-blurb').textContent = cat.blurb;
  document.getElementById('cat-top').textContent = cat.name.toUpperCase();

  // Signed-out: disabled button; the tooltip sits on the wrapper because
  // disabled buttons don't reliably show their own title.
  const addBtn = document.querySelector('[data-add]');
  const wrap = document.getElementById('add-spot-wrap');
  addBtn.disabled = !state.auth;
  wrap.title = state.auth ? '' : 'sign in to add a spot.';

  document.getElementById('map-pins').innerHTML = all
    .filter((p) => p.lat != null && p.long != null)
    .map((p) => {
      const { x, y } = project(p.lat, p.long);
      const on = p.category === key;
      const col = PLACE_CATEGORIES[p.category]?.color || '#9a8ca8';
      return on
        ? `<g><title>${escapeHtml(p.name)}</title>
             <circle cx="${x}" cy="${y}" r="12" fill="${col}" opacity="0.25"/>
             <circle cx="${x}" cy="${y}" r="7" fill="${col}" stroke="#1a1420" stroke-width="2"/></g>`
        : `<g opacity="0.3"><circle cx="${x}" cy="${y}" r="5" fill="${col}" stroke="#1a1420" stroke-width="1.5"/></g>`;
    })
    .join('');

  document.getElementById('map-legend').innerHTML = Object.entries(PLACE_CATEGORIES)
    .map(([k, c]) => `<div class="l ${k === key ? '' : 'dim'}"><span class="d" style="background:${c.color}"></span>${c.name}</div>`)
    .join('');

  document.getElementById('place-list').innerHTML = places.length
    ? places.map((p) => `
    <div class="place" style="${p.pending ? 'opacity:0.6' : ''}">
      <div class="place-top">
        <div>
          <div class="place-h">${escapeHtml(p.name)}</div>
          ${p.address ? `<div class="place-sub">${escapeHtml(p.address)}</div>` : ''}
        </div>
        ${canDeletePlace(p) ? `<button class="del-btn" data-del-place="${escapeHtml(p.id)}" title="${p.submitted_by === state.auth?.id ? 'Delete your spot' : 'Delete (admin)'}" aria-label="Delete spot">×</button>` : ''}
      </div>
      ${p.tip ? `<div class="place-quote">${escapeHtml(p.tip)}</div>` : ''}
      <div style="font-size:11px;color:var(--dim);margin-top:6px">${escapeHtml(byline(p))}</div>
    </div>`).join('')
    : `<div style="padding:24px 8px;font-size:13px;color:var(--muted);text-align:center;font-style:italic">No spots yet — add the first one.</div>`;

  document.querySelectorAll('[data-del-place]').forEach((b) =>
    b.addEventListener('click', async () => {
      if (!confirm('Delete this spot for everyone?')) return;
      const { error } = await deletePlace(b.dataset.delPlace, renderGuide);
      if (error) toast(`Couldn't delete that spot: ${error.message}`);
    })
  );
}

// ---- add-a-spot form ----
function showForm() {
  const form = document.getElementById('add-spot-form');
  const sel = document.getElementById('spot-category');
  sel.innerHTML = Object.entries(PLACE_CATEGORIES)
    .map(([k, c]) => `<option value="${k}" ${k === currentCat() ? 'selected' : ''}>${c.name}</option>`)
    .join('');
  form.hidden = false;
  document.getElementById('spot-name').focus();
}

function hideForm() {
  const form = document.getElementById('add-spot-form');
  if (!form) return;
  form.hidden = true;
  form.reset();
}

// Returns a number, null (empty), or NaN (invalid).
function readCoord(id, min, max) {
  const raw = document.getElementById(id).value.trim().replace(',', '.');
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= min && n <= max ? n : NaN;
}

async function submitSpot(e) {
  e.preventDefault();
  if (!state.auth) { toast('Sign in to add a spot.'); return; }
  const val = (id) => document.getElementById(id).value.trim();
  const name = val('spot-name');
  if (!name) { toast('Give the spot a name.'); return; }
  const lat = readCoord('spot-lat', -90, 90);
  const long = readCoord('spot-long', -180, 180);
  if (Number.isNaN(lat) || Number.isNaN(long)) { toast('Lat must be -90..90 and long -180..180.'); return; }
  if ((lat === null) !== (long === null)) { toast('Add both lat and long, or neither.'); return; }

  const fields = {
    category: val('spot-category'),
    name,
    address: val('spot-address') || null,
    tip: val('spot-tip') || null,
    lat, long,
  };
  state.guideCat = fields.category;
  hideForm();
  const { error } = await addPlace(fields, renderGuide);
  toast(error ? `Couldn't add that spot: ${error.message}` : 'Spot added. Thanks!');
}

export function initGuide() {
  const root = document.querySelector('.subview[data-sub="guide"]');
  root.querySelector('[data-add]').addEventListener('click', () => {
    if (!state.auth) return;
    const form = document.getElementById('add-spot-form');
    if (form.hidden) showForm(); else hideForm();
  });
  root.querySelector('[data-spot-cancel]').addEventListener('click', hideForm);
  root.querySelector('#add-spot-form').addEventListener('submit', submitSpot);

  renderGuide();
  loadPlaces().then(renderGuide);
  subscribePlaces(renderGuide);
  // Refresh whenever the guide is opened so new classmate spots show up.
  window.addEventListener('hashchange', () => {
    if (location.hash === '#guide') loadPlaces().then(renderGuide);
  });
}
