// Suggestions — drop an idea, up/down vote (click the same arrow again to
// take your vote back), sort by Top or New, and talk it through in an inline
// comment thread. Everything is live (see src/core/suggestions.js).

import { state } from '../core/state.js';
import { toast } from '../core/toast.js';
import { escapeHtml } from '../utils/html.js';
import { formatTime } from '../utils/time.js';
import { authorHTML, avatarOf } from '../core/people.js';
import {
  getSuggestions, loadSuggestions, postSuggestion, vote, deleteSuggestion,
  getComments, commentsAreLoaded, loadComments, addComment, deleteComment,
  canDelete, subscribeSuggestions, recentCount,
} from '../core/suggestions.js';

export const suggestionsHTML = `
  <div class="page">
    <div class="page-head">
      <div class="sugg-head-row">
        <div>
          <div class="page-key" id="sugg-key">SUGGESTIONS</div>
          <h1 class="page-title">Got an idea? <span class="accent">Drop it in.</span></h1>
        </div>
        <div class="filter-tabs" role="group" aria-label="Sort suggestions">
          <button class="filter-tab on" data-sort="top" aria-pressed="true">Top</button>
          <button class="filter-tab" data-sort="new" aria-pressed="false">New</button>
        </div>
      </div>
    </div>

    <div class="page-wrap">
      <div class="sugg-grid">
        <div>
          <form class="drop-box" id="sugg-form">
            <div class="drop-icon">+</div>
            <div class="sug-form">
              <label class="sr-only" for="sugg-title">Suggestion</label>
              <input class="profile-input" id="sugg-title" maxlength="120" placeholder="your idea in one line — a kettle in the Hub? movie night in English?" required/>
              <label class="sr-only" for="sugg-body">Details</label>
              <textarea class="profile-ta" id="sugg-body" maxlength="1000" placeholder="details (optional)"></textarea>
              <div class="sug-actions">
                <span style="font-size:12px;color:var(--dim)">posted with your name</span>
                <button class="btn btn-primary" type="submit" style="margin-left:auto;padding:8px 16px;font-size:13px">Drop it</button>
              </div>
            </div>
          </form>

          <div id="sugg-list"></div>
        </div>

        <aside>
          <div class="side-card">
            <div class="side-key">HOW THIS WORKS</div>
            <ol style="margin:0;padding-left:20px;font-size:13px;color:var(--body);line-height:1.75">
              <li>Anyone in the class drops an idea.</li>
              <li>Everyone votes it up or down, once each.</li>
              <li>The top ones get raised as motions in the Council.</li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  </div>
`;

let sort = 'top';
const expanded = new Set();

