import type { FeedItem, FeedMode } from "@/lib/types";
import { fetchHackerNews } from "@/lib/sources/hackernews";
import { fetchGitHub } from "@/lib/sources/github";
import { fetchLobsters } from "@/lib/sources/lobsters";
import { fetchDevto } from "@/lib/sources/devto";
import { fetchReddit } from "@/lib/sources/reddit";
import { fetchProductHunt } from "@/lib/sources/producthunt";
import { enrichDescriptions } from "@/lib/enrich";
import { categorize } from "@/lib/categorize";

/**
 * Trending score. HN points and GitHub stars live on very different scales,
 * so we damp popularity with log() and decay it by age using a gravity term
 * (the classic Hacker News ranking shape). Fresh + liked floats to the top.
 */
function rank(item: FeedItem): number {
  const ageHours = Math.max(0, (Date.now() / 1000 - item.createdAt) / 3600);
  const popularity = Math.log10(item.points + 1) + 1;
  const gravity = 1.5;
  return popularity / Math.pow(ageHours + 2, gravity / 4);
}

/**
 * One page of the feed. Paginating sources (HN, GitHub, Dev.to) fetch their
 * `page`; HN alone has ~250 pages, so the feed effectively never runs out.
 * Non-paginating sources (Lobsters, Reddit, Product Hunt) only contribute on
 * page 0 for variety up top. Each page is ranked within itself and the client
 * appends pages, so already-shown items never reorder.
 */
export async function getFeedPage(
  page = 0,
  mode: FeedMode = "trending",
  query = "",
): Promise<FeedItem[]> {
  const first = page === 0;
  const q = query.trim().slice(0, 100);
  // Only HN and GitHub have real full-text search; when searching we query just
  // those two rather than pad results with non-matching trending items.
  const results = await Promise.allSettled([
    fetchHackerNews(page, mode, q),
    fetchGitHub(page, q),
    ...(q ? [] : [fetchDevto(page)]),
    ...(first && !q
      ? [fetchLobsters(), fetchReddit(), fetchProductHunt()]
      : []),
  ]);

  const items: FeedItem[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") items.push(...r.value);
    else console.error("[feed] source failed:", r.reason);
  }

  // Dedupe within this page by normalized URL (cross-page dups are dropped on
  // the client by item id).
  const seen = new Set<string>();
  const deduped = items.filter((item) => {
    const key = item.url.replace(/\/+$/, "").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  for (const item of deduped) item.score = rank(item);
  // Latest: strict newest-first. Trending/search: popular-and-fresh score
  // (surfaces the most notable matches first).
  if (mode === "latest" && !q) deduped.sort((a, b) => b.createdAt - a.createdAt);
  else deduped.sort((a, b) => b.score - a.score);

  // Fill missing blurbs/images for this page's items.
  await enrichDescriptions(deduped);
  for (const item of deduped) item.categories = categorize(item);

  return deduped;
}
