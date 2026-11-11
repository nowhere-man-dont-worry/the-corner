// Council — motions the class raises and votes on in secret (yes / no /
// abstain). Live tallies show counts only. Past closes_at a motion reads as
// closed; an admin records what happened (brought to pedagogy, resolved) and
// the outcome note shows here for everyone. See src/core/council.js.

import { state } from '../core/state.js';
import { toast } from '../core/toast.js';
import { escapeHtml } from '../utils/html.js';
import { authorHTML } from '../core/people.js';
import {
  getMotions, tallyOf, myVoteOn, effectiveStatus, isOpen, openCount,
  loadCouncil, raiseMotion, castMotionVote, setOutcome, deleteMotion,
  canDeleteMotion, subscribeCouncil,
} from '../core/council.js';

export const councilHTML = `
  <div class="page">
    <div class="page-head">
      <div class="page-key" id="council-key">THE COUNCIL · MSCI 1</div>
      <h1 class="page-title">What should we <span class="accent">actually do</span> about it?</h1>
      <p style="font-size:14px;color:var(--muted);margin:8px 0 0;max-width:640px">Anyone can raise a motion. The whole class votes — in secret, only the totals show. Whatever passes gets brought to the pedagogy team, and the answer comes back here.</p>
    </div>

    <div class="page-wrap">
      <div class="council-grid">
        <div id="council-main"></div>
        <aside>
          <form class="side-card" id="motion-form">
            <div class="side-key">RAISE A MOTION</div>
            <div class="side-body" style="margin-bottom:12px">Something broken? Something missing? Say what you'd change in one line. Voting stays open for 7 days.</div>
            <label class="sr-only" for="motion-title">Motion</label>
            <input class="profile-input" id="motion-title" maxlength="120" placeholder="e.g. fix the printer on floor 2" required/>
            <label class="sr-only" for="motion-body">Details</label>
            <textarea class="side-ta" id="motion-body" maxlength="1000" placeholder="why it matters (optional)" style="margin-top:8px"></textarea>
            <div style="display:flex;gap:6px;margin-top:10px;align-items:center">
              <span style="font-size:12px;color:var(--dim)">raised with your name</span>
              <button class="btn btn-primary" type="submit" style="margin-left:auto;padding:9px 14px;font-size:13px">Raise it</button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  </div>
`;

const STATUS_PILL = {
  open: '<span class="pill pill-live">● OPEN</span>',
  closed: '<span class="pill pill-wait">◐ VOTING CLOSED</span>',
  brought_to_pedagogy: '<span class="pill pill-done">→ BROUGHT TO PEDAGOGY</span>',
  resolved: '<span class="pill pill-win">✓ RESOLVED</span>',
};

const paris = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'closed';
  const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4);
  return d ? `${d}d ${h}h left` : h ? `${h}h ${m}m left` : `${m}m left`;
}

function tallyHTML(m) {
  const t = tallyOf(m.id);
  const total = t.yes + t.no + t.abstain;
  const row = (k, label, cls) => {
    const pct = total ? Math.round((t[k] / total) * 100) : 0;
    return `<div class="vote-row">
      <div class="vote-label ${cls}">${label}</div>
      <div class="vote-track"><div class="vote-fill ${cls}" style="width:${Math.max(pct, 2)}%"><span>${t[k]}</span></div></div>
      <div class="vote-pct">${pct}%</div>
    </div>`;
  };
  return `<div class="tally" data-total="${total}">${row('yes', 'Yes', 'yes')}${row('no', 'No', 'no')}${row('abstain', 'Abstain', 'meh')}</div>`;
}

