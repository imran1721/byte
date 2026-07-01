"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FeedItem, FeedMode, Source } from "@/lib/types";
import type { CategoryId } from "@/lib/categorize";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/categoryMeta";
import Card from "@/components/Card";
import Onboarding from "@/components/Onboarding";
import ByteIcon from "@/components/ByteIcon";
import ThemeToggle from "@/components/ThemeToggle";

type Filter = "all" | "foryou" | "saved" | CategoryId;

const INTERESTS_KEY = "fresh:interests";
const SAVED_KEY = "byte:saved";
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

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export default function Feed({ items: initialItems }: { items: FeedItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [mode, setMode] = useState<FeedMode>("trending"); // trending vs latest
  const [query, setQuery] = useState(""); // committed search query ("" = off)
  const [searchInput, setSearchInput] = useState(""); // the search text field
  const [searchOpen, setSearchOpen] = useState(false); // nav search bar expanded
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
      const q = query ? `&q=${encodeURIComponent(query)}` : "";
      const res = await fetch(`/api/feed?page=${pageRef.current}&mode=${mode}${q}`);
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

  // Pull-to-refresh: drag down on the first card to fetch fresh page-0 posts.
  const [pull, setPull] = useState(0); // current pull distance (px)
  const [pulling, setPulling] = useState(false); // finger down and pulling
  const [refreshing, setRefreshing] = useState(false);
  const pullStart = useRef<number | null>(null);
  const pullRef = useRef(0);
  const PULL_TRIGGER = 64;

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      // cache-bust so the route re-runs and surfaces anything new
      const q = query ? `&q=${encodeURIComponent(query)}` : "";
      const res = await fetch(`/api/feed?page=0&mode=${mode}${q}&t=${Date.now()}`);
      const data = (await res.json()) as { items?: FeedItem[] };
      const fresh = (data.items ?? []).filter((it) => !seenRef.current.has(it.id));
      fresh.forEach((it) => seenRef.current.add(it.id));
      if (fresh.length) setItems((prev) => [...fresh, ...prev]);
      setCount(PAGE);
      mainRef.current?.scrollTo({ top: 0 });
    } catch {
      /* ignore — user can pull again */
    } finally {
      setRefreshing(false);
    }
  };

  // Replace the whole feed with a fresh page 0 for a new mode/search and
  // restart pagination. Backs the Trending/Latest toggle and search. Reuses the
  // refresh spinner while it loads.
  const reload = async (nextMode: FeedMode, nextQuery: string) => {
    setSheetOpen(false);
    if (refreshing) return;
    setMode(nextMode);
    setQuery(nextQuery);
    setRefreshing(true);
    try {
      const q = nextQuery ? `&q=${encodeURIComponent(nextQuery)}` : "";
      const res = await fetch(`/api/feed?page=0&mode=${nextMode}${q}&t=${Date.now()}`);
      const data = (await res.json()) as { items?: FeedItem[] };
      const incoming = data.items ?? [];
      seenRef.current = new Set(incoming.map((i) => i.id));
      pageRef.current = 1;
      setItems(incoming);
      setDone(false);
      setCount(PAGE);
      setIdx(0);
      mainRef.current?.scrollTo({ top: 0 });
    } catch {
      /* ignore — user can try again */
    } finally {
      setRefreshing(false);
    }
  };

  const switchMode = (m: FeedMode) => {
    if (m !== mode) reload(m, query);
    else setSheetOpen(false);
  };
  const runSearch = (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    // Don't let an active topic/source filter hide the search results.
    setFilter("all");
    setSources(new Set());
    setSearchOpen(false); // collapse the bar to the active-search chip
    reload(mode, q);
  };
  const clearSearch = () => {
    setSearchInput("");
    if (query) reload(mode, "");
  };

  // null = not loaded yet, [] never stored (we only save 3+). First-time users
  // (nothing in localStorage) get the onboarding interest picker.
  const [interests, setInterests] = useState<CategoryId[] | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Saved-for-later posts. Stored in full (not just ids) so the Saved view works
  // even after the item drops out of the live feed.
  const [saved, setSaved] = useState<FeedItem[]>([]);
  const savedIds = useMemo(() => new Set(saved.map((i) => i.id)), [saved]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      if (raw) setSaved(JSON.parse(raw) as FeedItem[]);
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  const toggleSave = (item: FeedItem) => {
    setSaved((prev) => {
      const next = prev.some((i) => i.id === item.id)
        ? prev.filter((i) => i.id !== item.id)
        : [item, ...prev];
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      return next;
    });
  };

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
    if (filter === "saved") return saved; // its own pool, no source/topic filtering
    let v = items;
    if (filter === "foryou") v = v.filter(inInterests);
    else if (filter !== "all") v = v.filter((i) => i.categories.includes(filter));
    if (sources.size > 0) v = v.filter((i) => sources.has(i.source));
    return v;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, filter, sources, interests, saved]);

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
    { id: "saved", label: "Saved", emoji: "🔖", count: saved.length },
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

      {/* Header: logo, an expandable search bar, theme toggle, filter trigger.
          The search field only grows into the free space — the toggle and
          filter button stay visible. */}
      <header className="fixed inset-x-0 top-0 z-20 flex items-center gap-2 bg-gradient-to-b from-bg/90 to-transparent px-6 pb-5 pt-4">
        <ByteIcon className="h-8 w-8 shrink-0" />

        {searchOpen ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runSearch(searchInput);
              (document.activeElement as HTMLElement | null)?.blur();
            }}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-fg/10 px-3 py-2"
          >
            <SearchIcon className="h-4 w-4 shrink-0 text-fg/40" />
            {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
            <input
              autoFocus
              type="search"
              enterKeyHint="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search…"
              // text-base (16px): iOS Safari zooms the page in when a focused
              // input's font is < 16px, which reads as the window resizing.
              className="w-full min-w-0 bg-transparent text-base text-fg outline-none placeholder:text-fg/40"
            />
            {/* Empty box → close; otherwise clear the text but keep typing. */}
            <button
              type="button"
              aria-label={searchInput ? "Clear text" : "Close search"}
              onClick={() => {
                if (searchInput) setSearchInput("");
                else {
                  setSearchOpen(false);
                  clearSearch();
                }
              }}
              className="shrink-0 text-fg/50 transition hover:text-fg"
            >
              ✕
            </button>
          </form>
        ) : query ? (
          // Active search collapsed to a chip: tap the label to edit, ✕ to clear.
          <div className="ml-auto flex min-w-0 items-center rounded-full bg-fg/10">
            <button
              onClick={() => {
                setSearchInput(query);
                setSearchOpen(true);
              }}
              aria-label="Edit search"
              className="flex min-w-0 items-center gap-1.5 py-1.5 pl-3 pr-1.5 text-sm font-medium text-fg/90"
            >
              <SearchIcon className="h-4 w-4 shrink-0 text-fg/60" />
              <span className="truncate">{query}</span>
            </button>
            <button
              onClick={clearSearch}
              aria-label="Clear search"
              className="shrink-0 rounded-full py-1.5 pl-1 pr-3 text-fg/50 transition hover:text-fg"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setSearchInput("");
              setSearchOpen(true);
            }}
            aria-label="Search"
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fg/10 text-fg/90 transition hover:bg-fg/20"
          >
            <SearchIcon className="h-4 w-4" />
          </button>
        )}

        <div className="shrink-0">
          <ThemeToggle />
        </div>
        <button
          onClick={() => setSheetOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-fg/10 px-3.5 py-1.5 text-sm font-medium text-fg/90 transition hover:bg-fg/20"
        >
          {activePill.emoji && <span>{activePill.emoji}</span>}
          <span>
            {activePill.label}
            {mode === "latest" && (
              <span className="text-fg/50">{" · "}Latest</span>
            )}
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

          <h2 className="mb-3 text-lg font-bold">Show</h2>
          <div className="mb-7 flex flex-wrap gap-2">
            {(
              [
                { id: "trending", label: "Trending", emoji: "🔥" },
                { id: "latest", label: "Latest", emoji: "🕒" },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                onClick={() => switchMode(m.id)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${
                  mode === m.id
                    ? "bg-fg text-bg"
                    : "bg-fg/10 text-fg/70 hover:bg-fg/20"
                }`}
              >
                <span>{m.emoji}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>

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

      {/* Pull-to-refresh indicator — fades in below the header as you pull. */}
      <div
        className="pointer-events-none fixed left-1/2 top-14 z-30 -translate-x-1/2"
        style={{ opacity: refreshing ? 1 : Math.min(pull / PULL_TRIGGER, 1) }}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-fg/10 text-fg shadow-lg backdrop-blur">
          <svg
            viewBox="0 0 24 24"
            className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            style={{
              transform: refreshing
                ? undefined
                : `rotate(${pull >= PULL_TRIGGER ? 180 : 0}deg)`,
              transition: "transform 0.2s ease",
            }}
          >
            {refreshing ? (
              <path d="M21 12a9 9 0 1 1-2.6-6.3" />
            ) : (
              <path d="M12 5v14M6 13l6 6 6-6" />
            )}
          </svg>
        </div>
      </div>

      <main
        ref={mainRef}
        key={`${mode}:${query}:${filter}:${[...sources].sort().join(",")}`}
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollTop / el.clientHeight);
          setIdx(i);
          // Grow the render window as you scroll.
          if (i >= count - 2) {
            setCount((c) => Math.min(c + PAGE, visible.length));
          }
          // Within 10 of the end of loaded data → fetch the next page (unless
          // this view has a fixed pool: single non-paginating source, or Saved).
          if (i >= visible.length - 10 && !sourceExhausted && filter !== "saved")
            loadMore();
        }}
        onTouchStart={(e) => {
          const el = e.currentTarget;
          if (el.scrollTop <= 0 && filter !== "saved" && !refreshing)
            pullStart.current = e.touches[0].clientY;
        }}
        onTouchMove={(e) => {
          if (pullStart.current == null) return;
          const el = e.currentTarget;
          const dy = e.touches[0].clientY - pullStart.current;
          if (dy <= 0 || el.scrollTop > 0) {
            pullStart.current = null;
            pullRef.current = 0;
            setPull(0);
            setPulling(false);
            return;
          }
          setPulling(true);
          const p = Math.min(dy * 0.5, 100); // resistance + cap
          pullRef.current = p;
          setPull(p);
        }}
        onTouchEnd={() => {
          if (pullStart.current == null) return;
          pullStart.current = null;
          setPulling(false);
          if (pullRef.current >= PULL_TRIGGER) refresh();
          pullRef.current = 0;
          setPull(0);
        }}
        style={{
          transform: `translateY(${refreshing ? PULL_TRIGGER : pull}px)`,
          transition: pulling ? "none" : "transform 0.3s ease",
        }}
        className="no-scrollbar h-[100dvh] snap-y snap-mandatory overflow-y-scroll"
      >
        {visible.length === 0 ? (
          <div className="flex h-[100dvh] items-center justify-center px-6 text-center text-fg/60">
            <p>
              {filter === "saved"
                ? "No saved posts yet — tap the 🔖 on a card to save it."
                : query
                  ? `No results for “${query}”.`
                  : "Nothing here right now."}
            </p>
          </div>
        ) : (
          <>
            {visible.slice(0, count).map((item, i) => (
              <Card
                key={item.id}
                item={item}
                index={i}
                saved={savedIds.has(item.id)}
                onToggleSave={() => toggleSave(item)}
              />
            ))}
            {count >= visible.length && (
              <section className="flex h-[100dvh] snap-start items-center justify-center text-center text-fg/40">
                {done || sourceExhausted || filter === "saved" ? (
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
