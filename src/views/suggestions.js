// Suggestions — upvote / downvote (Reddit-style), expandable comment threads,
// a "drop it" composer. Comments persist in localStorage per suggestion.

import { state } from '../core/state.js';
import { toast } from '../core/toast.js';
import { avatarSVG } from '../avatars/render.js';
import { SUGGESTIONS } from '../data/suggestions.js';
import { SEED_SUG_COMMENTS } from '../data/suggestion-comments.js';
import { escapeHtml } from '../utils/html.js';
import { formatTime } from '../utils/time.js';
import { load, save } from '../utils/storage.js';

export const suggestionsHTML = `
  <div class="page">
    <div class="page-head">
      <div class="sugg-head-row">
        <div>
          <div class="page-key">SUGGESTIONS · 42 open · 11 done</div>
          <h1 class="page-title">Got an idea? <span class="accent">Drop it in.</span></h1>
        </div>
        <div class="filter-tabs">
          <button class="filter-tab on">Hot</button>
          <button class="filter-tab">New</button>
          <button class="filter-tab">Mine</button>
          <button class="filter-tab">Done</button>
        </div>
      </div>
    </div>

    <div class="page-wrap">
      <div class="sugg-grid">
        <div>
          <div class="drop-box">
            <div class="drop-icon">+</div>
            <div style="flex:1;min-width:0">
              <textarea class="drop-ta" placeholder="anything — can we get a kettle in the Hub? movie night in English for once? saturday Pokémon tournament? there are no dumb ideas, only bored people…"></textarea>
              <div class="drop-foot">
                <div class="drop-tags">
                  <label style="display:flex;align-items:center;gap:6px"><input type="checkbox" style="accent-color:var(--coral)" checked/> post anonymously</label>
                  <span style="color:var(--dim)">·</span>
                  <span>tag:</span>
                  <span class="tag" style="color:var(--butter)">events</span>
                  <span class="tag">campus</span>
                  <span class="tag">pedagogy</span>
                  <span class="tag">food</span>
                </div>
                <button class="btn btn-primary" data-drop style="padding:8px 16px;font-size:13px">Drop it</button>
              </div>
            </div>
          </div>

          <div id="sugg-list"></div>
        </div>

        <aside>
          <div class="side-card">
            <div class="side-key">HOW THIS WORKS</div>
            <ol style="margin:0;padding-left:20px;font-size:13px;color:var(--body);line-height:1.75">
              <li>Anyone drops an idea (anon or not).</li>
              <li>Class upvotes. Top of the week goes somewhere.</li>
              <li>I raise the big ones with pedagogy.</li>
              <li>Their answer shows up on the card. Good or bad.</li>
            </ol>
          </div>
          <div class="side-card" style="border-color:var(--surface-2)">
            <div class="side-key">TAGS</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              <span class="tag" style="color:var(--lilac)">events · 18</span>
              <span class="tag" style="color:var(--butter)">campus · 9</span>
              <span class="tag" style="color:var(--mint)">pedagogy · 7</span>
              <span class="tag">food · 6</span>
              <span class="tag">guide · 4</span>
              <span class="tag">other · 9</span>
            </div>
          </div>
          <div class="side-card" style="background:linear-gradient(135deg,rgba(var(--coral-rgb),0.08) 0%,var(--surface) 70%);border-color:var(--surface-2)">
            <div class="side-key" style="color:var(--coral)">GOING TO FRIDAY'S COUNCIL</div>
            <div class="side-body">Microwave in the Hub · Monthly food crawl · English-track elective · Printer on floor 2</div>
          </div>
        </aside>
      </div>
    </div>
  </div>
`;

function contrib(v) {
  return v === 'up' ? 1 : v === 'down' ? -1 : 0;
}

export function loadSugComments() {
  state.sugComments = {};
  for (const id in SEED_SUG_COMMENTS) state.sugComments[id] = [...SEED_SUG_COMMENTS[id]];
  const saved = load('corner-sug-comments');
  if (saved) {
    for (const id in saved) {
      state.sugComments[id] = (state.sugComments[id] || []).concat(saved[id] || []);
    }
  }
}

function saveSugComments() {
  const user = {};
  for (const id in state.sugComments) {
    user[id] = state.sugComments[id].filter((c) => c.me);
  }
  save('corner-sug-comments', user);
}

function sendComment(sugId) {
  const input = document.querySelector(`.cmt-input[data-sug="${sugId}"]`);
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  if (!state.sugComments[sugId]) state.sugComments[sugId] = [];
  state.sugComments[sugId].push({
    name: state.avatar.name,
    avatar: {
      hair: 'mop',
      hairColor: state.avatar.hairColor,
      skin: state.avatar.skin,
      top: state.avatar.top,
      bottom: state.avatar.bottom,
    },
    text: text.slice(0, 200),
    ts: Date.now(),
    me: true,
  });
  saveSugComments();
  renderSuggestions();
}

