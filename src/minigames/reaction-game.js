// Reaction timer — how fast can you react when the screen turns green?
//
// A run is 5 rounds; your score is the average of the 5 times. Each round is
// timed by the server too (src/core/game-scores.js → start_round /
// finish_round): the server picks the random 1.5–4 s wait, and rejects a time
// that doesn't match what it measured itself. Pressing during a wait is "too
// early" and voids the run. Works with mouse, touch (pointer events) and
// Space / Enter while the game is open.
//
// Next to the game: a leaderboard (this week / all time, one row per person,
// lowest average first), your personal best and your last 5 runs. It updates
// live when anyone sets a score.
//
// Registry contract: mount(container) / unmount(). Every listener goes
// through one AbortController and every timer is tracked, so unmount()
// leaves nothing behind.

import { state } from '../core/state.js';
import { escapeHtml } from '../utils/html.js';
import { flagHTML } from '../core/countries.js';
import { avatarOf, nameOf, profileOf } from '../core/people.js';
import { startRound, finishRound, leaderboard, myScores, onScoresChange } from '../core/game-scores.js';

const GAME_ID = 'reaction';
const ROUNDS = 5;
const NEXT_ROUND_PAUSE_MS = 900;

let ctl = null;
let timers = new Set();
let frame = null;
let offScores = null;
let els = null;

// phase: 'idle' | 'starting' | 'waiting' | 'go' | 'sending' | 'between' | 'done' | 'void'
let run = null;     // { id, round, roundId, times: [], phase, goAt }
let scope = 'week';

const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
const clearTimers = () => { for (const t of timers) clearTimeout(t); timers.clear(); };

function setScreen(text, bg, fg) {
  els.screen.textContent = text;
  els.screen.style.background = bg;
  els.screen.style.color = fg;
}

function renderDots() {
  els.dots.innerHTML = Array.from({ length: ROUNDS }, (_, i) => {
    const t = run?.times[i];
    const cls = t != null ? 'done' : run && run.round === i + 1 && ['waiting', 'go', 'sending', 'starting'].includes(run.phase) ? 'now' : '';
    return `<span class="rx-dot ${cls}" title="Round ${i + 1}${t != null ? `: ${t} ms` : ''}"></span>`;
  }).join('');
  els.times.innerHTML = run?.times.length
    ? run.times.map((t, i) => `<span>R${i + 1} <b>${t}</b> ms</span>`).join('')
    : '';
}

function showIdle(msg) {
  run = run && ['done', 'void'].includes(run.phase) ? run : null;
  els.startBtn.hidden = false;
  els.startBtn.textContent = run ? 'Start a new run' : 'Start run';
  if (msg) els.msg.textContent = msg;
}

async function beginRound() {
  run.phase = 'starting';
  renderDots();
  setScreen(`round ${run.round} of ${ROUNDS} — get ready…`, 'var(--surface-2)', 'var(--muted)');
  let r;
  try {
    r = await startRound(GAME_ID, run.id);
  } catch (e) {
    if (!els) return;
    run.phase = 'void';
    setScreen("couldn't start the round", 'var(--surface-2)', 'var(--fg)');
    showIdle(e.message);
    return;
  }
  if (!els || !run) return;
  run.id = r.run_id;
  run.roundId = r.round_id;
  run.phase = 'waiting';
  setScreen('wait for green…', 'var(--surface-2)', 'var(--muted)');
  later(() => {
    if (!els || run?.phase !== 'waiting') return;
    setScreen('NOW!', 'var(--mint)', 'var(--on-accent)');
    run.phase = 'arming';
    // Start the clock on the frame the green actually reaches the screen.
    frame = requestAnimationFrame(() => {
      frame = null;
      if (!run || run.phase !== 'arming') return;
      run.goAt = performance.now();
      run.phase = 'go';
    });
  }, r.delay_ms);
}

