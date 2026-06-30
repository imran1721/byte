import type { FeedItem } from "@/lib/types";

/**
 * Product Hunt — the canonical "new tools people upvoted" feed. Needs a free
 * developer token (PRODUCT_HUNT_TOKEN) from
 * https://www.producthunt.com/v2/oauth/applications. Skipped without it.
 */
const ENDPOINT = "https://api.producthunt.com/v2/api/graphql";
const QUERY = `query {
  posts(order: VOTES, first: 40) {
    edges { node {
      id name tagline url website votesCount commentsCount createdAt
      thumbnail { url }
    } }
  }
}`;

interface PhNode {
  id: string;
  name: string;
  tagline: string;
  url: string;
  website: string | null;
  votesCount: number;
  commentsCount: number;
  createdAt: string;
  thumbnail: { url: string } | null;
}

export async function fetchProductHunt(): Promise<FeedItem[]> {
  const token = process.env.PRODUCT_HUNT_TOKEN;
  if (!token) return []; // not configured — skip silently

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query: QUERY }),
    next: { revalidate: 1800 },
  });
  if (!res.ok) throw new Error(`Product Hunt API ${res.status}`);

  const json = (await res.json()) as {
    data?: { posts: { edges: { node: PhNode }[] } };
  };
  const edges = json.data?.posts.edges ?? [];

  return edges.map(({ node: n }) => ({
    id: `ph-${n.id}`,
    source: "producthunt",
    title: n.name,
    description: n.tagline ?? "",
    url: n.website || n.url,
    discussionUrl: n.url,
    points: n.votesCount,
    comments: n.commentsCount,
    createdAt: Math.floor(Date.parse(n.createdAt) / 1000),
    image: n.thumbnail?.url,
    score: 0,
    categories: [],
  }));
}
