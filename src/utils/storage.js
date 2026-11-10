// Tiny wrapper around localStorage so one failure doesn't crash the app.
// Private windows and locked-down browsers can throw just reading from it.

export function load(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // quota exceeded, blocked, whatever — move on
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {}
}
