# Adding a minigame

Minigames live in `src/minigames/`. Each one is a single file that exports an
object with four fields. Here's the contract:

```js
export default {
  id: 'my-game',                  // short slug, unique across all games
  title: 'My game',               // shown on the Game Room card
  blurb: 'what it is in one line',
  mount(container) {
    // Called when the user picks your game.
    // `container` is an empty <div> inside the Game Room.
    // Attach your DOM / canvas / listeners here.
  },
  unmount() {
    // Called when the user leaves. Clean up timers, intervals,
    // animation frames, keyboard listeners, audio, etc.
  },
};
```

## Step by step

1. Copy `reaction-game.js` as a starting point
2. Rename the file and the exported `id` / `title` / `blurb`
3. Build your game inside `mount(container)`. You get:
   - The `container` div (write `container.innerHTML = '...'` or append nodes)
   - The usual CSS variables (`var(--coral)`, `var(--surface)`, …) for colors
     so your game looks like the rest of the app
   - The ability to import helpers from `src/utils/` (storage, time, html)
4. Clean up in `unmount()`. If you added `window` listeners or intervals,
   remove them here. Leaked listeners break the next game.
5. Register your game: open `registry.js`, import your file, add it to `GAMES`.

```js
// src/minigames/registry.js
import reaction from './reaction-game.js';
import myGame from './my-game.js';

export const GAMES = [reaction, myGame];
```

## Guidelines

- **Keep it small.** A minigame should be playable in under a minute.
- **One screen.** Don't grab the whole viewport — stay inside `container`.
- **No external libraries.** If you absolutely need one, open an issue first
  so we can discuss adding it to `package.json`.
- **Mobile friendly.** No tiny click targets. Touch events work (`pointerdown`
  covers both mouse and touch).
- **No autoplay audio.** Browsers block it anyway. If your game has sound,
  trigger it from a click.
- **Accessibility.** Use real buttons where you mean buttons. If you draw
  with canvas, provide a short text description next to it.

## Open a PR

- One game per PR
- Include a short recording or GIF
- If you added assets (sprites, sound), explain where they come from and
  make sure the license is permissive
