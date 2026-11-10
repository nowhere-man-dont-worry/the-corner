// Avatar creator — pick a hair style, color your pieces, give yourself a handle,
// then "Enter the Corner" to land in the plaza with that avatar.

import { state } from '../core/state.js';
import { nav } from '../core/nav.js';
import { avatarSVG } from '../avatars/render.js';
import { PALETTE } from '../avatars/palette.js';
import { hairOrder } from '../avatars/hair/index.js';
import { themeToggleHTML } from '../core/theme.js';
import { toast } from '../core/toast.js';
import { signOut } from '../core/supabase.js';

export const createHTML = `
  <div class="create-wrap">
    <div class="create-head">
      <div style="display:flex;align-items:center;gap:12px">
        <svg width="30" height="30" viewBox="0 0 32 32" shape-rendering="crispEdges"><rect x="2" y="2" width="28" height="28" rx="7" fill="#ff6b4a"/><rect x="8" y="9" width="16" height="12" rx="2" fill="#1a1420"/><rect x="11" y="13" width="2" height="2" fill="#ff6b4a"/><rect x="19" y="13" width="2" height="2" fill="#ff6b4a"/><rect x="13" y="17" width="6" height="1" fill="#ff6b4a"/></svg>
        <span style="font-weight:700;font-size:17px;letter-spacing:-0.02em">the corner</span>
        <span style="color:var(--dim)">/</span>
        <span style="color:var(--muted);font-size:14px">make your avatar</span>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <div class="mono" style="font-size:14px;color:var(--muted)">STEP 1 OF 2</div>
        ${themeToggleHTML}
      </div>
    </div>

    <h1 class="create-title">Make yourself <span class="accent">someone</span>.</h1>
    <p class="create-sub">Pick a look. Nobody has to know it's you — or everybody can. Up to you.</p>

    <div class="create-grid">
      <div class="preview-card">
        <div class="mono preview-label" style="color:var(--muted);font-size:15px;letter-spacing:0.12em">◉ PREVIEW</div>
        <div class="preview-stage" id="preview-stage"></div>
        <input class="preview-name" id="avatar-name" value="noa_from_tel_aviv" placeholder="your handle" maxlength="60"/>
        <div class="signed-in-badge" id="avatar-signed-in-badge" hidden></div>
        <button class="preview-shuffle" data-randomize>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M3 7a4 4 0 1 1 1.17 2.83M3 7L1 9m2-2l2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          surprise me
        </button>
      </div>

      <div class="panel-col">
        <div class="tab-row" id="create-tabs">
          <button class="tab on" data-tab="hair">Hair</button>
          <button class="tab" data-tab="top">Top</button>
          <button class="tab" data-tab="bottom">Bottom</button>
          <button class="tab" data-tab="skin">Skin</button>
          <button class="tab" data-tab="flag">Flag</button>
        </div>

        <div class="panel">
          <div class="panel-label">STYLE</div>
          <div class="chip-row" id="hair-style">
            ${hairOrder.map((n, i) => `<button class="chip ${i === 0 ? 'on' : ''}" data-style="${n}">${n}</button>`).join('')}
          </div>
        </div>

        <div class="panel">
          <div class="panel-label" id="color-label">COLOUR · HAIR</div>
          <div class="sw-row" id="color-swatches"></div>
        </div>

        <div class="panel" style="background:transparent;border-style:dashed">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div class="panel-label" style="margin-bottom:4px">OPTIONAL</div>
              <div style="font-size:13px;color:#c8bcaf">freckles, glasses, piercing, flag badge — pick anytime later</div>
            </div>
            <span style="color:var(--muted);font-size:18px">→</span>
          </div>
        </div>

        <div style="margin-top:auto;display:flex;justify-content:space-between;align-items:center;padding-top:8px;gap:12px;flex-wrap:wrap">
          <span class="mono" style="font-size:12px;color:var(--dim);letter-spacing:0.08em">YOU CAN CHANGE ANY OF THIS LATER</span>
          <button class="btn btn-primary" data-enter>
            Enter the Corner
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 7h12m-5-5l5 5-5 5" stroke="#1a1420" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>
    </div>
  </div>
`;

let currentCreateTab = 'hair';

