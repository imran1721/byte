# byte ⚡

**Tech in bite-size** — a vertical, TikTok-style feed of new tools, libraries,
and projects that people are liking right now, aggregated from across the dev
web and ranked so the fresh + well-liked stuff floats to the top.

One full-screen card per item, snap scrolling, infinite feed.

## What it does

- **Aggregates 6 sources** into one normalized feed:

  | Source | Signal | Config |
  |---|---|---|
  | **Hacker News** | Show HN + front-page stories (Algolia API) | none |
  | **GitHub** | new repos by stars (Search API) | optional token |
  | **Dev.to** | top articles of the week | none |
  | **Lobsters** | hottest dev stories | none |
  | **Reddit** | r/programming, webdev, selfhosted, LocalLLaMA | OAuth creds |
  | **Product Hunt** | newly upvoted products | dev token |

  Reddit and Product Hunt are skipped silently unless their keys are set.

- **Ranks** everything with a trending score (popularity damped by `log`,
  decayed by age — the classic HN gravity shape) and **dedupes** across sources.
- **Enriches** each card with the linked page's `og:description` and `og:image`,
  so every card explains *what the thing is* and shows a visual.
- **Categorizes** items (AI, Dev Tools, Web, Data & Infra, Security, Apps &
  Games, Hardware & Science) with a keyword classifier — no LLM, instant.
- **Personalizes**: a first-run picker asks for 3+ interests (saved to
  `localStorage`) and defaults the feed to a **For You** view. Browse other
  categories via a bottom-sheet filter.
- **Infinite scroll**: server-side pagination fetches the next page as you near
  the end. HN alone has ~250 pages, so the feed effectively never runs out.

### Niceties

- Animated **splash** that holds until the feed has actually rendered.
- **Light / dark** theme toggle.
- **Keyboard nav** (↑/↓, `j`/`k`, Space) and a scroll-position counter.
- **Responsive** — scales the card down on short viewports so nothing overflows.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000  (PORT=3030 npm run dev for a custom port)
```

For realistic performance test a production build — dev re-fetches every
request, prod serves the ISR-cached feed near-instantly:

```bash
npm run build && npm run start
```

## Config

Everything works with no keys. Copy `.env.example` → `.env.local` to unlock more:

- `GITHUB_TOKEN` — raises the GitHub Search rate limit (10 → 30 req/min).
- `PRODUCT_HUNT_TOKEN` — enables the Product Hunt source ([dev token](https://www.producthunt.com/v2/oauth/applications)).
- `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` — enables Reddit (anonymous `.json`
  access is now blocked; register a free "script" app at reddit.com/prefs/apps).

## How it's built

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 |
| Styling | Tailwind CSS, Space Grotesk |
| Data | server `fetch` with ISR (30-min revalidate); streamed via `loading.tsx` |
| Font/icon | self-hosted via `next/font`; inline SVG app icon |

### Project layout

```
app/
  page.tsx            getFeedPage(0) → <Feed>
  api/feed/route.ts   GET ?page=N → next page of items
  loading.tsx         streaming boundary (splash paints instantly)
  layout.tsx          fonts, metadata, <Splash>
  icon.svg            favicon
lib/
  feed.ts             getFeedPage: fetch → dedupe → rank → enrich → categorize
  sources/*.ts        one file per source, each returns FeedItem[]
  enrich.ts           fetch og:description / og:image for a page of items
  categorize.ts       keyword → category classifier
  rank / types / format / html / categoryMeta
components/
  Feed.tsx            snap feed, filter sheet, infinite scroll, keyboard nav
  Card.tsx            one full-screen item card
  CardImage.tsx       og:image hero (self-hides on error)
  Onboarding.tsx      first-run interest picker
  Splash.tsx          animated intro, waits for content
  ByteIcon.tsx        inline SVG logo
  ThemeToggle.tsx     light/dark switch
```

## Adding a source

1. Write `lib/sources/<name>.ts` exporting `fetch<Name>(page = 0): Promise<FeedItem[]>`.
2. Add it to `getFeedPage()` in `lib/feed.ts` (and to the `Source` union in
   `lib/types.ts` + a style entry in `Card.tsx`'s `SOURCE_META`).

The normalized `FeedItem` model means the feed UI needs no other changes. If the
source paginates, honor the `page` arg; if not, gate it to `page === 0`.

> Twitter/X and LinkedIn are intentionally skipped — no free API and aggressive
> anti-scraping. They could be added later via a paid scraper (e.g. Apify)
> behind the same `FeedItem` interface.
