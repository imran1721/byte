import type { FeedItem } from "@/lib/types";
import { truncate } from "@/lib/html";

/**
 * Trending npm packages. npm exposes no time-delta "trending" signal, so we
 * surface the most popular packages for a topic that rotates daily (variety),
 * scored by real weekly downloads. Register-free registry search + bulk
 * download-count APIs. `rankPoints` scales the huge download numbers down so
 * they don't dominate the cross-source trending rank.
 */
const SEARCH = "https://registry.npmjs.org/-/v1/search";
const DOWNLOADS = "https://api.npmjs.org/downloads/point/last-week";
const TOPICS = ["ai", "cli", "react", "typescript", "css", "testing", "api", "database"];
const COUNT = 12;

interface NpmObject {
  package: {
    name: string;
    description?: string;
    date?: string;
    links?: { npm?: string };
    publisher?: { username?: string };
  };
}

export async function fetchNpm(): Promise<FeedItem[]> {
  // Rotate the topic by day so the section changes without a "trending" API.
  const topic = TOPICS[Math.floor(Date.now() / 86_400_000) % TOPICS.length];
  const url =
    `${SEARCH}?text=${encodeURIComponent("keywords:" + topic)}` +
    `&size=${COUNT}&popularity=1.0`;
  const res = await fetch(url, { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`npm search ${res.status}`);
  const pkgs = ((await res.json()) as { objects: NpmObject[] }).objects
    .map((o) => o.package)
    .filter((p) => p?.name);
  if (pkgs.length === 0) return [];

  // One bulk call for weekly downloads of every package on the page.
  const dl = (await fetch(`${DOWNLOADS}/${pkgs.map((p) => p.name).join(",")}`, {
    next: { revalidate: 1800 },
  })
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}))) as Record<string, { downloads?: number } | null>;

  return pkgs.map((p) => {
    const downloads = dl[p.name]?.downloads ?? 0;
    return {
      id: `npm-${p.name}`,
      source: "npm" as const,
      title: p.name,
      description: p.description ? truncate(p.description) : "",
      url: p.links?.npm ?? `https://www.npmjs.com/package/${p.name}`,
      points: downloads,
      rankPoints: Math.round(downloads / 10_000), // ~GitHub-star scale
      author: p.publisher?.username,
      createdAt: p.date
        ? Math.floor(new Date(p.date).getTime() / 1000)
        : Math.floor(Date.now() / 1000),
      score: 0,
      categories: [],
    };
  });
}