function adminHTML(m) {
  if (!state.isAdmin || m.pending) return '';
  const st = m.status;
  return `<details class="admin-box">
    <summary>Admin · record the outcome</summary>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
      <select class="profile-input" data-outcome-status="${escapeHtml(m.id)}" aria-label="Status">
        ${['open', 'closed', 'brought_to_pedagogy', 'resolved'].map((s) => `<option value="${s}" ${s === st ? 'selected' : ''}>${s.replace(/_/g, ' ')}</option>`).join('')}
      </select>
      <textarea class="profile-ta" data-outcome-note="${escapeHtml(m.id)}" maxlength="500" placeholder="outcome note (what pedagogy said, what happens next)" style="margin:0">${escapeHtml(m.outcome_note || '')}</textarea>
      <button class="btn btn-ghost" type="button" data-outcome-save="${escapeHtml(m.id)}" style="padding:8px 12px;font-size:12px;align-self:flex-end">Save outcome</button>
    </div>
  </details>`;
}

function deleteBtn(m) {
  return canDeleteMotion(m)
    ? `<button class="del-btn" data-del-motion="${escapeHtml(m.id)}" title="${m.created_by === state.auth?.id ? 'Delete your motion' : 'Delete (admin)'}" aria-label="Delete motion">×</button>`
    : '';
}

function openCard(m) {
  const mine = myVoteOn(m.id);
  const t = tallyOf(m.id);
  const voted = t.yes + t.no + t.abstain;
  return `
    <div class="motion" style="${m.pending ? 'opacity:0.6' : ''}">
      <div class="motion-top">
        ${STATUS_PILL.open}
        <span style="font-size:12px;color:var(--muted);display:flex;align-items:center;gap:8px">closes <span style="color:var(--fg)">${paris.format(new Date(m.closes_at))}</span> · ${timeLeft(m.closes_at)} ${deleteBtn(m)}</span>
      </div>
      <h2 class="motion-h">${escapeHtml(m.title)}</h2>
      ${m.body ? `<p class="sug-body" style="margin:-4px 0 10px">${escapeHtml(m.body)}</p>` : ''}
      <div class="motion-meta">raised by ${authorHTML(m.created_by, m.created_handle)} · ${voted} ${voted === 1 ? 'vote' : 'votes'} so far${mine ? ` · you voted <b>${mine}</b>` : ''}</div>
      ${tallyHTML(m)}
      <div class="vote-btns" role="group" aria-label="Your vote">
        <button class="vote-btn yes ${mine === 'yes' ? 'on' : ''}" data-vote="yes" data-motion="${escapeHtml(m.id)}" aria-pressed="${mine === 'yes'}" ${m.pending ? 'disabled' : ''}>Yes</button>
        <button class="vote-btn no ${mine === 'no' ? 'on' : ''}" data-vote="no" data-motion="${escapeHtml(m.id)}" aria-pressed="${mine === 'no'}" ${m.pending ? 'disabled' : ''}>No</button>
        <button class="vote-btn meh ${mine === 'abstain' ? 'on' : ''}" data-vote="abstain" data-motion="${escapeHtml(m.id)}" aria-pressed="${mine === 'abstain'}" ${m.pending ? 'disabled' : ''}>Abstain</button>
      </div>
      ${adminHTML(m)}
    </div>`;
}

function pastRow(m) {
  const t = tallyOf(m.id);
  const st = effectiveStatus(m);
  return `
    <div class="past" style="flex-wrap:wrap">
      ${STATUS_PILL[st] || ''}
      <div class="what" style="flex:1;min-width:180px">${escapeHtml(m.title)}
        <div style="font-size:12px;color:var(--muted);margin-top:3px">raised by ${authorHTML(m.created_by, m.created_handle)} · ${t.yes} yes · ${t.no} no · ${t.abstain} abstain</div>
        ${m.outcome_note ? `<div class="sug-status ok" style="margin-top:6px">${escapeHtml(m.outcome_note)}</div>` : ''}
      </div>
      ${deleteBtn(m)}
      ${adminHTML(m)}
    </div>`;
}

export function renderCouncilDoor() {
  const el = document.getElementById('door-council-count');
  if (!el) return;
  const n = openCount();
  el.textContent = n ? `${n} ${n === 1 ? 'vote' : 'votes'} open` : '';
}

