import type { CategoryId } from "@/lib/categorize";

export type Source =
  | "hackernews"
  | "github"
  | "lobsters"
  | "devto"
  | "producthunt"
  | "npm"
  | "pypi"
  | "dockerhub"
  | "awesome";

/** Feed ordering: popular-and-fresh ("trending") vs newest-first ("latest"). */
export type FeedMode = "trending" | "latest";

export interface FeedItem {
  id: string;
  source: Source;
  title: string;
  /** Short description / context. Empty string if none. */
  description: string;
  /** Canonical link to the thing itself. */
  url: string;
  /** A representative image (og:image), set during enrichment. Optional. */
  image?: string;
  /** Link to the discussion (HN thread, etc.). Optional. */
  discussionUrl?: string;
  /** Popularity signal: HN points or GitHub stars. */
  points: number;
  /** Optional popularity value for ranking only, when `points` is on a wildly
   * different scale (Docker pulls, npm downloads). Display still uses `points`. */
  rankPoints?: number;
  /** Comment / engagement count where available. */
  comments?: number;
  author?: string;
  /** Programming language for GitHub repos. */
  language?: string;
  /** Unix epoch seconds when the item was created. */
  createdAt: number;
  /** Computed trending score, set by rank(). */
  score: number;
  /** Topic categories, set by categorize(). */
  categories: CategoryId[];
}
