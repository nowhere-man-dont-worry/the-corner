// Landing page — the pitch: a big headline and the sign-in button. Theme toggle lives in the top-right
// of this nav like every other page.

import { nav } from '../core/nav.js';
import { themeToggleHTML } from '../core/theme.js';
import { state } from '../core/state.js';
import { signInWithGitHub } from '../core/supabase.js';

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

  <div class="landing-main">
    <div class="eyebrow">※ AN UNOFFICIAL CLASS SPACE ※</div>
    <h1 class="landing-h">Lost? Bored?<br/><span class="accent">Welcome in.</span></h1>
    <p class="landing-sub">You moved countries. You have no classes. Campus feels like a waiting room, dinner's getting lonely. You're not the only one — just the only one not saying it out loud. So we built a corner.</p>
    <div class="cta-row">
      <button class="btn btn-primary" data-signin hidden>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8a8 8 0 0 0-8-8z"/></svg>
        Sign in with GitHub
      </button>
      <button class="btn btn-primary" data-go="create" hidden>
        Step inside
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 7h12m-5-5l5 5-5 5" stroke="#1a1420" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button class="btn btn-ghost" data-go="plaza" hidden>What's happening</button>
    </div>
    <div style="margin-top:28px;font-size:12px;color:var(--dim)">github sign-in &nbsp;·&nbsp; just for our class &nbsp;·&nbsp; leave anytime</div>
  </div>

  <div class="landing-foot">
    <span>a corner for MSCI 1 — not a club, not an authority, just a place</span>
    <span class="mono" style="font-size:14px">BUILT BY WASI · DELEGATE RUN 2026</span>
  </div>
`;

export function initLanding() {
  const root = document.getElementById('landing');
  root.querySelector('[data-signin]').addEventListener('click', signInWithGitHub);
  root.querySelector('[data-go="create"]').addEventListener('click', () => nav('create'));
  root.querySelector('[data-go="plaza"]').addEventListener('click', () => nav('plaza'));
  refreshLandingAuth();
}

export function refreshLandingAuth() {
  const root = document.getElementById('landing');
  if (!root) return;
  const signInBtn = root.querySelector('[data-signin]');
  const stepInBtn = root.querySelector('[data-go="create"]');
  const whatsUpBtn = root.querySelector('[data-go="plaza"]');
  if (state.auth) {
    signInBtn.hidden = true;
    stepInBtn.hidden = false;
    whatsUpBtn.hidden = false;
  } else {
    signInBtn.hidden = false;
    stepInBtn.hidden = true;
    whatsUpBtn.hidden = true;
  }
}
