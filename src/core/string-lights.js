// String lights (plaza + landing): a wire that stretches to the container's
// width, and round bulbs that hang on it.
//
// The wire is an SVG with preserveAspectRatio="none" and a non-scaling
// stroke, so it runs edge to edge at a constant thickness. The bulbs are
// separate elements placed by percentage, so they stay circles at every
// width. The SVG's height (60px) equals its viewBox height, so only x is
// stretched: a bulb at x% keeps the wire's y at that point at every width.

// Wire: two smooth quadratic curves across a 1000 × 60 box. Control points
// sit halfway along x, so x is linear in t and y can be read for any x.
// The lowest point of the curve (y ≈ 4.3) stays inside the box: nothing clips.
const VB_W = 1000;
const VB_H = 60;
const SEGMENTS = [
  [[0, 12], [250, 56], [500, 24]],
  [[500, 24], [750, -8], [1000, 12]],
];
const WIRE_D = `M${SEGMENTS[0][0]} Q ${SEGMENTS[0][1]} ${SEGMENTS[0][2]} Q ${SEGMENTS[1][1]} ${SEGMENTS[1][2]}`.replace(/,/g, ' ');

function wireY(x) {
  const [[x0, y0], [, yc], [x1, y1]] = SEGMENTS.find(([a, , b]) => x >= a[0] && x <= b[0]);
  const t = (x - x0) / (x1 - x0);
  return (1 - t) ** 2 * y0 + 2 * t * (1 - t) * yc + t ** 2 * y1;
}

/**
 * @param {object} o
 * @param {string[]} o.colors  one per bulb, left to right
 * @param {number} o.r         bulb radius in px
 * @param {string} [o.className]  extra classes for the container
 * @param {string} [o.style]      extra inline style for the container
 */
export function stringLightsHTML({ colors, r, className = '', style = '' }) {
  const n = colors.length;
  // The wire SVG is the container's first child, so the bulbs are children
  // 2..n+1 — the same nth-child positions the twinkle delays always used.
  const bulbs = colors.map((c, i) => {
    const f = (i + 1) / (n + 1); // evenly spaced, same gap at both ends
    const top = wireY(f * VB_W) + r; // top of the bulb touches the wire
    return `<span class="light bulb" style="left:${(f * 100).toFixed(3)}%;top:${top.toFixed(2)}px;width:${2 * r}px;height:${2 * r}px;background:${c}"></span>`;
  }).join('');
  return `<div class="string-lights ${className}" style="${style}" aria-hidden="true">`
    + `<svg class="string-wire" viewBox="0 0 ${VB_W} ${VB_H}" preserveAspectRatio="none"><path d="${WIRE_D}" stroke="#3d3050" stroke-width="1.5" fill="none" vector-effect="non-scaling-stroke"/></svg>`
    + bulbs + '</div>';
}
