// Events — what's on, made by classmates. Create an event, RSVP going/maybe
// (click again to cancel), see who's going. Times are entered and shown in
// Europe/Paris time. "I'm bored" picks a random event in the next 7 days, or a
// random Guide spot if nothing is planned. See src/core/events.js.

import { state } from '../core/state.js';
import { nav } from '../core/nav.js';
import { toast } from '../core/toast.js';
import { escapeHtml } from '../utils/html.js';
import { authorHTML, avatarOf, nameOf } from '../core/people.js';
import { getPlaces, loadPlaces } from '../core/places.js';
import { parisInputToDate, dateToParisInput, parisDay, parisTime, parisDayKey } from '../utils/paris-time.js';
import {
  getEvents, upcoming, past, rsvpsFor, myRsvp, loadEvents, createEvent, setRsvp,
  deleteEvent, canDeleteEvent, subscribeEvents,
} from '../core/events.js';

export const eventsHTML = `
  <div class="page">
    <div class="page-head">
      <div class="events-head-row">
        <div>
          <div class="page-key" id="events-key">EVENTS</div>
          <h1 class="page-title">What's <span class="accent">on</span>.</h1>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-ghost" data-new-event style="padding:10px 16px;font-size:13px">+ New event</button>
          <button class="bored-btn" id="bored-btn">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="#1a1420" stroke-width="1.8"/><path d="M6 9l2 2 4-4" stroke="#1a1420" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            I'm bored — tell me what to do
          </button>
        </div>
      </div>
    </div>

    <div class="page-wrap">
      <form class="side-card ev-form" id="event-form" hidden>
        <div class="side-key">NEW EVENT · times are Paris time</div>
        <div class="ev-form-grid">
          <label>Title<input class="profile-input" id="ev-title" maxlength="100" required placeholder="e.g. Sunday picnic at Buttes-Chaumont"/></label>
          <label>Starts<input class="profile-input" id="ev-start" type="datetime-local" required/></label>
          <label>Ends (optional)<input class="profile-input" id="ev-end" type="datetime-local"/></label>
          <label>Where<input class="profile-input" id="ev-location" maxlength="200" placeholder="address, room, métro stop…"/></label>
          <label>Guide spot (optional)<select class="profile-input" id="ev-place"><option value="">— none —</option></select></label>
          <label class="ev-span">Details (optional)<textarea class="profile-ta" id="ev-description" maxlength="800" style="margin:0"></textarea></label>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">
          <button type="button" class="btn btn-ghost" data-cancel-event style="padding:8px 14px;font-size:13px">cancel</button>
          <button type="submit" class="btn btn-primary" style="padding:8px 14px;font-size:13px">Create event</button>
        </div>
      </form>

      <div id="events-upcoming"></div>
      <details class="ev-past" id="events-past-wrap">
        <summary class="page-key" id="events-past-title">PAST</summary>
        <div id="events-past"></div>
      </details>
    </div>
  </div>
`;

function placeName(id) {
  return getPlaces().find((p) => p.id === id)?.name || null;
}

function whenText(e) {
  const s = new Date(e.starts_at);
  let t = parisTime.format(s);
  if (e.ends_at) {
    const en = new Date(e.ends_at);
    t += parisDayKey(en) === parisDayKey(s) ? `–${parisTime.format(en)}` : ` → ${parisDay.format(en)} ${parisTime.format(en)}`;
  }
  return t;
}

