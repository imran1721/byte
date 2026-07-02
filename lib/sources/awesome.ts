import type { FeedItem } from "@/lib/types";
import { truncate } from "@/lib/html";

/**
 * "Awesome" curated lists — GitHub repos named `awesome`, ranked by stars.
 * Reuses the public GitHub Search API (optional GITHUB_TOKEN raises the limit).
 * These are long-lived repos, so age-decay keeps them low in the mixed feed;
 * they shine under the Awesome source filter.
 */
const SEARCH = "https://api.github.com/search/repositories";
const COUNT = 12;

interface GhRepo {
  id: number;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  created_at: string;
  owner: { login: string };
}

export async function fetchAwesome(): Promise<FeedItem[]> {
  const q = "awesome in:name stars:>5000";
  const url =
    `${SEARCH}?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${COUNT}`;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(url, { headers, next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Awesome (GitHub) ${res.status}`);
  const items = ((await res.json()) as { items: GhRepo[] }).items ?? [];

  return items.map((r) => ({
    id: `awesome-${r.id}`,
    source: "awesome" as const,
    title: r.full_name,
    description: r.description ? truncate(r.description) : "",
    url: r.html_url,
    points: r.stargazers_count,
    author: r.owner.login,
    createdAt: Math.floor(new Date(r.created_at).getTime() / 1000),
    score: 0,
    categories: [],
  }));
}
