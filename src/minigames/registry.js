// Minigame registry. A minigame is any module that exports:
//   { id, title, blurb, mount(container), unmount() }
//
//  - id:     short slug, unique across games
//  - title:  human-readable name (shown on the game room card)
//  - blurb:  one line describing it
//  - mount:  called when the user picks the game. You get an empty <div>
//            container. Attach whatever DOM / canvas / listeners you need
//            INSIDE it. Return nothing.
//  - unmount: called when the user leaves. Clean up timers / listeners here.
//
// Register a new game by importing it below and pushing it into GAMES.

import reaction from './reaction-game.js';

export const GAMES = [reaction];

export function getGame(id) {
  return GAMES.find((g) => g.id === id);
}
