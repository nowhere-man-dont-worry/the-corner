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

## Supabase

There's no fake data in the repo: members, chat, suggestions, council
motions, events and the Guide all live in Supabase (Postgres + GitHub Auth +
Realtime). The browser only ever uses the public anon/publishable key; every
table is protected by row-level security, and fields like `created_by`,
handles and user ids are filled in by database triggers from `auth.uid()` —
the client never sends them.

To run against your own project:

1. Create a free project at supabase.com.
2. In **SQL editor**, run every file in `supabase/migrations/` in order
   (`0001_baseline.sql`, `0002_…`, …). `0003` makes the GitHub user
   with handle `nowhere-man-dont-worry` an admin — change that line to your
   own handle.
3. In **Authentication → Providers**, enable GitHub (create a GitHub OAuth app
   whose callback URL is `https://<project-ref>.supabase.co/auth/v1/callback`).
4. In **Authentication → URL configuration**, add `http://localhost:5173` as a
   redirect URL.
5. Put `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`.

### Changing the schema

Every schema change is a new numbered file in `supabase/migrations/`
(`0009_whatever.sql`, …) committed with the code that needs it. Never edit a
migration that has already run in production — add a new one. Follow the
existing patterns: RLS on, read policies `to authenticated`, server-set fields
from triggers, "delete own or admin" via `public.is_admin()`.

## Repo map

```
src/
├── main.js                 # boots everything
├── style.css               # all CSS
├── core/                   # Supabase client + data modules (chat, presence,
│                           # profiles, places, suggestions, council, events,
│                           # matcher), nav, theme, toast, state
├── components/             # reusable UI (country combobox)
├── utils/                  # storage, time, Paris time, html helpers
├── avatars/
│   ├── render.js           # the SVG renderer
│   ├── palette.js          # color choices offered in the creator
│   └── hair/               # one file per hair style
│       └── README.md       # ← start here to add one
├── views/                  # one file per screen
└── minigames/              # pluggable games (the plaza's Game Room)
    └── README.md           # ← start here to add one
supabase/
└── migrations/             # numbered SQL files — the whole schema
```

## Easy first PRs

You don't need a PR to appear on the members page — sign in with GitHub and
make your avatar; your profile is created for you.

### 1. Add a hair style

See `src/avatars/hair/README.md` for the full walkthrough. Each hair style is
one small file with a function returning SVG rectangles. You add the file,
you register it in `hair/index.js`, done.

### 2. Add a minigame

See `src/minigames/README.md`. Each minigame is one file exporting `mount()`
and `unmount()`. Copy `reaction-game.js` to start.

## Other things people are welcome to build

- The Cinema and Garden rooms (their plaza doors say "coming soon")
- Avatar parts: tops, outfits, accessories — same pattern as hair
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
