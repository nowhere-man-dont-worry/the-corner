// Landing page — the pitch. Two throwaway classmates on either side with
// chat bubbles, a big headline, two buttons. Theme toggle lives in the top-right
// of this nav like every other page.

import { nav } from '../core/nav.js';
import { themeToggleHTML } from '../core/theme.js';

export const landingHTML = `
  <div class="landing-top">
    <div class="logo">
      <svg width="32" height="32" viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true">
        <rect x="2" y="2" width="28" height="28" rx="7" fill="#ff6b4a"/>
        <rect x="8" y="9" width="16" height="12" rx="2" fill="#1a1420"/>
        <rect x="11" y="13" width="2" height="2" fill="#ff6b4a"/>
        <rect x="19" y="13" width="2" height="2" fill="#ff6b4a"/>
        <rect x="13" y="17" width="6" height="1" fill="#ff6b4a"/>
      </svg>
      the corner
    </div>
    <div style="display:flex;align-items:center;gap:14px;font-size:13px;color:var(--muted)">
      <span class="online-chip"><span class="online-dot"></span>14 online</span>
      <span class="mono" style="padding:5px 11px;border:1px solid var(--border);border-radius:999px;font-size:14px">MSCI 1 · 2026/27</span>
      ${themeToggleHTML}
    </div>
  </div>

  <svg class="lights" viewBox="0 0 1200 60" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 10 Q 300 55 600 15 T 1200 10" stroke="#3d3050" stroke-width="1.5" fill="none"/>
    <circle class="light" cx="100" cy="33" r="5" fill="#ffd166"/>
    <circle class="light" cx="200" cy="43" r="5" fill="#ff6b4a"/>
    <circle class="light" cx="300" cy="46" r="5" fill="#7fd4a8"/>
    <circle class="light" cx="400" cy="40" r="5" fill="#c589e8"/>
    <circle class="light" cx="500" cy="33" r="5" fill="#ffd166"/>
    <circle class="light" cx="600" cy="25" r="5" fill="#ff6b4a"/>
    <circle class="light" cx="700" cy="22" r="5" fill="#7fd4a8"/>
    <circle class="light" cx="800" cy="20" r="5" fill="#c589e8"/>
    <circle class="light" cx="900" cy="18" r="5" fill="#ffd166"/>
    <circle class="light" cx="1000" cy="17" r="5" fill="#ff6b4a"/>
    <circle class="light" cx="1100" cy="15" r="5" fill="#7fd4a8"/>
  </svg>

  <div class="char char-l">
    <div class="bubble">i'm so bored i reorganized my fridge</div>
    <svg width="72" height="108" viewBox="0 0 20 30" shape-rendering="crispEdges"><rect x="5" y="3" width="10" height="4" fill="#3d2a1f"/><rect x="4" y="5" width="12" height="3" fill="#3d2a1f"/><rect x="6" y="7" width="8" height="5" fill="#f5c9a0"/><rect x="8" y="9" width="1" height="1" fill="#1a1420"/><rect x="11" y="9" width="1" height="1" fill="#1a1420"/><rect x="9" y="11" width="2" height="1" fill="#8a4a3d"/><rect x="4" y="12" width="12" height="9" fill="#c589e8"/><rect x="3" y="13" width="2" height="6" fill="#c589e8"/><rect x="15" y="13" width="2" height="6" fill="#c589e8"/><rect x="6" y="21" width="3" height="7" fill="#241b2e"/><rect x="11" y="21" width="3" height="7" fill="#241b2e"/><rect x="5" y="28" width="4" height="2" fill="#f2e8d5"/><rect x="11" y="28" width="4" height="2" fill="#f2e8d5"/></svg>
    <div class="char-name">NOA</div>
  </div>

  <div class="char char-r">
    <div class="bubble right">someone please pick a movie</div>
    <svg width="72" height="108" viewBox="0 0 20 30" shape-rendering="crispEdges"><rect x="4" y="2" width="12" height="4" fill="#ffd166"/><rect x="3" y="4" width="14" height="3" fill="#ffd166"/><rect x="6" y="6" width="8" height="5" fill="#e8b899"/><rect x="8" y="8" width="1" height="1" fill="#1a1420"/><rect x="11" y="8" width="1" height="1" fill="#1a1420"/><rect x="4" y="11" width="12" height="10" fill="#7fd4a8"/><rect x="3" y="12" width="2" height="7" fill="#7fd4a8"/><rect x="15" y="12" width="2" height="7" fill="#7fd4a8"/><rect x="6" y="21" width="3" height="7" fill="#1e3a5f"/><rect x="11" y="21" width="3" height="7" fill="#1e3a5f"/><rect x="5" y="28" width="4" height="2" fill="#2a1f38"/><rect x="11" y="28" width="4" height="2" fill="#2a1f38"/></svg>
    <div class="char-name">LENA</div>
  </div>

  <div class="landing-main">
    <div class="eyebrow">※ AN UNOFFICIAL CLASS SPACE ※</div>
    <h1 class="landing-h">Lost? Bored?<br/><span class="accent">Welcome in.</span></h1>
    <p class="landing-sub">You moved countries. You have no classes. Campus feels like a waiting room, dinner's getting lonely. You're not the only one — just the only one not saying it out loud. So we built a corner.</p>
    <div class="cta-row">
      <button class="btn btn-primary" data-go="create">
        Step inside
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 7h12m-5-5l5 5-5 5" stroke="#1a1420" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button class="btn btn-ghost" data-go="plaza">What's happening</button>
    </div>
    <div style="margin-top:28px;font-size:12px;color:var(--dim)">no login required &nbsp;·&nbsp; stays between us &nbsp;·&nbsp; delete your avatar anytime</div>
  </div>

  <div class="landing-foot">
    <span>a corner for MSCI 1 — not a club, not an authority, just a place</span>
    <span class="mono" style="font-size:14px">BUILT BY WASI · DELEGATE RUN 2026</span>
  </div>
`;

export function initLanding() {
  const root = document.getElementById('landing');
  root.querySelector('[data-go="create"]').addEventListener('click', () => nav('create'));
  root.querySelector('[data-go="plaza"]').addEventListener('click', () => nav('plaza'));
}