export function renderCouncil() {
  renderCouncilDoor();
  const main = document.getElementById('council-main');
  if (!main) return;
  const all = getMotions();
  const open = all.filter((m) => m.pending || isOpen(m));
  const closed = all.filter((m) => !m.pending && effectiveStatus(m) === 'closed');
  const outcomes = all.filter((m) => !m.pending && ['brought_to_pedagogy', 'resolved'].includes(m.status));
  const key = document.getElementById('council-key');
  if (key) key.textContent = `THE COUNCIL · MSCI 1 · ${open.length} OPEN`;

  if (!all.length) {
    main.innerHTML = '<div class="empty-state">No motions yet — raise one. <br/><span style="font-size:12px;color:var(--dim)">Use the form on the right.</span></div>';
    return;
  }
  const section = (title, rows, empty) => `
    <div class="page-key" style="margin:6px 0 10px">${title}</div>
    ${rows.length ? rows.join('') : `<div class="empty-state" style="padding:18px;margin-bottom:18px">${empty}</div>`}`;
  main.innerHTML =
    section('ON THE TABLE', open.map(openCard), 'No open motions right now — raise one.') +
    section('VOTING CLOSED', closed.map(pastRow), 'Nothing waiting on an outcome.') +
    section('OUTCOMES', outcomes.map(pastRow), 'No outcomes recorded yet.');

  main.querySelectorAll('[data-vote]').forEach((b) =>
    b.addEventListener('click', async () => {
      const { error } = await castMotionVote(b.dataset.motion, b.dataset.vote, renderCouncil);
      if (error) toast(`Couldn't save your vote: ${error.message}`);
    })
  );
  main.querySelectorAll('[data-del-motion]').forEach((b) =>
    b.addEventListener('click', async () => {
      if (!confirm('Delete this motion and its votes for everyone?')) return;
      const { error } = await deleteMotion(b.dataset.delMotion, renderCouncil);
      if (error) toast(`Couldn't delete it: ${error.message}`);
    })
  );
  main.querySelectorAll('[data-outcome-save]').forEach((b) =>
    b.addEventListener('click', async () => {
      const id = b.dataset.outcomeSave;
      const status = main.querySelector(`[data-outcome-status="${id}"]`).value;
      const note = main.querySelector(`[data-outcome-note="${id}"]`).value.trim().slice(0, 500);
      b.disabled = true;
      const { error } = await setOutcome(id, status, note);
      b.disabled = false;
      toast(error ? `Couldn't save: ${error.message}` : 'Outcome saved.');
    })
  );
}

async function submit(e) {
  e.preventDefault();
  const titleEl = document.getElementById('motion-title');
  const bodyEl = document.getElementById('motion-body');
  const title = titleEl.value.trim();
  const body = bodyEl.value.trim() || null;
  if (!title) return;
  titleEl.value = '';
  bodyEl.value = '';
  const { error } = await raiseMotion({ title: title.slice(0, 120), body: body?.slice(0, 1000) ?? null }, renderCouncil);
  if (error) {
    toast(`Couldn't raise it: ${error.message}`);
    titleEl.value = title;
    bodyEl.value = body || '';
  }
}

export function initCouncil() {
  const root = document.querySelector('.subview[data-sub="council"]');
  root.querySelector('#motion-form').addEventListener('submit', submit);
  renderCouncil();
  if (!state.auth) return;
  loadCouncil().then(renderCouncil);
  subscribeCouncil(renderCouncil);
  // Countdowns and "past closes_at reads as closed" without a reload.
  setInterval(renderCouncilIfIdle, 60000);
}

function renderCouncilIfIdle() {
  const a = document.activeElement;
  if (a && a.closest?.('#council-main') && /TEXTAREA|SELECT|INPUT/.test(a.tagName)) return;
  renderCouncil();
}
