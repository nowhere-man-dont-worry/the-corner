// Game Room — lists the minigames in src/minigames/registry.js and mounts the
// one you pick. Reached through the plaza's Game Room door (#games).

import { GAMES, getGame } from '../minigames/registry.js';
import { escapeHtml } from '../utils/html.js';
import { nav } from '../core/nav.js';

export const gamesHTML = `
  <div class="page">
    <div class="page-head">
      <div class="page-key">GAME ROOM</div>
      <h1 class="page-title">Pick a <span class="accent">game</span>.</h1>
      <p style="font-size:14px;color:var(--muted);margin:8px 0 0;max-width:640px">Every game here is a file in <span class="mono">src/minigames/</span> — add yours with a PR.</p>
    </div>
    <div class="page-wrap">
      <div style="display:flex;gap:8px;margin-bottom:14px">
        <button class="btn btn-ghost" data-games-back style="padding:8px 14px;font-size:13px">← back to the plaza</button>
        <button class="btn btn-ghost" data-games-list hidden style="padding:8px 14px;font-size:13px">all games</button>
      </div>
      <div class="games-grid" id="games-grid"></div>
      <div class="game-stage" id="game-stage" hidden></div>
    </div>
  </div>
`;

let mounted = null;

function showList() {
  if (mounted) { mounted.unmount?.(); mounted = null; }
  const grid = document.getElementById('games-grid');
  const stage = document.getElementById('game-stage');
  stage.hidden = true;
  stage.innerHTML = '';
  grid.hidden = false;
  document.querySelector('[data-games-list]').hidden = true;
  grid.innerHTML = GAMES.length
    ? GAMES.map((g) => `<button class="game-card" data-game="${escapeHtml(g.id)}"><h3>${escapeHtml(g.title)}</h3><p>${escapeHtml(g.blurb)}</p></button>`).join('')
    : '<div class="empty-state">No games yet — add the first one in src/minigames/.</div>';
  grid.querySelectorAll('[data-game]').forEach((b) => b.addEventListener('click', () => play(b.dataset.game)));
}

function play(id) {
  const game = getGame(id);
  if (!game) return;
  if (mounted) mounted.unmount?.();
  const stage = document.getElementById('game-stage');
  document.getElementById('games-grid').hidden = true;
  document.querySelector('[data-games-list]').hidden = false;
  stage.hidden = false;
  stage.innerHTML = '<div></div>';
  game.mount(stage.firstElementChild);
  mounted = game;
}

// Leaving the Game Room unmounts the game (listeners, timers) and resets the
// room to the game list, so coming back never shows a dead game screen.
export function leaveGames() {
  if (document.getElementById('games-grid')) showList();
  else if (mounted) { mounted.unmount?.(); mounted = null; }
}

export function initGames() {
  const root = document.querySelector('.subview[data-sub="games"]');
  root.querySelector('[data-games-back]').addEventListener('click', () => nav('plaza'));
  root.querySelector('[data-games-list]').addEventListener('click', showList);
  showList();
}
