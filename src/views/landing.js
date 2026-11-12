// Landing page — the pitch: headline, one button, and two pixel characters
// whose speech bubbles cycle through little lines (decorative only).
//
// The button signs you in with GitHub, or — if you're already signed in and
// opened the bare site URL — takes you inside.
//
// Bubbles: each character has its own list and changes every ~5 s with a
// short fade, offset so the two never change together. No cycling with
// prefers-reduced-motion (first line only), while the tab is hidden, when the
// landing view isn't showing, or once you're signed in.

import { nav } from '../core/nav.js';
import { themeToggleHTML } from '../core/theme.js';
import { state } from '../core/state.js';
import { signInWithGitHub } from '../core/supabase.js';

const LINES = {
  l: [
    "i'm so bored i reorganized my fridge",
    'is cereal a dinner',
    "my defense is friday and i'm not ok",
    'my plants and i are not speaking',
  ],
  r: [
    'someone please pick a movie',
    'cheapest kebab near campus. go.',
    "how do you say 'one more week' in french",
    "who's down for literally anything",
  ],
};
const CYCLE_MS = 5000;
const FADE_MS = 250;

const GITHUB_ICON = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8a8 8 0 0 0-8-8z"/></svg>`;
const ARROW_ICON = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M1 7h12m-5-5l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

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
    <h1 class="landing-h">There's <span class="accent">a corner for that.</span></h1>
    <p class="landing-sub">For the bored, the new in town, and anyone eating dinner over their keyboard again. Make a little avatar and see who's around.</p>
    <div class="cta-row">
      <button class="btn btn-primary" data-landing-cta>${GITHUB_ICON} Sign in with GitHub</button>
    </div>
    <div class="landing-small">takes 10 seconds · just our class · leave anytime</div>
  </div>

  <div class="landing-chars" aria-hidden="true">
    <div class="char char-l">
      <div class="bubble" data-bubble="l">${LINES.l[0]}</div>
      <svg width="72" height="108" viewBox="0 0 20 30" shape-rendering="crispEdges"><rect x="5" y="3" width="10" height="4" fill="#3d2a1f"/><rect x="4" y="5" width="12" height="3" fill="#3d2a1f"/><rect x="6" y="7" width="8" height="5" fill="#f5c9a0"/><rect x="8" y="9" width="1" height="1" fill="#1a1420"/><rect x="11" y="9" width="1" height="1" fill="#1a1420"/><rect x="9" y="11" width="2" height="1" fill="#8a4a3d"/><rect x="4" y="12" width="12" height="9" fill="#c589e8"/><rect x="3" y="13" width="2" height="6" fill="#c589e8"/><rect x="15" y="13" width="2" height="6" fill="#c589e8"/><rect x="6" y="21" width="3" height="7" fill="#241b2e"/><rect x="11" y="21" width="3" height="7" fill="#241b2e"/><rect x="5" y="28" width="4" height="2" fill="#f2e8d5"/><rect x="11" y="28" width="4" height="2" fill="#f2e8d5"/></svg>
    </div>
    <div class="char char-r">
      <div class="bubble right" data-bubble="r">${LINES.r[0]}</div>
      <svg width="72" height="108" viewBox="0 0 20 30" shape-rendering="crispEdges"><rect x="4" y="2" width="12" height="4" fill="#ffd166"/><rect x="3" y="4" width="14" height="3" fill="#ffd166"/><rect x="6" y="6" width="8" height="5" fill="#e8b899"/><rect x="8" y="8" width="1" height="1" fill="#1a1420"/><rect x="11" y="8" width="1" height="1" fill="#1a1420"/><rect x="4" y="11" width="12" height="10" fill="#7fd4a8"/><rect x="3" y="12" width="2" height="7" fill="#7fd4a8"/><rect x="15" y="12" width="2" height="7" fill="#7fd4a8"/><rect x="6" y="21" width="3" height="7" fill="#1e3a5f"/><rect x="11" y="21" width="3" height="7" fill="#1e3a5f"/><rect x="5" y="28" width="4" height="2" fill="#2a1f38"/><rect x="11" y="28" width="4" height="2" fill="#2a1f38"/></svg>
    </div>
  </div>

  <div class="landing-foot">
    <span>a corner for MSCI 1 — not a club, not an authority, just a place</span>
    <span class="mono" style="font-size:14px">BUILT BY WASI · DELEGATE RUN 2026</span>
  </div>
`;

// ---- bubbles ----
const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
const bubbleTimers = [];
const lineIndex = { l: 0, r: 0 };
let cycling = false;

function stopBubbles() {
  while (bubbleTimers.length) {
    const t = bubbleTimers.pop();
    clearTimeout(t);
    clearInterval(t);
  }
  cycling = false;
}

function showLine(side, i) {
  const el = document.querySelector(`#landing [data-bubble="${side}"]`);
  if (!el) return;
  lineIndex[side] = i % LINES[side].length;
  el.classList.add('fading');
  bubbleTimers.push(setTimeout(() => {
    el.textContent = LINES[side][lineIndex[side]];
    el.classList.remove('fading');
  }, FADE_MS));
}

function resetLines() {
  for (const side of ['l', 'r']) {
    lineIndex[side] = 0;
    const el = document.querySelector(`#landing [data-bubble="${side}"]`);
    if (el) { el.textContent = LINES[side][0]; el.classList.remove('fading'); }
  }
}

function shouldCycle() {
  const root = document.getElementById('landing');
  return !!root && root.classList.contains('active') && !state.auth
    && document.visibilityState === 'visible' && !reduceMotion?.matches;
}

// Left changes on the 5 s beat, right half a beat later: never together.
function syncBubbles() {
  if (!shouldCycle()) {
    stopBubbles();
    if (reduceMotion?.matches || state.auth) resetLines();
    return;
  }
  if (cycling) return;
  cycling = true;
  bubbleTimers.push(setInterval(() => showLine('l', lineIndex.l + 1), CYCLE_MS));
  bubbleTimers.push(setTimeout(() => {
    bubbleTimers.push(setInterval(() => showLine('r', lineIndex.r + 1), CYCLE_MS));
  }, CYCLE_MS / 2));
}

// ---- button ----
export function refreshLandingAuth() {
  const btn = document.querySelector('#landing [data-landing-cta]');
  if (!btn) return;
  btn.innerHTML = state.auth ? `Step inside ${ARROW_ICON}` : `${GITHUB_ICON} Sign in with GitHub`;
  syncBubbles();
}

export function initLanding() {
  const root = document.getElementById('landing');
  root.querySelector('[data-landing-cta]').addEventListener('click', () => {
    if (state.auth) nav('create');
    else signInWithGitHub();
  });
  // Start/stop with the view (nav() toggles .active), the tab and the
  // reduced-motion setting.
  new MutationObserver(syncBubbles).observe(root, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', syncBubbles);
  reduceMotion?.addEventListener?.('change', syncBubbles);
  refreshLandingAuth();
}
