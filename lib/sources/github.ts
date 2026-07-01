import type { FeedItem } from "@/lib/types";

/**
 * GitHub "trending-ish" feed via the public Search API (no key required, but
 * rate-limited to 10 req/min unauthenticated — fine for a revalidated feed).
 * We ask for repos created in the last 30 days, ordered by stars, which
 * surfaces brand-new projects that are gaining traction fast.
 *
 * Set GITHUB_TOKEN in the environment to raise the rate limit to 30 req/min.
 */
const SEARCH = "https://api.github.com/search/repositories";

interface GhRepo {
  id: number;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  open_issues_count: number;
  language: string | null;
  created_at: string;
  owner: { login: string };
}

interface GhResponse {
  items: GhRepo[];
}

function mapRepo(repo: GhRepo): FeedItem {
  return {
    id: `gh-${repo.id}`,
    source: "github",
    title: repo.full_name,
    description: repo.description ?? "",
    url: repo.html_url,
    points: repo.stargazers_count,
    comments: repo.open_issues_count,
    author: repo.owner.login,
    language: repo.language ?? undefined,
    createdAt: Math.floor(new Date(repo.created_at).getTime() / 1000),
    score: 0,
    categories: [],
  };
}

export async function fetchGitHub(page = 0, query = ""): Promise<FeedItem[]> {
  const q = query.trim();
  // search: repos matching the term, most-starred first (any age, ≥10 stars).
  // default: last 90 days ordered by stars — brand-new projects gaining
  // traction. GitHub Search caps at 1000 results (~100 pages). `page` is
  // 1-indexed.
  let ghQuery: string;
  if (q) {
    ghQuery = `${q} stars:>10`;
  } else {
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    ghQuery = `created:>${since} stars:>50`;
  }
  const url =
    `${SEARCH}?q=${encodeURIComponent(ghQuery)}` +
    `&sort=stars&order=desc&per_page=10&page=${page + 1}`;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(url, { headers, next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);

  const data = (await res.json()) as GhResponse;
  return data.items.map(mapRepo);
}
