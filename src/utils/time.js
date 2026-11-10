// Tiny relative-time formatter for chat & comments.
// "now", "5m", "3h", "2d".

export function formatTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60 * 1000) return 'now';
  if (diff < 60 * 60 * 1000) return Math.floor(diff / 60000) + 'm';
  if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / 3600000) + 'h';
  return Math.floor(diff / 86400000) + 'd';
}
