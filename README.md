# the corner

A hangout for MSCI 1 — a Club-Penguin-meets-Discord class space built by us,
for us.

It's a single-page web app with:

- **a plaza** you walk around in with the arrow keys — everyone online shows up live
- **a council** where we raise motions, vote in secret and bring the results to pedagogy
- **a suggestions box** with up/down votes and inline comment threads
- **an events board** with RSVPs and an "I'm bored" roulette
- **a Paris guide** written by us, for us (cheap food, admin tips, late-night spots)
- **a members page** with live "who's online" and a weekly coffee matcher
- **a live chat drawer** on every screen, one thread per room

Sign-in is with GitHub. Everything you see comes from a real classmate: the
data lives in [Supabase](https://supabase.com) (Postgres + Auth + Realtime),
and the schema is in [`supabase/migrations/`](./supabase/migrations).

## Run it

```bash
npm install
npm run dev
```

That boots Vite on `http://localhost:5173`. Edit any file and the page
hot-reloads.

The app needs two environment variables in `.env.local` (never commit it):

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<the project's publishable / anon key>
```

Without them the app still loads, but sign-in, chat and every list stay
empty. See [CONTRIBUTING.md](./CONTRIBUTING.md#supabase) to point it at your
own Supabase project.

To build for production (static files you can deploy anywhere — Vercel,
Netlify, GitHub Pages):

```bash
npm run build
npm run preview   # serve the build locally to sanity-check
```

The build output goes into `dist/`.

## Contribute

This is a **collective side project**. Pick something, open a PR. The repo is
organized so most additions are a single file — see
[CONTRIBUTING.md](./CONTRIBUTING.md) for the layout and the easiest
first PRs. (To show up on the members page, just sign in.)

- Add a hair style to the avatar creator
- Add a minigame to the Game Room

Issues are open — grab one, comment "I've got this" so we don't duplicate.

## Credits

- Pitched by Wasi during the MSCI 1 delegate run, Nov 2026
- Code structure by whoever shows up
- Avatar art by whoever draws it

## License

MIT — see [LICENSE](./LICENSE).
