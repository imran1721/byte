import type { FeedItem } from "@/lib/types";
import { truncate } from "@/lib/html";

/**
 * Trending Docker images. Docker Hub has no "trending" endpoint (and its search
 * endpoint carries no dates), so we pull the official images and rank them by
 * pull_count — the most-pulled images, with real last_updated dates.
 * `rankPoints` scales the billions of pulls down to a sane cross-source rank.
 */
const LIBRARY = "https://hub.docker.com/v2/repositories/library/?page_size=100";
const COUNT = 12;

interface DockerRepo {
  name: string;
  description?: string | null;
  pull_count: number;
  star_count: number;
  last_updated?: string;
}

export async function fetchDockerHub(): Promise<FeedItem[]> {
  const res = await fetch(LIBRARY, {
    headers: { "User-Agent": "byte-tech-feed/0.1" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Docker Hub ${res.status}`);
  const results = ((await res.json()) as { results: DockerRepo[] }).results ?? [];

  return results
    .sort((a, b) => (b.pull_count ?? 0) - (a.pull_count ?? 0))
    .slice(0, COUNT)
    .map((r) => ({
      id: `docker-${r.name}`,
      source: "dockerhub" as const,
      title: r.name,
      description: r.description ? truncate(r.description) : "",
      url: `https://hub.docker.com/_/${r.name}`,
      points: r.pull_count ?? 0,
      rankPoints: Math.round((r.pull_count ?? 0) / 1_000_000), // ~HN-points scale
      createdAt: r.last_updated
        ? Math.floor(new Date(r.last_updated).getTime() / 1000)
        : Math.floor(Date.now() / 1000),
      score: 0,
      categories: [],
    }));
}
