import type { FeedItem, FeedMode } from "@/lib/types";
import { stripHtml, truncate } from "@/lib/html";

/**
 * Hacker News via the free Algolia search API (no key required).
 * We pull "Show HN" posts and front-page stories — both are strong signals
 * for new tools/tech that people are actively liking.
 */
const ALGOLIA = "https://hn.algolia.com/api/v1";

interface AlgoliaHit {
  objectID: string;
  title: string | null;
  url: string | null;
  author: string | null;
  points: number | null;
  num_comments: number | null;
  created_at_i: number;
  /** The submitter's own write-up (present on most Show HN self-posts). */
  story_text: string | null;
  _tags?: string[];
}

interface AlgoliaResponse {
  hits: AlgoliaHit[];
}

function mapHit(hit: AlgoliaHit): FeedItem | null {
  if (!hit.title) return null;
  const discussionUrl = `https://news.ycombinator.com/item?id=${hit.objectID}`;
  const title = hit.title.replace(/^Show HN:\s*/i, "");
  const description = hit.story_text
    ? truncate(stripHtml(hit.story_text))
    : "";
  return {
    id: `hn-${hit.objectID}`,
    source: "hackernews",
    title,
    description,
    // Self/Ask/Show posts without an external URL link to the thread itself.
    url: hit.url ?? discussionUrl,
    discussionUrl,
    points: hit.points ?? 0,
    comments: hit.num_comments ?? 0,
    author: hit.author ?? undefined,
    createdAt: hit.created_at_i,
    score: 0,
    categories: [],
  };
}

const MIN_POINTS = 10;
const PER_PAGE = 12;

export async function fetchHackerNews(
  page = 0,
  mode: FeedMode = "trending",
): Promise<FeedItem[]> {
  const latest = mode === "latest";
  // trending: Show HN + front-page, relevance/points-ranked, min 10 points.
  // latest: /search_by_date returns newest stories first, no popularity floor
  //   (brand-new posts haven't earned points yet). Both paginate ~endlessly.
  const endpoint = latest ? "search_by_date" : "search";
  const tags = latest ? "story" : "(show_hn,front_page)";
  const url =
    `${ALGOLIA}/${endpoint}?tags=${encodeURIComponent(tags)}` +
    `&page=${page}&hitsPerPage=${PER_PAGE}`;

  // Refresh the "latest" cache more often so it actually surfaces new posts.
  const res = await fetch(url, { next: { revalidate: latest ? 300 : 1800 } });
  if (!res.ok) throw new Error(`Hacker News API ${res.status}`);

  const floor = latest ? 0 : MIN_POINTS;
  const data = (await res.json()) as AlgoliaResponse;
  return data.hits
    .map(mapHit)
    .filter((x): x is FeedItem => x !== null && x.points >= floor);
}