function startRun() {
  clearTimers();
  run = { id: null, round: 1, roundId: null, times: [], phase: 'idle', goAt: 0 };
  els.startBtn.hidden = true;
  els.msg.textContent = '';
  els.result.innerHTML = '';
  beginRound();
}

async function tooEarly() {
  clearTimers();
  if (frame) { cancelAnimationFrame(frame); frame = null; }
  const roundId = run.roundId;
  run.phase = 'void';
  setScreen('too early — run void', 'var(--coral)', 'var(--on-accent)');
  renderDots();
  showIdle('Pressed before green. The run is void — start a new one.');
  try { await finishRound(roundId, null, true); } catch (e) { /* already void locally */ }
}

async function react(at) {
  const ms = Math.max(0, Math.round(at - run.goAt));
  run.phase = 'sending';
  setScreen(`${ms} ms`, 'var(--surface-2)', 'var(--fg)');
  let res;
  try {
    res = await finishRound(run.roundId, ms, false);
  } catch (e) {
    if (!els) return;
    run.phase = 'void';
    showIdle(e.message);
    return;
  }
  if (!els || !run) return;
  if (res.status !== 'done') {
    run.phase = 'void';
    renderDots();
    setScreen(res.status === 'expired' ? 'round timed out' : 'round rejected', 'var(--surface-2)', 'var(--fg)');
    showIdle(`The server didn't accept that round (${res.reason || res.status}). Start a new run.`);
    return;
  }
  run.times.push(res.client_ms);
  renderDots();
  if (res.run_complete) {
    run.phase = 'done';
    setScreen(`${res.score} ms average`, 'var(--surface-2)', 'var(--fg)');
    els.result.innerHTML = `
      <div class="rx-score">${escapeHtml(String(res.score))} <small>ms average</small></div>
      ${res.personal_best ? '<div class="rx-pb">★ new personal best</div>' : ''}
      <div class="rx-rank">#${res.rank_week} this week · #${res.rank_all_time} all time</div>`;
    showIdle('');
    refreshBoards();
    return;
  }
  run.phase = 'between';
  run.round += 1;
  later(() => { if (els && run?.phase === 'between') beginRound(); }, NEXT_ROUND_PAUSE_MS);
}

// Every input (pointer, Space, Enter) lands here. `at` is the event's
// timeStamp, on the same clock as performance.now().
function press(at) {
  if (!run || run.phase === 'done' || run.phase === 'void') { startRun(); return; }
  if (run.phase === 'waiting') { tooEarly(); return; }
  if (run.phase === 'go') { react(at); }
  // 'starting' / 'arming' / 'sending' / 'between': ignore
}

// ---- leaderboard, personal best, last runs ----
function personCell(userId) {
  const p = profileOf(userId);
  const name = nameOf(userId);
  return `${avatarOf(userId, 22)}${flagHTML(p?.country_code)}<span class="author-name" title="${escapeHtml(name)}">${escapeHtml(name)}</span>`;
}

function boardRow(r, me) {
  return `<li class="rx-row ${me ? 'me' : ''}"><span class="rx-rank-n">${r.rank}</span><span class="rx-who">${personCell(r.user_id)}</span><span class="rx-ms">${escapeHtml(String(r.score))} ms</span></li>`;
}

async function refreshBoards() {
  if (!els) return;
  const [rows, mine] = await Promise.all([leaderboard(GAME_ID, scope), myScores(GAME_ID, 5)]);
  if (!els) return;
  const me = state.auth?.id;
  const top = rows.slice(0, 10);
  const myRow = rows.find((r) => r.user_id === me);
  els.board.innerHTML = rows.length
    ? `<ol class="rx-board">${top.map((r) => boardRow(r, r.user_id === me)).join('')}</ol>
       ${myRow && myRow.rank > 10 ? `<div class="rx-pinned-sep">…</div><ol class="rx-board">${boardRow(myRow, true)}</ol>` : ''}`
    : '<div class="empty-state" style="padding:20px">No scores yet. Set the first one.</div>';
  els.mine.innerHTML = mine.best
    ? `<div class="rx-best">Personal best <b>${escapeHtml(String(mine.best.score))} ms</b></div>
       <ul class="rx-recent">${mine.recent.map((s) => `<li><b>${escapeHtml(String(s.score))} ms</b> <span>${(s.details || []).join(' · ')}</span></li>`).join('')}</ul>`
    : '<div style="font-size:13px;color:var(--muted)">No runs yet — your scores show up here.</div>';
}

