// Europe/Paris time helpers. Events are entered and shown in Paris time no
// matter where the viewer's computer thinks it is.

const TZ = 'Europe/Paris';

const partsFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

function parisParts(ms) {
  const p = Object.fromEntries(partsFmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, s: +p.second };
}

// Paris UTC offset (ms) at a given instant.
function offsetAt(ms) {
  const p = parisParts(ms);
  return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000;
}

// "2026-11-14T19:30" (as typed in a datetime-local input, meant as Paris
// wall-clock time) -> Date.
export function parisInputToDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value || '');
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let t = guess - offsetAt(guess);
  t = guess - offsetAt(t);          // settle across a DST change
  return new Date(t);
}

// Date -> "YYYY-MM-DDTHH:mm" in Paris time, for a datetime-local's min/value.
export function dateToParisInput(date) {
  const p = parisParts(date.getTime());
  const z = (n) => String(n).padStart(2, '0');
  return `${p.y}-${z(p.mo)}-${z(p.d)}T${z(p.h)}:${z(p.mi)}`;
}

export const parisDay = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' });
export const parisTime = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
export const parisDayKey = (date) => dateToParisInput(date).slice(0, 10);
