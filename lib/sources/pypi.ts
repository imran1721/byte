import type { FeedItem } from "@/lib/types";

/**
 * Latest PyPI releases. PyPI has no trending API; its "recent updates" RSS is
 * the freshest public, no-auth signal. No download counts in the feed, so
 * points stay 0 and items rank by recency. Enrichment fills the blurb/image
 * from each project page.
 */
const RSS = "https://pypi.org/rss/updates.xml";
const COUNT = 12;

export async function fetchPyPI(): Promise<FeedItem[]> {
  const res = await fetch(RSS, {
    headers: { "User-Agent": "byte-tech-feed/0.1" },
    next: { revalidate: 900 },
  });
  if (!res.ok) throw new Error(`PyPI RSS ${res.status}`);
  const xml = await res.text();

  const items: FeedItem[] = [];
  const seen = new Set<string>();
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = m[1];
    const pick = (tag: string) =>
      block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1]?.trim() ?? "";
    const title = pick("title"); // "pkgname 1.2.3"
    const link = pick("link");
    const name = title.split(" ")[0];
    if (!title || !link || seen.has(name)) continue; // one card per package
    seen.add(name);
    const ts = Math.floor(new Date(pick("pubDate")).getTime() / 1000);
    items.push({
      id: `pypi-${name}`,
      source: "pypi",
      title,
      description: "", // RSS description is "None"; enrichment fills it
      url: link,
      points: 0,
      createdAt: Number.isFinite(ts) ? ts : Math.floor(Date.now() / 1000),
      score: 0,
      categories: [],
    });
    if (items.length >= COUNT) break;
  }
  return items;
}