function sorted() {
  const list = [...getSuggestions()];
  if (sort === 'top') {
    list.sort((a, b) => b.score - a.score || new Date(b.created_at) - new Date(a.created_at));
  } else {
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  return list;
}

export function renderSuggestionsBadge() {
  const badge = document.getElementById('sugg-badge');
  if (!badge) return;
  const n = recentCount(7);
  badge.hidden = n === 0;
  badge.textContent = n ? String(n) : '';
  badge.title = n ? `${n} new in the last 7 days` : '';
}

function commentsHTML(s) {
  if (!commentsAreLoaded(s.id)) return '<div class="cmt-empty" style="font-size:12px;color:var(--dim);padding:4px 0">loading…</div>';
  const list = getComments(s.id);
  const body = list.length
    ? list.map((c) => `
      <div class="cmt" style="${c.pending ? 'opacity:0.6' : ''}">
        ${avatarOf(c.created_by, 22)}
        <div class="cmt-body">
          <div class="cmt-head">${authorHTML(c.created_by, c.created_handle)} <span>${c.pending ? 'sending…' : formatTime(new Date(c.created_at).getTime())}</span>
            ${canDelete(c) ? `<button class="del-btn" data-del-cmt="${escapeHtml(c.id)}" data-sid="${escapeHtml(s.id)}" title="${c.created_by === state.auth?.id ? 'Delete your comment' : 'Delete (admin)'}" aria-label="Delete comment">×</button>` : ''}
          </div>
          <div class="cmt-text">${escapeHtml(c.body)}</div>
        </div>
      </div>`).join('')
    : '<div class="cmt-empty" style="font-size:12px;color:var(--dim);font-style:italic;padding:4px 0">No comments yet — start the thread.</div>';
  return `${body}
    <div class="cmt-input-row">
      <input class="cmt-input" placeholder="reply…" maxlength="500" data-sug="${escapeHtml(s.id)}" aria-label="Reply"/>
      <button class="cmt-send" data-send="${escapeHtml(s.id)}">send</button>
    </div>`;
}

export function renderSuggestions() {
  const list = document.getElementById('sugg-list');
  if (!list) return;
  const all = getSuggestions();
  const key = document.getElementById('sugg-key');
  if (key) key.textContent = `SUGGESTIONS · ${all.filter((s) => !s.pending).length}`;
  renderSuggestionsBadge();

  if (!all.length) {
    list.innerHTML = '<div class="empty-state">No suggestions yet — drop the first one above.</div>';
    return;
  }

  // Keep a half-typed reply across live re-renders.
  const drafts = {};
  list.querySelectorAll('.cmt-input').forEach((i) => { if (i.value) drafts[i.dataset.sug] = i.value; });
  const focused = document.activeElement?.classList?.contains('cmt-input') ? document.activeElement.dataset.sug : null;

  list.innerHTML = sorted().map((s) => {
    const open = expanded.has(s.id);
    const scoreClass = s.my_vote === 1 ? 'pos' : s.my_vote === -1 ? 'neg' : '';
    const cmtLabel = s.comment_count === 1 ? '1 comment' : `${s.comment_count} comments`;
    return `
      <div class="sug ${open ? 'expanded' : ''}" style="${s.pending ? 'opacity:0.6' : ''}">
        <div class="vote-col">
          <button class="arrow up ${s.my_vote === 1 ? 'on' : ''}" data-id="${escapeHtml(s.id)}" data-dir="1" aria-label="upvote" aria-pressed="${s.my_vote === 1}" ${s.pending ? 'disabled' : ''}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 2l5 6H9v4H5V8H2l5-6z" fill="currentColor"/></svg>
          </button>
          <div class="score ${scoreClass}">${s.score}</div>
          <button class="arrow down ${s.my_vote === -1 ? 'on' : ''}" data-id="${escapeHtml(s.id)}" data-dir="-1" aria-label="downvote" aria-pressed="${s.my_vote === -1}" ${s.pending ? 'disabled' : ''}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 12L2 6h3V2h4v4h3l-5 6z" fill="currentColor"/></svg>
          </button>
        </div>
        <div style="flex:1;min-width:0">
          <div class="sug-top">
            <span class="sug-meta">${authorHTML(s.created_by, s.created_handle)} · ${s.pending ? 'posting…' : formatTime(new Date(s.created_at).getTime())}</span>
            ${canDelete(s) ? `<button class="del-btn" style="margin-left:auto" data-del-sug="${escapeHtml(s.id)}" title="${s.created_by === state.auth?.id ? 'Delete your suggestion' : 'Delete (admin)'}" aria-label="Delete suggestion">×</button>` : ''}
          </div>
          <div class="sug-h">${escapeHtml(s.title)}</div>
          ${s.body ? `<div class="sug-body">${escapeHtml(s.body)}</div>` : ''}
          <button class="sug-cmts-btn" data-cmt-id="${escapeHtml(s.id)}" ${s.pending ? 'disabled' : ''}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 3a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H6l-3 3V3z" stroke="currentColor" stroke-width="1.3" fill="none"/></svg>
            ${cmtLabel}${open ? ' · hide' : ''}
          </button>
          <div class="sug-cmts">${open ? commentsHTML(s) : ''}</div>
        </div>
      </div>`;
  }).join('');

  list.querySelectorAll('.cmt-input').forEach((i) => {
    if (drafts[i.dataset.sug]) i.value = drafts[i.dataset.sug];
    if (focused === i.dataset.sug) i.focus();
  });

  list.querySelectorAll('.arrow').forEach((b) =>
    b.addEventListener('click', async () => {
      const { error } = await vote(b.dataset.id, +b.dataset.dir, renderSuggestions);
      if (error) toast(`Couldn't save your vote: ${error.message}`);
    })
  );
  list.querySelectorAll('.sug-cmts-btn').forEach((b) =>
    b.addEventListener('click', async () => {
      const id = b.dataset.cmtId;
      if (expanded.has(id)) { expanded.delete(id); renderSuggestions(); return; }
      expanded.add(id);
      renderSuggestions();
      await loadComments(id);
      renderSuggestions();
      document.querySelector(`.cmt-input[data-sug="${id}"]`)?.focus();
    })
  );
  list.querySelectorAll('.cmt-send').forEach((b) => b.addEventListener('click', () => sendComment(b.dataset.send)));
  list.querySelectorAll('.cmt-input').forEach((inp) =>
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendComment(inp.dataset.sug); })
  );
  list.querySelectorAll('[data-del-sug]').forEach((b) =>
    b.addEventListener('click', async () => {
      if (!confirm('Delete this suggestion and its comments for everyone?')) return;
      const { error } = await deleteSuggestion(b.dataset.delSug, renderSuggestions);
      if (error) toast(`Couldn't delete it: ${error.message}`);
    })
  );
  list.querySelectorAll('[data-del-cmt]').forEach((b) =>
    b.addEventListener('click', async () => {
      const { error } = await deleteComment(b.dataset.sid, b.dataset.delCmt, renderSuggestions);
      if (error) toast(`Couldn't delete that comment: ${error.message}`);
    })
  );
}

