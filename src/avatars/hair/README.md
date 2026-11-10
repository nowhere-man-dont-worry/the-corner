# Adding a new hair style

Hair styles are drawn in pixel art on a 20×30 grid. The character's head takes
up the top rows (roughly y=2 to y=11). Your shape should sit inside that area.

## 1. Create your file

Copy `buzz.js` or any existing style, rename it, and edit the rectangles:

```js
// src/avatars/hair/mohawk.js
export default {
  name: 'mohawk',
  label: 'mohawk',
  shape: (H) =>
    `<rect x="9" y="1" width="2" height="7" fill="${H}"/>` +
    `<rect x="7" y="2" width="6" height="2" fill="${H}"/>`,
};
```

The `H` argument is the hair colour the user picked in the creator. You only
need to use it in the `fill` of each rectangle.

## 2. Register it

Open `src/avatars/hair/index.js` and:

1. Add an `import` at the top
2. Add it to the `hairStyles` object
3. Add its name to `hairOrder` where you want it to appear in the creator

```js
import mohawk from './mohawk.js';
export const hairStyles = { buzz, mop, long, bun, curls, cap, mohawk };
export const hairOrder = ['buzz', 'mop', 'long', 'bun', 'curls', 'cap', 'mohawk'];
```

Save and reload. Your new style shows up as a chip in the hair tab of the
avatar creator — no other code changes required.

## Tips

- Keep rectangles inside `x=2..18`, `y=1..12`. Anything outside gets clipped by
  the head/body.
- Only use `<rect>`. The avatar is rendered with `shape-rendering="crispEdges"`,
  which makes every pixel sharp — curves and gradients will look muddy.
- Multi-layer shapes are fine — stack rectangles in the order you want them
  drawn (the later ones sit on top).

## Pull request

- One hair style per PR is easier to review.
- Include a screenshot of your avatar wearing it.
- Give it a short label — lowercase, one word is best ("buzz", "mop", not
  "Short Buzzcut").