function card(e) {
  const list = rsvpsFor(e.id);
  const going = list.filter((r) => r.status === 'going');
  const maybe = list.filter((r) => r.status === 'maybe');
  const mine = myRsvp(e.id);
  const place = e.place_id ? placeName(e.place_id) : null;
  const pastEvent = new Date(e.ends_at || e.starts_at).getTime() < Date.now();
  const avatars = going.slice(0, 6).map((r) => `<span title="${escapeHtml(nameOf(r.user_id))}">${avatarOf(r.user_id, 22)}</span>`).join('');
  return `
    <div class="ev ev-lilac" data-ev="${escapeHtml(e.id)}" style="${e.pending ? 'opacity:0.6' : ''}">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
        <div class="ev-when" style="color:var(--lilac)">${escapeHtml(whenText(e))}</div>
        ${canDeleteEvent(e) ? `<button class="del-btn" data-del-event="${escapeHtml(e.id)}" title="${e.created_by === state.auth?.id ? 'Delete your event' : 'Delete (admin)'}" aria-label="Delete event">×</button>` : ''}
      </div>
      <div class="ev-what">${escapeHtml(e.title)}</div>
      ${e.location || place ? `<div class="ev-where">${escapeHtml(e.location || '')}${e.location && place ? ' · ' : ''}${place ? `<a href="#guide" class="ev-place">📍 ${escapeHtml(place)}</a>` : ''}</div>` : ''}
      ${e.description ? `<div class="ev-desc">${escapeHtml(e.description)}</div>` : ''}
      <div class="ev-by">by ${authorHTML(e.created_by, e.created_handle)}</div>
      <div class="ev-rsvps">
        ${avatars}${going.length > 6 ? `<span class="ev-more">+${going.length - 6}</span>` : ''}
        <span class="ev-count">${going.length} going${maybe.length ? ` · ${maybe.length} maybe` : ''}</span>
      </div>
      ${pastEvent || e.pending ? '' : `
      <div class="ev-rsvp-row" role="group" aria-label="RSVP">
        <button class="ev-rsvp-btn ${mine === 'going' ? 'on' : ''}" data-rsvp="going" data-event="${escapeHtml(e.id)}" aria-pressed="${mine === 'going'}">${mine === 'going' ? '✓ going' : 'going'}</button>
        <button class="ev-rsvp-btn ${mine === 'maybe' ? 'on maybe' : ''}" data-rsvp="maybe" data-event="${escapeHtml(e.id)}" aria-pressed="${mine === 'maybe'}">${mine === 'maybe' ? '✓ maybe' : 'maybe'}</button>
      </div>`}
    </div>`;
}

function grouped(list) {
  const days = new Map();
  for (const e of list) {
    const k = parisDayKey(new Date(e.starts_at));
    if (!days.has(k)) days.set(k, []);
    days.get(k).push(e);
  }
  const todayKey = parisDayKey(new Date());
  return [...days.entries()].map(([k, evs]) => `
    <div class="ev-day">
      <div class="day-head ${k === todayKey ? 'today' : ''}">${parisDay.format(new Date(evs[0].starts_at)).toUpperCase()}${k === todayKey ? ' · TODAY' : ''}</div>
      <div class="ev-day-list">${evs.map(card).join('')}</div>
    </div>`).join('');
}

export function renderEvents() {
  const up = document.getElementById('events-upcoming');
  if (!up) return;
  const u = upcoming();
  const p = past();
  const going = u.reduce((n, e) => n + rsvpsFor(e.id).filter((r) => r.status === 'going').length, 0);
  document.getElementById('events-key').textContent = `EVENTS · ${u.length} upcoming · ${going} going`;
  up.innerHTML = u.length
    ? grouped(u)
    : '<div class="empty-state">No upcoming events — create the first one with “+ New event”.</div>';
  const pastWrap = document.getElementById('events-past-wrap');
  pastWrap.hidden = !p.length;
  document.getElementById('events-past-title').textContent = `PAST · ${p.length}`;
  document.getElementById('events-past').innerHTML = grouped(p);

  document.querySelectorAll('[data-rsvp]').forEach((b) =>
    b.addEventListener('click', async () => {
      const { error } = await setRsvp(b.dataset.event, b.dataset.rsvp, renderEvents);
      if (error) toast(`Couldn't save your RSVP: ${error.message}`);
    })
  );
  document.querySelectorAll('[data-del-event]').forEach((b) =>
    b.addEventListener('click', async () => {
      if (!confirm('Delete this event and its RSVPs for everyone?')) return;
      const { error } = await deleteEvent(b.dataset.delEvent, renderEvents);
      if (error) toast(`Couldn't delete it: ${error.message}`);
    })
  );
}

