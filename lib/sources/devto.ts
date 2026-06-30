import type { FeedItem } from "@/lib/types";
import { truncate } from "@/lib/html";

/**
 * Dev.to top articles of the last week. Free, no key. Conveniently ships its
 * own description and cover image, so these items skip enrichment.
 */
interface DevtoArticle {
  id: number;
  title: string;
  description: string;
  url: string;
  public_reactions_count: number;
  comments_count: number;
  published_at: string;
  cover_image: string | null;
  social_image: string | null;
  user: { name: string | null; username: string };
}

export async function fetchDevto(page = 0): Promise<FeedItem[]> {
  // `top=30` widens the window so deeper pages still have articles. 1-indexed.
  const res = await fetch(
    `https://dev.to/api/articles?top=30&per_page=10&page=${page + 1}`,
    { next: { revalidate: 1800 } },
  );
  if (!res.ok) throw new Error(`Dev.to API ${res.status}`);

  const articles = (await res.json()) as DevtoArticle[];
  return articles.map((a) => ({
    id: `dt-${a.id}`,
    source: "devto",
    title: a.title,
    description: a.description ? truncate(a.description) : "",
    url: a.url,
    points: a.public_reactions_count,
    comments: a.comments_count,
    author: a.user.name ?? a.user.username,
    createdAt: Math.floor(Date.parse(a.published_at) / 1000),
    image: a.cover_image ?? a.social_image ?? undefined,
    score: 0,
    categories: [],
  }));
}
