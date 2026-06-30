import type { FeedItem } from "@/lib/types";
import { extractMetaDescription, extractMetaImage, truncate } from "@/lib/html";

const CONCURRENCY = 8;
const FETCH_TIMEOUT_MS = 4000;
/** Only fetch pages for the items near the top — the rest rarely get scrolled to. */
const MAX_ENRICH = 24;
/** Don't try to scrape these — they block bots or return no useful meta. */
const SKIP_HOSTS = [/(^|\.)twitter\.com$/, /(^|\.)x\.com$/, /(^|\.)linkedin\.com$/];

interface PageMeta {
  description: string | null;
  image: string | null;
}

async function fetchPageMeta(url: string): Promise<PageMeta> {
  const empty: PageMeta = { description: null, image: null };
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return empty;
  }
  if (SKIP_HOSTS.some((re) => re.test(host))) return empty;

  try {
    const res = await fetch(url, {
      headers: {
        // Some sites only return og tags to real-looking user agents.
        "User-Agent":
          "Mozilla/5.0 (compatible; FreshBot/0.1; +https://example.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      // Cache enrichment for a day — og tags don't change often.
      next: { revalidate: 86400 },
    });
    if (!res.ok) return empty;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html")) return empty;

    // Only the <head> carries the meta tags; cap the read so we don't pull MBs.
    const html = (await res.text()).slice(0, 100_000);
    const desc = extractMetaDescription(html);
    return {
      description: desc ? truncate(desc) : null,
      image: extractMetaImage(html, res.url || url),
    };
  } catch {
    return empty; // timeout, DNS, TLS, etc. — just skip enrichment for this item.
  }
}

/** Run async tasks with a fixed concurrency cap (no external deps). */
async function mapLimit<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx]);
    }
  });
  await Promise.all(workers);
}

/**
 * For the top items, fetch the linked page once and fill in any missing
 * `description` (og:description) and `image` (og:image). Mutates and returns
 * the same array. Best-effort: anything that can't be fetched is left as-is.
 */
export async function enrichDescriptions(items: FeedItem[]): Promise<FeedItem[]> {
  const targets = items
    .slice(0, MAX_ENRICH)
    .filter((item) => item.url && (!item.description || !item.image));

  await mapLimit(targets, CONCURRENCY, async (item) => {
    const meta = await fetchPageMeta(item.url);
    if (meta.description && !item.description) item.description = meta.description;
    if (meta.image && !item.image) item.image = meta.image;
  });

  return items;
}
