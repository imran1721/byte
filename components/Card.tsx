import type { FeedItem } from "@/lib/types";
import { compact, hostOf, timeAgo } from "@/lib/format";
import { CATEGORY_META } from "@/lib/categoryMeta";
import CardImage from "@/components/CardImage";

const SOURCE_META = {
  hackernews: { label: "Hacker News", accent: "#ff6600", pointLabel: "points" },
  github: { label: "GitHub", accent: "#8b5cf6", pointLabel: "stars" },
  lobsters: { label: "Lobsters", accent: "#b91c1c", pointLabel: "points" },
  devto: { label: "DEV", accent: "#0ea5e9", pointLabel: "reactions" },
  reddit: { label: "Reddit", accent: "#ff4500", pointLabel: "upvotes" },
  producthunt: { label: "Product Hunt", accent: "#ff6154", pointLabel: "upvotes" },
} as const;

export default function Card({ item, index }: { item: FeedItem; index: number }) {
  const meta = SOURCE_META[item.source];

  return (
    <section
      className="card-section no-scrollbar relative flex h-[100dvh] snap-start snap-always flex-col items-center justify-center overflow-y-auto px-6 pb-12 pt-20"
      style={{
        background: `radial-gradient(120% 80% at 50% 0%, ${meta.accent}22 0%, rgb(var(--bg)) 55%)`,
      }}
    >
      <div className="card-body w-full max-w-xl">
        {/* Hero image (hidden if it fails to load) */}
        {item.image && (
          <CardImage src={item.image} alt={item.title} accent={meta.accent} />
        )}

        {/* Source badge */}
        <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <span
            className="whitespace-nowrap rounded-full px-3 py-1 font-semibold"
            style={{ background: `${meta.accent}26`, color: meta.accent }}
          >
            {meta.label}
          </span>
          {item.categories
            .filter((c) => c !== "other")
            .slice(0, 2)
            .map((c) => (
              <span
                key={c}
                className="whitespace-nowrap rounded-full bg-fg/10 px-3 py-1 text-fg/70"
              >
                {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
              </span>
            ))}
          {item.language && (
            <span className="whitespace-nowrap rounded-full bg-fg/10 px-3 py-1 text-fg/70">
              {item.language}
            </span>
          )}
          <span className="whitespace-nowrap text-fg/40">
            {timeAgo(item.createdAt)}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          {item.title}
        </h2>

        {/* Description — the "what is this" blurb */}
        <p className="mt-5 text-lg leading-relaxed text-fg/80">
          {item.description || (
            <span className="italic text-fg/40">
              No description available — open the link to see what it is.
            </span>
          )}
        </p>

        {/* Stats */}
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-fg/60">
          <span className="font-semibold text-fg">
            ▲ {compact(item.points)}{" "}
            <span className="font-normal text-fg/50">{meta.pointLabel}</span>
          </span>
          {typeof item.comments === "number" && (
            <span>
              💬 {compact(item.comments)}{" "}
              {item.source === "github" ? "issues" : "comments"}
            </span>
          )}
          {item.author && <span>by {item.author}</span>}
        </div>

        {/* Actions — the destination URL shown with its favicon */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl bg-fg/10 px-4 py-3 font-medium text-fg transition hover:bg-fg/20"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://www.google.com/s2/favicons?domain=${hostOf(item.url)}&sz=64`}
              alt=""
              className="h-4 w-4 rounded-sm"
            />
            <span>{hostOf(item.url)}</span>
            <span aria-hidden className="text-fg/40">
              ↗
            </span>
          </a>
          {item.discussionUrl && item.discussionUrl !== item.url && (
            <a
              href={item.discussionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl px-4 py-3 font-medium text-bg transition hover:opacity-90"
              style={{ background: meta.accent }}
            >
              Discussion
            </a>
          )}
        </div>
      </div>

      {/* Position hint */}
      <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-fg/30">
        #{index + 1}
      </div>
    </section>
  );
}
