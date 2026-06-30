import type { FeedItem } from "@/lib/types";

/** Lobsters "hottest" — dev-dense, low-noise. One fetch, no auth. */
interface LobstersStory {
  short_id: string;
  title: string;
  url: string;
  score: number;
  comment_count: number;
  created_at: string;
  comments_url: string;
  // The API has returned this as either a username string or a {username} object.
  submitter_user: string | { username: string };
}

export async function fetchLobsters(): Promise<FeedItem[]> {
  const res = await fetch("https://lobste.rs/hottest.json", {
    next: { revalidate: 1800 },
  });
  if (!res.ok) throw new Error(`Lobsters API ${res.status}`);

  const stories = (await res.json()) as LobstersStory[];
  return stories.map((s) => {
    const author =
      typeof s.submitter_user === "string"
        ? s.submitter_user
        : s.submitter_user?.username;
    return {
      id: `lo-${s.short_id}`,
      source: "lobsters",
      title: s.title,
      description: "",
      url: s.url || s.comments_url, // text posts have no external url
      discussionUrl: s.comments_url,
      points: s.score,
      comments: s.comment_count,
      author,
      createdAt: Math.floor(Date.parse(s.created_at) / 1000),
      score: 0,
      categories: [],
    };
  });
}
