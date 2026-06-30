"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FeedItem, Source } from "@/lib/types";
import type { CategoryId } from "@/lib/categorize";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/categoryMeta";
import Card from "@/components/Card";
import Onboarding from "@/components/Onboarding";
import ByteIcon from "@/components/ByteIcon";
import ThemeToggle from "@/components/ThemeToggle";

type Filter = "all" | "foryou" | CategoryId;

const INTERESTS_KEY = "fresh:interests";
const PAGE = 6; // cards rendered initially, and added each time you near the end

const SOURCE_LABEL: Record<Source, string> = {
  hackernews: "Hacker News",
  github: "GitHub",
  devto: "Dev.to",
  lobsters: "Lobsters",
  reddit: "Reddit",
  producthunt: "Product Hunt",
};
// Sources that paginate deeply; the rest only seed page 0, so filtering to them
// alone has a fixed pool (no point fetching more once you reach the end).
const PAGINATING = new Set<Source>(["hackernews", "github", "devto"]);

export default function Feed({ items: initialItems }: { items: FeedItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sources, setSources] = useState<Set<Source>>(new Set()); // empty = all
  const [idx, setIdx] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(false); // re-opening the interest picker
  // Render a small window and grow it as you scroll (keeps the DOM + image
  // loads light), independent of how much data is fetched.
  const [count, setCount] = useState(PAGE);
  const mainRef = useRef<HTMLElement>(null);

  // True infinite feed: accumulate server pages, fetch the next one as you near
  // the end of what's loaded. HN alone has ~250 pages, so it never runs dry.
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [loadingMore, setLoadingMore] = useState(false);
  const [done, setDone] = useState(false);
  const loadingRef = useRef(false);
  const pageRef = useRef(1); // next page to fetch (page 0 came from the server)
  const seenRef = useRef(new Set(initialItems.map((i) => i.id)));

  const loadMore = async () => {
    if (loadingRef.current || done) return;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/feed?page=${pageRef.current}`);
      const data = (await res.json()) as { items?: FeedItem[] };
      const incoming = data.items ?? [];
      pageRef.current += 1;
      if (incoming.length === 0) {
        setDone(true); // source pool exhausted (very rare)
      } else {
        const fresh = incoming.filter((it) => !seenRef.current.has(it.id));
        fresh.forEach((it) => seenRef.current.add(it.id));
        if (fresh.length) setItems((prev) => [...prev, ...fresh]);
      }
    } catch {
      // network hiccup — a later scroll will retry this page
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  };

  // null = not loaded yet, [] never stored (we only save 3+). First-time users
  // (nothing in localStorage) get the onboarding interest picker.
  const [interests, setInterests] = useState<CategoryId[] | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Tell the splash the content is on screen so it can dismiss (set a flag too,
  // in case the splash mounts after this fires).
  useEffect(() => {
    const w = window as typeof window & { __byteReady?: boolean };
    w.__byteReady = true;
    window.dispatchEvent(new Event("byte:ready"));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(INTERESTS_KEY);
    if (saved) {
      setInterests(JSON.parse(saved) as CategoryId[]);
      setFilter("foryou");
    } else {
      setNeedsOnboarding(true);
    }
  }, []);

  const saveInterests = (picked: CategoryId[]) => {
    localStorage.setItem(INTERESTS_KEY, JSON.stringify(picked));
    setInterests(picked);
    setFilter("foryou");
    setNeedsOnboarding(false);
  };

  // Let ↑/↓, j/k, and Space move between cards — the hidden scrollbar means
  // there's otherwise no keyboard scroll affordance. Reads mainRef at event
  // time so it survives the key-based remount without re-binding.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = mainRef.current;
      if (!el) return;
      const down = e.key === "ArrowDown" || e.key === "j" || e.key === " ";
      const up = e.key === "ArrowUp" || e.key === "k";
      if (!down && !up) return;
      e.preventDefault();
      el.scrollBy({ top: down ? el.clientHeight : -el.clientHeight, behavior: "smooth" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // How many items fall under each category — used to label pills and hide
  // categories that have nothing in the current feed.
  const counts = useMemo(() => {
    const c = {} as Record<CategoryId, number>;
    for (const item of items) {
      for (const cat of item.categories) c[cat] = (c[cat] ?? 0) + 1;
    }
    return c;
  }, [items]);

  const inInterests = (i: FeedItem) =>
    !!interests && i.categories.some((c) => interests.includes(c));

  const visible = useMemo(() => {
    let v = items;
    if (filter === "foryou") v = v.filter(inInterests);
    else if (filter !== "all") v = v.filter((i) => i.categories.includes(filter));
    if (sources.size > 0) v = v.filter((i) => sources.has(i.source));
    return v;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, filter, sources, interests]);

  // Sources present in the feed, in display order.
  const sourcePills = useMemo(() => {
    const present = new Set(items.map((i) => i.source));
    const order: Source[] = [
      "hackernews",
      "github",
      "devto",
      "lobsters",
      "reddit",
      "producthunt",
    ];
    return order.filter((s) => present.has(s));
  }, [items]);

  const pills: { id: Filter; label: string; emoji?: string; count: number }[] = [
    ...(interests
      ? [
          {
            id: "foryou" as Filter,
            label: "For You",
            emoji: "✨",
            count: items.filter(inInterests).length,
          },
        ]
      : []),
    { id: "all", label: "All", count: items.length },
    ...CATEGORY_ORDER.filter((id) => (counts[id] ?? 0) > 0).map((id) => ({
      id,
      label: CATEGORY_META[id].label,
      emoji: CATEGORY_META[id].emoji,
      count: counts[id],
    })),
  ];

  if (needsOnboarding) return <Onboarding onDone={saveInterests} />;

  const activePill = pills.find((p) => p.id === filter) ?? pills[0];

  const choose = (f: Filter) => {
    setFilter(f);
    setIdx(0);
    setCount(PAGE); // restart the window for the new filter
    setSheetOpen(false);
  };

  // Multi-select: toggle a source in/out; the sheet stays open so you can pick
  // several. Resets the feed window since the visible set changes.
  const toggleSource = (s: Source) => {
    setSources((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
    setIdx(0);
    setCount(PAGE);
  };
  const clearSources = () => {
    setSources(new Set());
    setIdx(0);
    setCount(PAGE);
  };

  // If every selected source has a fixed pool (none paginate), stop fetching.
  const sourceExhausted =
    sources.size > 0 && ![...sources].some((s) => PAGINATING.has(s));

  return (
    <div className="h-[100dvh]">
      {/* Re-open the interest picker to change the "For You" selection */}
      {editing && (
        <Onboarding
          initial={interests ?? []}
          onDone={(picked) => {
            saveInterests(picked);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      )}

      {/* Header: logo + a single filter trigger that opens the picker sheet */}
      <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-bg/90 to-transparent px-6 pb-5 pt-4">
        <ByteIcon className="h-8 w-8" />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-fg/10 px-3.5 py-1.5 text-sm font-medium text-fg/90 transition hover:bg-fg/20"
          >
            {activePill.emoji && <span>{activePill.emoji}</span>}
            <span>
              {activePill.label}
              {sources.size > 0 && (
                <span className="text-fg/50">
                  {" · "}
                  {sources.size === 1
                    ? SOURCE_LABEL[[...sources][0]]
                    : `${sources.size} sources`}
                </span>
              )}
            </span>
            <span className="text-fg/40">▾</span>
          </button>
        </div>
      </header>

      {/* Filter picker — a bottom sheet, so the feed stays full-screen */}
      <div
        className={`fixed inset-0 z-30 ${sheetOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!sheetOpen}
      >
        <div
          onClick={() => setSheetOpen(false)}
          className={`absolute inset-0 bg-bg/60 transition-opacity duration-300 ${
            sheetOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-fg/10 bg-bg px-6 pb-10 pt-4 transition-transform duration-300 ${
            sheetOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-fg/20" />
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">Browse</h2>
            {interests && (
              <button
                onClick={() => {
                  setSheetOpen(false);
                  setEditing(true);
                }}
                className="text-sm font-medium text-fg/50 transition hover:text-fg"
              >
                Edit interests
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {pills.map((p) => {
              const active = filter === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => choose(p.id)}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-fg text-bg"
                      : "bg-fg/10 text-fg/70 hover:bg-fg/20"
                  }`}
                >
                  {p.emoji && <span>{p.emoji}</span>}
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mb-4 mt-7 flex items-baseline justify-between">
            <h2 className="text-lg font-bold">Source</h2>
            <span className="text-xs text-fg/40">pick any</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={clearSources}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                sources.size === 0
                  ? "bg-fg text-bg"
                  : "bg-fg/10 text-fg/70 hover:bg-fg/20"
              }`}
            >
              All sources
            </button>
            {sourcePills.map((s) => {
              const active = sources.has(s);
              return (
                <button
                  key={s}
                  onClick={() => toggleSource(s)}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-fg text-bg"
                      : "bg-fg/10 text-fg/70 hover:bg-fg/20"
                  }`}
                >
                  {active && <span className="text-xs">✓</span>}
                  <span>{SOURCE_LABEL[s]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* The scroll feed. key=filter remounts it so it snaps back to the top
          whenever the filter changes. */}
      {/* Scroll affordance — fades out once you leave the first card. */}
      <div
        className={`pointer-events-none fixed inset-x-0 bottom-1 z-20 flex justify-center text-fg/40 transition-opacity duration-500 ${
          idx === 0 && visible.length > 1 ? "opacity-100" : "opacity-0"
        }`}
        title="Scroll or use ↑/↓ keys"
      >
        <span className="animate-bounce text-2xl leading-none">⌄</span>
      </div>

      <main
        ref={mainRef}
        key={`${filter}:${[...sources].sort().join(",")}`}
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollTop / el.clientHeight);
          setIdx(i);
          // Grow the render window as you scroll.
          if (i >= count - 2) {
            setCount((c) => Math.min(c + PAGE, visible.length));
          }
          // Within 10 of the end of loaded data → fetch the next page (unless
          // this single-source view can't grow any further).
          if (i >= visible.length - 10 && !sourceExhausted) loadMore();
        }}
        className="no-scrollbar h-[100dvh] snap-y snap-mandatory overflow-y-scroll"
      >
        {visible.length === 0 ? (
          <div className="flex h-[100dvh] items-center justify-center px-6 text-center text-fg/60">
            <p>Nothing here right now.</p>
          </div>
        ) : (
          <>
            {visible.slice(0, count).map((item, i) => (
              <Card key={item.id} item={item} index={i} />
            ))}
            {count >= visible.length && (
              <section className="flex h-[100dvh] snap-start items-center justify-center text-center text-fg/40">
                {done || sourceExhausted ? (
                  <div>
                    <p className="text-xl font-semibold text-fg">
                      You&apos;re all caught up
                    </p>
                    <p className="mt-2">Check back later for fresh tech.</p>
                  </div>
                ) : (
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-fg/20 border-t-fg/70" />
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
