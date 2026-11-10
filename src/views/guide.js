// Guide — hand-drawn Paris map + categories + place cards with classmate quotes.

import { state } from '../core/state.js';
import { toast } from '../core/toast.js';
import { CAT_COLORS, CAT_NAMES, CAT_COUNTS, PLACES } from '../data/guide-places.js';

export const guideHTML = `
  <div class="guide-grid">
    <aside class="guide-side">
      <div class="page-key">THE GUIDE</div>
      <h2 style="font-family:var(--display);font-weight:700;font-size:28px;line-height:1;margin:0 0 4px;letter-spacing:-0.03em">By us, <span class="accent">for us</span>.</h2>
      <div style="font-size:12px;color:var(--muted);margin-bottom:22px;line-height:1.4">Everything 1 classmate has vouched for.</div>

      <div class="page-key">CATEGORIES</div>
      <div id="cat-list" style="display:flex;flex-direction:column;gap:3px"></div>

      <div class="page-key" style="margin-top:22px">SURVIVAL BASICS</div>
      <div style="display:flex;flex-direction:column;gap:6px;font-size:13px">
        <div style="color:#c8bcaf;cursor:pointer">◉ Navigo pass — set-up</div>
        <div style="color:#c8bcaf;cursor:pointer">◉ SIM card without a bank</div>
        <div style="color:#c8bcaf;cursor:pointer">◉ Opening a Revolut / N26</div>
        <div style="color:#c8bcaf;cursor:pointer">◉ CAF housing aid, step by step</div>
        <div style="color:#c8bcaf;cursor:pointer">◉ Doctolib in English</div>
      </div>
    </aside>

    <main class="guide-mid">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div>
          <div class="page-key" id="cat-head">● EAT CHEAP · 34 spots</div>
          <div style="font-size:13px;color:var(--muted)">Under €12 a plate, no exceptions. Added by 9 of us.</div>
        </div>
        <button class="btn btn-primary" data-add style="padding:8px 13px;font-size:12px">+ Add a spot</button>
      </div>

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
        <div class="page-key" style="margin:0">TOP SPOTS · <span id="cat-top">EAT CHEAP</span></div>
        <span style="font-size:11px;color:var(--muted)">sort: hot ▾</span>
      </div>
      <div id="place-list"></div>
    </aside>
  </div>
`;

function renderGuide() {
  const catList = document.getElementById('cat-list');
  catList.innerHTML = Object.keys(CAT_NAMES)
    .map(
      (k) => `
    <button class="cat ${k === state.guideCat ? 'on' : ''}" data-cat="${k}">
      <span class="cdot" style="background:${CAT_COLORS[k]}"></span>${CAT_NAMES[k]}<span class="cn">${CAT_COUNTS[k]}</span>
    </button>`
    )
    .join('');

  catList.querySelectorAll('.cat').forEach((c) =>
    c.addEventListener('click', () => {
      state.guideCat = c.dataset.cat;
      renderGuide();
    })
  );

  const key = state.guideCat;
  document.getElementById('cat-head').innerHTML = `● ${CAT_NAMES[key].toUpperCase()} · ${CAT_COUNTS[key]} spots`;
  document.getElementById('cat-top').textContent = CAT_NAMES[key].toUpperCase();

  const col = CAT_COLORS[key];
  const places = PLACES[key] || [];
  document.getElementById('map-pins').innerHTML =
    places
      .map(
        (p) => `
      <g>
        <circle cx="${p.x}" cy="${p.y}" r="${p.top ? 14 : 12}" fill="${col}" opacity="${p.top ? 0.4 : 0.25}"/>
        <circle cx="${p.x}" cy="${p.y}" r="${p.top ? 9 : 7}" fill="${col}" stroke="#1a1420" stroke-width="2"/>
        ${p.top ? `<text x="${p.x + 10}" y="${p.y - 14}" font-family="VT323" font-size="12" fill="${col}">★ TOP</text>` : ''}
      </g>
    `
      )
      .join('') +
    Object.keys(CAT_COLORS)
      .filter((k) => k !== key)
      .slice(0, 4)
      .map((k, i) => {
        const px = [400, 470, 130, 350][i];
        const py = [140, 250, 420, 430][i];
        return `<g opacity="0.3"><circle cx="${px}" cy="${py}" r="5" fill="${CAT_COLORS[k]}" stroke="#1a1420" stroke-width="1.5"/></g>`;
      })
      .join('');

  document.getElementById('map-legend').innerHTML = Object.keys(CAT_NAMES)
    .slice(0, 4)
    .map(
      (k) => `
    <div class="l ${k === key ? '' : 'dim'}"><span class="d" style="background:${CAT_COLORS[k]}"></span>${CAT_NAMES[k]}</div>
  `
    )
    .join('');

  document.getElementById('place-list').innerHTML =
    places
      .map(
        (p) => `
    <div class="place ${p.top ? 'top' : ''}">
      <div class="place-top">
        <div>
          <div class="place-h">${p.name}</div>
          <div class="place-sub">${p.sub}</div>
        </div>
        <div class="place-stars">${'★'.repeat(p.star)}${'☆'.repeat(5 - p.star)} · ${p.stars}</div>
      </div>
      <div class="place-quote">${p.quote}</div>
    </div>
  `
      )
      .join('') +
    `<div style="padding:8px 2px;font-size:12px;color:var(--dim);text-align:center">+ ${CAT_COUNTS[key] - places.length} more spots</div>`;
}

export function initGuide() {
  const root = document.querySelector('.subview[data-sub="guide"]');
  root.querySelector('[data-add]').addEventListener('click', () =>
    toast('Share a spot in one line. Tagged to this category.')
  );
  renderGuide();
}