function render(container) {
  container.innerHTML = `
    <div class="rx-wrap">
      <div class="mg-reaction">
        <div class="mg-reaction-title">REACTION · 5 ROUNDS</div>
        <div class="rx-dots" aria-label="Rounds"></div>
        <button type="button" class="mg-reaction-screen" aria-live="polite"></button>
        <div class="rx-times"></div>
        <div class="rx-result" aria-live="polite"></div>
        <button type="button" class="btn btn-primary rx-start">Start run</button>
        <div class="mg-reaction-hint">click, tap, or press Space / Enter · pressing before green voids the run</div>
        <div class="rx-msg" aria-live="polite"></div>
      </div>
      <aside class="rx-side">
        <div class="filter-tabs" role="group" aria-label="Leaderboard">
          <button class="filter-tab on" data-scope="week" aria-pressed="true">This week</button>
          <button class="filter-tab" data-scope="all" aria-pressed="false">All time</button>
        </div>
        <div class="rx-board-wrap"></div>
        <div class="page-key" style="margin-top:18px">YOU</div>
        <div class="rx-mine"></div>
      </aside>
    </div>`;
  els = {
    screen: container.querySelector('.mg-reaction-screen'),
    dots: container.querySelector('.rx-dots'),
    times: container.querySelector('.rx-times'),
    result: container.querySelector('.rx-result'),
    startBtn: container.querySelector('.rx-start'),
    msg: container.querySelector('.rx-msg'),
    board: container.querySelector('.rx-board-wrap'),
    mine: container.querySelector('.rx-mine'),
  };
  setScreen('press Start run (or Space)', 'var(--surface-2)', 'var(--muted)');
  renderDots();
  const signal = ctl.signal;

  // Pointer events cover mouse, pen and touch, and fire on press.
  els.screen.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    press(e.timeStamp);
  }, { signal });
  els.screen.addEventListener('click', (e) => e.preventDefault(), { signal });
  els.startBtn.addEventListener('click', () => startRun(), { signal });

  // Space / Enter anywhere while the game is open. Capture phase + stop, so
  // the plaza's "say hi" and page scrolling never see these keys.
  window.addEventListener('keydown', (e) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!e.repeat) press(e.timeStamp);
  }, { capture: true, signal });

  container.querySelectorAll('[data-scope]').forEach((b) => b.addEventListener('click', () => {
    scope = b.dataset.scope;
    container.querySelectorAll('[data-scope]').forEach((x) => {
      x.classList.toggle('on', x === b);
      x.setAttribute('aria-pressed', String(x === b));
    });
    refreshBoards();
  }, { signal }));

  offScores = onScoresChange(() => refreshBoards());
  refreshBoards();
}

export default {
  id: GAME_ID,
  title: 'Reaction timer',
  blurb: 'Five rounds: wait for green, then press. Lowest average wins the week.',
  mount(container) {
    this.unmount();
    ctl = new AbortController();
    run = null;
    render(container);
  },
  unmount() {
    ctl?.abort();
    ctl = null;
    clearTimers();
    if (frame) cancelAnimationFrame(frame);
    frame = null;
    offScores?.();
    offScores = null;
    // Leaving mid-round voids it on the server, so the next run can start
    // right away instead of waiting for the round to expire.
    if (run?.roundId && ['waiting', 'arming', 'go'].includes(run.phase)) {
      finishRound(run.roundId, null, true).catch(() => {});
    }
    run = null;
    els = null;
  },
};