export function renderSuggestions() {
  const list = document.getElementById('sugg-list');
  if (!list) return;
  list.innerHTML = SUGGESTIONS.map((s) => {
    const original = s.voted ? 'up' : null;
    const current = s.id in state.suggestionUpvotes ? state.suggestionUpvotes[s.id] : original;
    const score = s.votes + contrib(current) - contrib(original);
    const scoreClass = current === 'up' ? 'pos' : current === 'down' ? 'neg' : '';
    const pill = {
      raised: `<span class="pill pill-wait">◐ RAISED · PEDAGOGY</span>`,
      new: `<span class="pill pill-new">● NEW</span>`,
      done: `<span class="pill pill-win">✓ DONE</span>`,
      no: `<span class="pill pill-lose">✕ PASSED ON</span>`,
    }[s.status];
    const expanded = state.sugExpanded.has(s.id);
    const cmts = state.sugComments[s.id] || [];
    const cmtLabel = cmts.length === 1 ? '1 comment' : `${cmts.length} comments`;

    return `
      <div class="sug ${s.hot ? 'hot' : ''} ${expanded ? 'expanded' : ''}">
        <div class="vote-col">
          <button class="arrow up ${current === 'up' ? 'on' : ''}" data-id="${s.id}" data-dir="up" aria-label="upvote">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 2l5 6H9v4H5V8H2l5-6z" fill="currentColor"/></svg>
          </button>
          <div class="score ${scoreClass}">${score}</div>
          <button class="arrow down ${current === 'down' ? 'on' : ''}" data-id="${s.id}" data-dir="down" aria-label="downvote">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 12L2 6h3V2h4v4h3l-5 6z" fill="currentColor"/></svg>
          </button>
        </div>
        <div style="flex:1;min-width:0">
          <div class="sug-top">
            ${pill}
            <span class="tag" style="color:${s.tagColor}">${s.tag}</span>
            <span class="sug-meta">· ${s.time}</span>
          </div>
          <div class="sug-h" style="${s.mutedH ? 'color:var(--body)' : ''}">${s.h}</div>
          ${s.body ? `<div class="sug-body">${s.body}</div>` : ''}
          ${s.note ? `<div class="sug-status ok">${s.note}</div>` : ''}
          ${s.noBody ? `<div class="sug-status no">${s.noBody}</div>` : ''}
          <button class="sug-cmts-btn" data-cmt-id="${s.id}">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 3a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H6l-3 3V3z" stroke="currentColor" stroke-width="1.3" fill="none"/></svg>
            ${cmtLabel}${expanded ? ' · hide' : ''}
          </button>
          <div class="sug-cmts">
            ${cmts.length === 0
              ? '<div style="font-size:12px;color:var(--dim);font-style:italic;padding:4px 0">nothing here yet. be first.</div>'
              : cmts
                  .map(
                    (c) => `
                <div class="cmt">
                  ${avatarSVG(c.avatar, 22)}
                  <div class="cmt-body">
                    <div class="cmt-head"><span class="cmt-name">${escapeHtml(c.name)}</span>${formatTime(c.ts)}</div>
                    <div class="cmt-text">${escapeHtml(c.text)}</div>
                  </div>
                </div>`
                  )
                  .join('')}
            <div class="cmt-input-row">
              <input class="cmt-input" placeholder="reply…" maxlength="200" data-sug="${s.id}"/>
              <button class="cmt-send" data-send="${s.id}">send</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Vote arrows
  list.querySelectorAll('.arrow').forEach((b) =>
    b.addEventListener('click', () => {
      const id = +b.dataset.id;
      const dir = b.dataset.dir;
      const s = SUGGESTIONS.find((x) => x.id === id);
      const original = s.voted ? 'up' : null;
      const current =
        id in state.suggestionUpvotes ? state.suggestionUpvotes[id] : original;
      state.suggestionUpvotes[id] = current === dir ? null : dir;
      renderSuggestions();
    })
  );

  // Comment expand
  list.querySelectorAll('.sug-cmts-btn').forEach((b) =>
    b.addEventListener('click', () => {
      const id = +b.dataset.cmtId;
      if (state.sugExpanded.has(id)) state.sugExpanded.delete(id);
      else state.sugExpanded.add(id);
      renderSuggestions();
      if (state.sugExpanded.has(id)) {
        setTimeout(
          () => document.querySelector(`.cmt-input[data-sug="${id}"]`)?.focus(),
          50
        );
      }
    })
  );

  // Send / enter on comment input
  list.querySelectorAll('.cmt-send').forEach((b) =>
    b.addEventListener('click', () => sendComment(+b.dataset.send))
  );
  list.querySelectorAll('.cmt-input').forEach((inp) =>
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendComment(+inp.dataset.sug);
    })
  );
}

export function initSuggestions() {
  const root = document.querySelector('.subview[data-sub="suggestions"]');
  root.querySelector('[data-drop]').addEventListener('click', () =>
    toast('Dropped. 27 classmates will see it tonight.')
  );
  renderSuggestions();
}
