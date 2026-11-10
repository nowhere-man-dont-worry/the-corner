# the corner

A hangout for MSCI 1 — a Club-Penguin-meets-Discord class space built by us,
for us.

It's a single-page web app with:

- **a plaza** you walk around in with the arrow keys
- **a council** where we raise motions and bring them to pedagogy
- **a suggestions box** with Reddit-style up/down votes and inline comment threads
- **an events board** with RSVPs and an "I'm bored" roulette
- **a Paris guide** written by us, for us (cheap food, admin tips, late-night spots)
- **a members page** with a weekly coffee matcher
- **a live chat drawer** on every screen, one thread per room

Everything persists in your browser (localStorage). There's no backend yet.

## Run it

```bash
npm install
npm run dev
```

That boots Vite on `http://localhost:5173`. Edit any file and the page
hot-reloads.

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
[CONTRIBUTING.md](./CONTRIBUTING.md) for the layout and the three easiest
first PRs:

- Add yourself to the members page
- Add a hair style to the avatar creator
- Add a minigame to the Game Room

Issues are open — grab one, comment "I've got this" so we don't duplicate.

## Credits

- Pitched by Wasi during the MSCI 1 delegate run, Nov 2026
- Code structure by whoever shows up
- Avatar art by whoever draws it

## License

MIT — see [LICENSE](./LICENSE).
