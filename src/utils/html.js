// Escape user text before interpolating into innerHTML.
// Covers &, <, >, ", ' — enough to stop a stray script tag or attribute-break.

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

// Small template helper — tagged template literal that passes through
// the strings but escapes any interpolated values. Not used everywhere
// yet, but handy for comment / chat rendering.
export function h(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) {
    out += escapeHtml(values[i]) + strings[i + 1];
  }
  return out;
}