export function renderAvatarPreview() {
  const stage = document.getElementById('preview-stage');
  if (stage) stage.innerHTML = avatarSVG(state.avatar, 200);

  const mini = document.getElementById('me-mini');
  if (mini) mini.innerHTML = avatarSVG(state.avatar, 22);

  const meAvatar = document.getElementById('me-avatar');
  if (meAvatar)
    meAvatar.innerHTML =
      avatarSVG(state.avatar, 60) + `<div class="npc-label">${state.avatar.name}</div>`;

  const meName = document.getElementById('me-name');
  if (meName) meName.textContent = state.avatar.name;
}

function setCreateTab(tab) {
  currentCreateTab = tab;
  document.querySelectorAll('#create-tabs .tab').forEach((t) =>
    t.classList.toggle('on', t.dataset.tab === tab)
  );
  const labels = {
    hair: 'COLOUR · HAIR',
    top: 'COLOUR · TOP',
    bottom: 'COLOUR · BOTTOM',
    skin: 'COLOUR · SKIN',
    flag: 'FLAG · pick a country',
  };
  document.getElementById('color-label').textContent = labels[tab] || 'COLOUR';
  renderSwatches();
}

function renderSwatches() {
  const key =
    currentCreateTab === 'hair'
      ? 'hair'
      : currentCreateTab === 'top'
      ? 'top'
      : currentCreateTab === 'bottom'
      ? 'bottom'
      : currentCreateTab === 'skin'
      ? 'skin'
      : 'flag';
  const current =
    currentCreateTab === 'hair'
      ? state.avatar.hairColor
      : state.avatar[currentCreateTab] || PALETTE[key][0];

  const box = document.getElementById('color-swatches');
  box.innerHTML = PALETTE[key]
    .map((c) => `<button class="sw ${c === current ? 'on' : ''}" style="background:${c}" data-c="${c}"></button>`)
    .join('');

  box.querySelectorAll('.sw').forEach((sw) =>
    sw.addEventListener('click', () => {
      const c = sw.dataset.c;
      if (currentCreateTab === 'hair') state.avatar.hairColor = c;
      else if (currentCreateTab === 'flag') toast('Flag badge saved.');
      else state.avatar[currentCreateTab] = c;
      renderAvatarPreview();
      renderSwatches();
    })
  );
}

function randomizeAvatar() {
  const r = (arr) => arr[Math.floor(Math.random() * arr.length)];
  state.avatar.hair = r(hairOrder);
  state.avatar.hairColor = r(PALETTE.hair);
  state.avatar.skin = r(PALETTE.skin);
  state.avatar.top = r(PALETTE.top);
  state.avatar.bottom = r(PALETTE.bottom);
  document.querySelectorAll('#hair-style .chip').forEach((c) =>
    c.classList.toggle('on', c.dataset.style === state.avatar.hair)
  );
  renderAvatarPreview();
  renderSwatches();
}

function refreshAuthBadge() {
  const badge = document.getElementById('avatar-signed-in-badge');
  const nameInput = document.getElementById('avatar-name');
  if (!badge || !nameInput) return;
  if (state.auth) {
    badge.innerHTML = `◉ SIGNED IN AS @${state.auth.github_username} <a data-signout>sign out</a>`;
    badge.hidden = false;
    nameInput.value = state.auth.github_username;
    nameInput.readOnly = true;
    badge.querySelector('[data-signout]').addEventListener('click', signOut);
  } else {
    badge.hidden = true;
    nameInput.readOnly = false;
  }
}

export function initCreate() {
  const root = document.getElementById('create');

  root.querySelectorAll('#create-tabs .tab').forEach((t) =>
    t.addEventListener('click', () => setCreateTab(t.dataset.tab))
  );

  root.querySelectorAll('#hair-style .chip').forEach((c) =>
    c.addEventListener('click', () => {
      root.querySelectorAll('#hair-style .chip').forEach((x) => x.classList.remove('on'));
      c.classList.add('on');
      state.avatar.hair = c.dataset.style;
      renderAvatarPreview();
    })
  );

  root.querySelector('#avatar-name').addEventListener('input', (e) => {
    state.avatar.name = e.target.value || 'you';
    renderAvatarPreview();
  });

  root.querySelector('[data-randomize]').addEventListener('click', randomizeAvatar);
  root.querySelector('[data-enter]').addEventListener('click', () => nav('plaza'));

  renderAvatarPreview();
  renderSwatches();
  refreshAuthBadge();
}