function openForm() {
  const form = document.getElementById('event-form');
  const min = dateToParisInput(new Date(Date.now() + 5 * 60e3));
  document.getElementById('ev-start').min = min;
  document.getElementById('ev-end').min = min;
  const sel = document.getElementById('ev-place');
  sel.innerHTML = '<option value="">— none —</option>' +
    getPlaces().filter((p) => !p.pending).map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join('');
  form.hidden = false;
  document.getElementById('ev-title').focus();
}

async function submit(e) {
  e.preventDefault();
  const v = (id) => document.getElementById(id).value.trim();
  const starts = parisInputToDate(v('ev-start'));
  const ends = v('ev-end') ? parisInputToDate(v('ev-end')) : null;
  if (!v('ev-title') || !starts) { toast('Give it a title and a start time.'); return; }
  if (starts.getTime() < Date.now()) { toast("An event can't start in the past."); return; }
  if (ends && ends <= starts) { toast('The end has to be after the start.'); return; }
  const fields = {
    title: v('ev-title').slice(0, 100),
    starts_at: starts.toISOString(),
    ends_at: ends ? ends.toISOString() : null,
    location: v('ev-location').slice(0, 200) || null,
    place_id: v('ev-place') || null,
    description: v('ev-description').slice(0, 800) || null,
  };
  const form = document.getElementById('event-form');
  form.reset();
  form.hidden = true;
  const { error } = await createEvent(fields, renderEvents);
  toast(error ? `Couldn't create it: ${error.message}` : 'Event created.');
}

function imBored() {
  const btn = document.getElementById('bored-btn');
  btn.classList.remove('spin');
  void btn.offsetWidth;
  btn.classList.add('spin');
  document.querySelectorAll('.ev.focus').forEach((x) => x.classList.remove('focus'));
  const weekAhead = Date.now() + 7 * 864e5;
  const soon = upcoming().filter((e) => !e.pending && new Date(e.starts_at).getTime() <= weekAhead);
  if (soon.length) {
    const pick = soon[Math.floor(Math.random() * soon.length)];
    setTimeout(() => {
      const el = document.querySelector(`.ev[data-ev="${CSS.escape(pick.id)}"]`);
      el?.classList.add('focus');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast(`→ ${pick.title} · ${parisDay.format(new Date(pick.starts_at))} ${parisTime.format(new Date(pick.starts_at))}`);
    }, 350);
    return;
  }
  const spots = getPlaces().filter((p) => !p.pending);
  if (spots.length) {
    const pick = spots[Math.floor(Math.random() * spots.length)];
    toast(`Nothing planned this week — try ${pick.name} from the Guide.`);
    state.guideCat = pick.category;
    setTimeout(() => nav('guide'), 900);
    return;
  }
  toast('Nothing planned this week and no Guide spots yet — create an event?');
}

export function initEvents() {
  const root = document.querySelector('.subview[data-sub="events"]');
  root.querySelector('#bored-btn').addEventListener('click', imBored);
  root.querySelector('[data-new-event]').addEventListener('click', openForm);
  root.querySelector('[data-cancel-event]').addEventListener('click', () => {
    const f = document.getElementById('event-form'); f.reset(); f.hidden = true;
  });
  root.querySelector('#event-form').addEventListener('submit', submit);
  renderEvents();
  if (!state.auth) return;
  Promise.all([loadEvents(), getPlaces().length ? null : loadPlaces()]).then(renderEvents);
  subscribeEvents(renderEvents);
  setInterval(() => { if (!document.getElementById('event-form')?.contains(document.activeElement)) renderEvents(); }, 60000);
}
