# Contributing

Welcome. This is a collective side project — anyone from MSCI 1 is welcome
to open a PR. You don't need to ask first; if someone's already on it, you'll
see a comment on the issue.

## Setup

```bash
git clone https://github.com/nowhere-man-dont-worry/the-corner.git
cd the-corner
npm install
npm run dev
```

Vite will tell you the local URL (usually `http://localhost:5173`). Any file
you save hot-reloads the page.

## Repo map

```
src/
├── main.js                 # boots everything
├── style.css               # all CSS
├── core/                   # nav, chat, theme, toast, state
├── utils/                  # storage, time, html helpers
├── avatars/
│   ├── render.js           # the SVG renderer
│   ├── palette.js          # color choices offered in the creator
│   └── hair/               # one file per hair style
│       └── README.md       # ← start here to add one
├── views/                  # one file per screen
├── data/                   # seed arrays — safest first PRs
└── minigames/              # pluggable games
    └── README.md           # ← start here to add one
```

## Three easy first PRs

### 1. Add yourself to the members page

Open `src/data/members.js` and append an object to the `MEMBERS` array:

```js
{
  name: 'yourname',
  origin: '🇫🇷 Paris → XI',
  bio: 'one line about you',
  tags: ['OPEN'],
  hair: '#3d2a1f',
  skin: '#f5c9a0',
  top: '#4a90c7',
  bottom: '#241b2e',
  online: true,
}
```

Reload the page, open the Members tab — you're there.

### 2. Add a hair style

See `src/avatars/hair/README.md` for the full walkthrough. Each hair style is
one small file with a function returning SVG rectangles. You add the file,
you register it in `hair/index.js`, done.

### 3. Add a minigame

See `src/minigames/README.md`. Each minigame is one file exporting `mount()`
and `unmount()`. Copy `reaction-game.js` to start.

## Other things people are welcome to build

- New plaza rooms (cinema, game room, garden currently just show toasts)
- Avatar parts: tops, outfits, accessories, flags — same pattern as hair
- A real backend so chat and votes sync across viewers (Supabase is a good fit)
- Mobile polish — some screens still feel cramped under 600px
- Accessibility — focus outlines, aria labels, screen-reader checks
- Darker color variants / seasonal themes
- An actual proposals→pedagogy pipeline

If you want to work on one of these, open an issue first with a one-paragraph
sketch so we can give feedback before you spend hours.

## PR checklist

- [ ] One feature / fix per PR
- [ ] `npm run build` still succeeds
- [ ] You tested on both themes (dark and light)
- [ ] Your changes don't break the plaza avatar movement (touch the arrow keys
      after any `window` event listener change)
- [ ] Include a screenshot or GIF if the change is visual

## Code style

- Vanilla JS, ES modules, no framework
- No TypeScript (keeps the entry bar low for first-timers)
- Prettier defaults are fine; don't block a PR on formatting
- Keep files short — if a view grows past ~400 lines, consider splitting a
  sub-component out

## Code of conduct

Be nice. If something's broken, say what's broken, not what's wrong with the
person who shipped it. We're all learning.
