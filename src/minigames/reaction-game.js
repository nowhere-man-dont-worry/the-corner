// Sample minigame — reaction timer. Shows how to plug into the registry.
//
// A screen says "WAIT…" and turns pink after a random delay (1–4 s).
// The player clicks as fast as they can. We report the ms between the
// color change and the click.
//
// Copy this file as a starting point for your own game.

let timeoutId = null;
let startedAt = 0;
let armed = false;

function render(container) {
  container.innerHTML = `
    <div class="mg-reaction" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:32px;background:var(--surface);border:1px solid var(--border);border-radius:14px;min-height:260px;font-family:var(--sans);text-align:center">
      <div style="font-family:var(--pixel);color:var(--muted);letter-spacing:0.14em">REACTION</div>
      <div id="mg-r-screen" style="width:100%;padding:40px 20px;border-radius:12px;background:var(--surface-2);font-size:22px;color:var(--muted);cursor:pointer;user-select:none">
        click to start
      </div>
      <div id="mg-r-out" style="font-family:var(--pixel);color:var(--dim);font-size:14px;letter-spacing:0.1em;min-height:18px"></div>
    </div>
  `;
  const screen = container.querySelector('#mg-r-screen');
  const out = container.querySelector('#mg-r-out');

  function reset() {
    armed = false;
    clearTimeout(timeoutId);
    screen.style.background = 'var(--surface-2)';
    screen.style.color = 'var(--muted)';
    screen.textContent = 'click to start';
  }

  screen.addEventListener('click', () => {
    if (armed) {
      const ms = performance.now() - startedAt;
      out.textContent = ms < 100 ? 'TOO EARLY' : `${Math.round(ms)}ms`;
      reset();
      return;
    }
    if (screen.textContent === 'click to start' || screen.textContent === 'WAIT…') {
      screen.style.background = 'var(--surface-2)';
      screen.style.color = 'var(--muted)';
      screen.textContent = 'WAIT…';
      const delay = 1000 + Math.random() * 3000;
      timeoutId = setTimeout(() => {
        armed = true;
        startedAt = performance.now();
        screen.style.background = 'var(--coral)';
        screen.style.color = 'var(--on-accent)';
        screen.textContent = 'CLICK!';
      }, delay);
    }
  });
}

export default {
  id: 'reaction',
  title: 'Reaction timer',
  blurb: 'How fast can you click? Wait for the pink screen.',
  mount(container) { render(container); },
  unmount() { clearTimeout(timeoutId); armed = false; },
};
