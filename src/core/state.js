// Single shared state object imported everywhere.
// Not reactive — views call their own render functions after mutating.
// If this grows, consider a signal library (preact/signals, @vue/reactivity).

export const state = {
  // nav
  view: 'landing',             // 'landing' | 'create' | 'app'
  sub: 'plaza',                // which subview is active inside the app

  // avatar
  avatar: {
    hair: 'buzz',
    hairColor: '#3d2a1f',
    skin: '#f5c9a0',
    top: '#c589e8',
    bottom: '#241b2e',
    name: 'noa',
  },

  // plaza
  plaza: {
    x: 420,
    y: 500,
    dir: 1,
    moving: false,
    walking: false,
    bubble: null,
    bubbleUntil: 0,
  },

  // council
  vote: null,                  // 'yes' | 'no' | 'meh'

  // suggestions
  suggestionUpvotes: {},       // id -> 'up' | 'down' | null
  sugComments: {},             // id -> [{name, avatar, text, ts, me}]
  sugExpanded: new Set(),      // suggestion ids whose comment threads are open

  // events
  rsvps: {},                   // "day-index" -> true

  // guide / members
  guideCat: 'eat',
  matched: false,

  // chat
  chats: {},                   // room -> [{name, avatar, text, ts, me}]
  chatOpen: false,

  // theme
  theme: 'dark',               // 'dark' | 'light'
  auth: null, // { id, github_username, avatar_url } when signed in
};
