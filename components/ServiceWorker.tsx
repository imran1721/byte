"use client";

import { useEffect } from "react";

/**
 * Registers the service worker so the app is installable / works offline.
 * Production only — in dev, SW caching fights Next's on-demand chunks.
 */
export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
