// Who wrote this? Resolves a user id to their current profile (name, flag,
// avatar) from the profiles already loaded for the Members page, falling back
// to the GitHub handle stored on the row.

import { state } from './state.js';
import { avatarSVG } from '../avatars/render.js';
import { flagHTML } from './countries.js';
import { escapeHtml } from '../utils/html.js';

export function profileOf(userId) {
  return (state.profiles || []).find((p) => p.user_id === userId) || null;
}

export function nameOf(userId, handle) {
  const p = profileOf(userId);
  return p?.display_name || (handle ? '@' + handle : p ? '@' + p.handle : 'someone');
}

export function avatarOf(userId, size = 22) {
  const p = profileOf(userId);
  return avatarSVG(p ? { hair: p.hair, hairColor: p.hair_color, skin: p.skin, top: p.top, bottom: p.bottom } : { hair: 'mop', hairColor: '#6b5f7a', skin: '#9a8ca8', top: '#3d3050', bottom: '#2a1f38' }, size);
}

// "[flag] Name" with the full name in a title attribute (for ellipsis).
export function authorHTML(userId, handle) {
  const name = nameOf(userId, handle);
  return `${flagHTML(profileOf(userId)?.country_code)}<span class="author-name" title="${escapeHtml(name)}">${escapeHtml(name)}</span>`;
}
