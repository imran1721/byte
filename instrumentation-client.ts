import posthog from "posthog-js";

// PostHog product analytics — Next.js native client instrumentation (runs
// before hydration). Mirrors Clarity: production only, so dev sessions aren't
// tracked, and a no-op when the token is unset. Set the two NEXT_PUBLIC_
// variables in .env.local and on your host (Vercel) — they're inlined at build.
const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

if (token && process.env.NODE_ENV === "production") {
  posthog.init(token, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    defaults: "2026-05-30",
  });
}