async function sendComment(sid) {
  const input = document.querySelector(`.cmt-input[data-sug="${sid}"]`);
  const text = input?.value.trim();
  if (!text) return;
  input.value = '';
  const { error } = await addComment(sid, text.slice(0, 500), renderSuggestions);
  if (error) {
    toast(`Couldn't post that comment: ${error.message}`);
    const again = document.querySelector(`.cmt-input[data-sug="${sid}"]`);
    if (again && !again.value) again.value = text;
  }
}

async function submit(e) {
  e.preventDefault();
  const titleEl = document.getElementById('sugg-title');
  const bodyEl = document.getElementById('sugg-body');
  const title = titleEl.value.trim();
  const body = bodyEl.value.trim() || null;
  if (!title) { toast('Write your idea in one line first.'); return; }
  titleEl.value = '';
  bodyEl.value = '';
  sort = 'new';
  syncSortTabs();
  const { error } = await postSuggestion({ title: title.slice(0, 120), body: body?.slice(0, 1000) ?? null }, renderSuggestions);
  if (error) {
    toast(`Couldn't post it: ${error.message}`);
    titleEl.value = title;
    bodyEl.value = body || '';
  }
}

function syncSortTabs() {
  document.querySelectorAll('[data-sort]').forEach((b) => {
    b.classList.toggle('on', b.dataset.sort === sort);
    b.setAttribute('aria-pressed', String(b.dataset.sort === sort));
  });
}

export function initSuggestions() {
  const root = document.querySelector('.subview[data-sub="suggestions"]');
  root.querySelector('#sugg-form').addEventListener('submit', submit);
  root.querySelectorAll('[data-sort]').forEach((b) =>
    b.addEventListener('click', () => { sort = b.dataset.sort; syncSortTabs(); renderSuggestions(); })
  );
  renderSuggestions();
  if (!state.auth) return;
  loadSuggestions().then(renderSuggestions);
  subscribeSuggestions(renderSuggestions);
}
