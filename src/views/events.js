// Events — weekly calendar with RSVPs and the "I'm bored" roulette.

import { state } from '../core/state.js';
import { toast } from '../core/toast.js';
import { avatarSVG } from '../avatars/render.js';
import { EVENTS } from '../data/events.js';
import { MEMBERS } from '../data/members.js';

export const eventsHTML = `
  <div class="page">
    <div class="page-head">
      <div class="events-head-row">
        <div>
          <div class="page-key">THIS WEEK · NOV 9–15 · 11 events · 73 RSVPs</div>
          <h1 class="page-title">What's <span class="accent">on</span>.</h1>
        </div>
        <button class="bored-btn" id="bored-btn">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="#1a1420" stroke-width="1.8"/><path d="M6 9l2 2 4-4" stroke="#1a1420" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          I'm bored — tell me what to do
        </button>
      </div>
    </div>

    <div class="page-wrap">
      <div class="week-grid" id="week-grid"></div>
    </div>
  </div>
`;

function renderWeek() {
  const grid = document.getElementById('week-grid');
  if (!grid) return;
  grid.innerHTML = EVENTS.map(
    (col, ci) => `
    <div>
      <div class="day-head ${col.today ? 'today' : ''}">${col.day}</div>
      ${col.events
        .map((e, ei) => {
          const key = `${ci}-${ei}`;
          const rsvp = state.rsvps[key];
          const color = e.color || col.color;
          if (e.live) {
            return `
              <div class="ev" style="background:linear-gradient(135deg,rgba(var(--coral-rgb),0.18) 0%,var(--surface) 100%);border:1px solid var(--coral);border-left:1px solid var(--coral)">
                <div class="ev-when" style="color:var(--coral)">LIVE NOW</div>
                <div class="ev-what">${e.what}</div>
                <div class="ev-where">${e.where || ''}</div>
                <button class="btn btn-primary" data-join style="margin-top:9px;width:100%;padding:7px;font-size:12px">Join →</button>
              </div>
            `;
          }
          return `
            <div class="ev ev-${color}" data-ev="${key}">
              <div class="ev-when" style="color:var(--${color})">${e.when}</div>
              <div class="ev-what">${e.what}</div>
              ${e.where ? `<div class="ev-where">${e.where}</div>` : ''}
              ${e.rsvps
                ? `
                <div class="ev-rsvps">
                  ${e.rsvps
                    .slice(0, 4)
                    .map((r, i) => {
                      const m = MEMBERS.find((x) => x.name === r);
                      if (!m)
                        return `<div style="width:22px;height:22px;border-radius:50%;background:var(--surface-2);color:var(--muted);display:grid;place-items:center;font-size:10px;font-weight:600;border:2px solid var(--surface);margin-left:${i === 0 ? '0' : '-6px'}">+</div>`;
                      return avatarSVG({ hair: 'mop', hairColor: m.hair, skin: m.skin, top: m.top, bottom: m.bottom }, 22);
                    })
                    .join('')}
                  ${e.rsvps.length > 4
                    ? `<div style="width:22px;height:22px;border-radius:50%;background:var(--surface-2);color:var(--muted);display:grid;place-items:center;font-size:10px;font-weight:600;border:2px solid var(--surface);margin-left:-6px">+${e.rsvps.length - 4}</div>`
                    : ''}
                  <button class="ev-rsvp-btn ${rsvp ? 'on' : ''}" data-ev="${key}">${rsvp ? '✓ in' : '+ rsvp'}</button>
                </div>
              `
                : `<div style="margin-top:9px;text-align:right"><button class="ev-rsvp-btn ${rsvp ? 'on' : ''}" data-ev="${key}">${rsvp ? '✓ in' : '+ rsvp'}</button></div>`}
            </div>
          `;
        })
        .join('')}
    </div>
  `
  ).join('');

  grid.querySelectorAll('.ev-rsvp-btn').forEach((b) =>
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = b.dataset.ev;
      state.rsvps[key] = !state.rsvps[key];
      renderWeek();
      if (state.rsvps[key]) toast("You're in. See you there.");
    })
  );

  grid.querySelectorAll('[data-join]').forEach((b) =>
    b.addEventListener('click', () => toast('Garden opens soon — mocked for pitch.'))
  );
}

function imBored() {
  const btn = document.getElementById('bored-btn');
  btn.classList.remove('spin');
  void btn.offsetWidth;
  btn.classList.add('spin');
  document.querySelectorAll('.ev.focus').forEach((e) => e.classList.remove('focus'));
  const all = document.querySelectorAll('.ev');
  if (!all.length) return;
  const pick = all[Math.floor(Math.random() * all.length)];
  setTimeout(() => {
    pick.classList.add('focus');
    pick.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const what = pick.querySelector('.ev-what')?.textContent;
    toast(`→ ${what}`);
  }, 350);
}

export function initEvents() {
  const root = document.querySelector('.subview[data-sub="events"]');
  root.querySelector('#bored-btn').addEventListener('click', imBored);
  renderWeek();
}
