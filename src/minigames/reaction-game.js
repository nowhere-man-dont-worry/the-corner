// Reaction timer — how fast can you react when the screen turns green?
//
// One round: press to start → "wait…" for a random 1.5–4 s → the screen turns
// green → press as fast as you can and see your time in ms. Pressing while
// it's still waiting is "too early". Works with mouse, touch (pointer
// events) and the keyboard (Space / Enter) while the game is open.
//
// Implements the registry contract: mount(container) / unmount(). Every
// listener is registered with one AbortController and every timer is
// tracked, so unmount() leaves nothing behind.

const MIN_DELAY_MS = 1500;
const MAX_DELAY_MS = 4000;

let ctl = null;          // AbortController for all listeners of this mount
let waitTimer = null;
let frame = null;
let phase = 'idle';      // 'idle' | 'waiting' | 'go' | 'result' | 'early'
let goAt = 0;            // performance.now() when green was painted
let els = null;

function setScreen(text, bg, fg) {
  els.screen.textContent = text;
  els.screen.style.background = bg;
  els.screen.style.color = fg;
}

function startRound() {
  phase = 'waiting';
  els.out.textContent = '';
  setScreen('wait…', 'var(--surface-2)', 'var(--muted)');
  const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
  waitTimer = setTimeout(() => {
    waitTimer = null;
    setScreen('NOW!', 'var(--mint)', 'var(--on-accent)');
    // Start the clock on the frame the green actually reaches the screen.
    frame = requestAnimationFrame(() => {
      frame = null;
      goAt = performance.now();
      phase = 'go';
    });
  }, delay);
}

// `at` is the input event's timeStamp (same clock as performance.now()).
function press(at) {
  if (phase === 'idle' || phase === 'result' || phase === 'early') {
    startRound();
  } else if (phase === 'waiting') {
    if (!waitTimer) return;          // green is on its way to the screen: not early, just ignore
    clearTimeout(waitTimer);
    waitTimer = null;
    if (frame) { cancelAnimationFrame(frame); frame = null; }
    phase = 'early';
    setScreen('too early — press to try again', 'var(--coral)', 'var(--on-accent)');
  } else if (phase === 'go') {
    const ms = Math.max(0, Math.round(at - goAt));
    phase = 'result';
    setScreen(`${ms} ms — press to go again`, 'var(--surface-2)', 'var(--fg)');
    els.out.textContent = `${ms} ms`;
  }
}

function render(container) {
  container.innerHTML = `
    <div class="mg-reaction">
      <div class="mg-reaction-title">REACTION</div>
      <button type="button" class="mg-reaction-screen" aria-live="polite">press to start</button>
      <div class="mg-reaction-hint">click, tap, or press Space / Enter</div>
      <div class="mg-reaction-out" aria-live="polite"></div>
    </div>
  `;
  els = {
    screen: container.querySelector('.mg-reaction-screen'),
    out: container.querySelector('.mg-reaction-out'),
  };
  setScreen('press to start', 'var(--surface-2)', 'var(--muted)');
  const signal = ctl.signal;

  // Pointer events cover mouse, pen and touch, and fire on press (not on
  // release like click), which is what a reaction test should measure.
  els.screen.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    press(e.timeStamp);
  }, { signal });
  // Keyboard-only "click" on the focused button would double-fire with the
  // window handler below, so swallow it.
  els.screen.addEventListener('click', (e) => e.preventDefault(), { signal });

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
}

export default {
  id: 'reaction',
  title: 'Reaction timer',
  blurb: 'How fast can you react? Wait for green, then press.',
  mount(container) {
    this.unmount();
    ctl = new AbortController();
    phase = 'idle';
    render(container);
  },
  unmount() {
    ctl?.abort();
    ctl = null;
    clearTimeout(waitTimer);
    waitTimer = null;
    if (frame) cancelAnimationFrame(frame);
    frame = null;
    phase = 'idle';
    els = null;
  },
};
