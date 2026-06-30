/** "3h ago", "2d ago" — compact relative time from unix epoch seconds. */
export function timeAgo(epochSeconds: number): string {
  const s = Math.max(0, Math.floor(Date.now() / 1000 - epochSeconds));
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** 1234 -> "1.2k" */
export function compact(n: number): string {
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
}

/** Bare host for display, e.g. "github.com". */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
