import type { FeedItem } from "@/lib/types";
import { decodeEntities, stripHtml, truncate } from "@/lib/html";

/**
 * Top posts of the week across dev subreddits. Reddit retired anonymous .json
 * access (now 403s), so this uses app-only OAuth: set REDDIT_CLIENT_ID and
 * REDDIT_CLIENT_SECRET (free — register a "script" app at
 * https://www.reddit.com/prefs/apps). Without them this source is skipped.
 */
const SUBS = "programming+webdev+selfhosted+LocalLLaMA";
const UA = "web:fresh-tech-feed:0.1 (by /u/fresh)";

interface RedditPost {
  id: string;
  title: string;
  url: string;
  permalink: string;
  score: number;
  num_comments: number;
  created_utc: number;
  author: string;
  is_self: boolean;
  selftext: string;
  thumbnail: string;
  preview?: { images: { source: { url: string } }[] };
}

async function getToken(): Promise<string | null> {
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) return null;

  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${id}:${secret}`),
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": UA,
    },
    body: "grant_type=client_credentials",
    next: { revalidate: 3000 }, // token lasts ~1h
  });
  if (!res.ok) throw new Error(`Reddit token ${res.status}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

export async function fetchReddit(): Promise<FeedItem[]> {
  const token = await getToken();
  if (!token) return []; // not configured — skip silently

  const res = await fetch(
    `https://oauth.reddit.com/r/${SUBS}/top?t=week&limit=50`,
    {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": UA },
      next: { revalidate: 1800 },
    },
  );
  if (!res.ok) throw new Error(`Reddit API ${res.status}`);

  const data = (await res.json()) as {
    data: { children: { data: RedditPost }[] };
  };

  return data.data.children.map(({ data: p }) => {
    const previewUrl = p.preview?.images?.[0]?.source?.url;
    const image = previewUrl
      ? decodeEntities(previewUrl)
      : p.thumbnail?.startsWith("http")
        ? p.thumbnail
        : undefined;
    const permalink = `https://www.reddit.com${p.permalink}`;
    return {
      id: `rd-${p.id}`,
      source: "reddit",
      title: p.title,
      description: p.is_self && p.selftext ? truncate(stripHtml(p.selftext)) : "",
      url: p.is_self ? permalink : p.url,
      discussionUrl: permalink,
      points: p.score,
      comments: p.num_comments,
      author: p.author,
      createdAt: p.created_utc,
      image,
      score: 0,
      categories: [],
    };
  });
}
