"use client";

import { useEffect } from "react";
import Clarity from "@microsoft/clarity";

// Microsoft Clarity (session analytics/heatmaps). Set NEXT_PUBLIC_CLARITY_ID to
// your project id (clarity.microsoft.com). Runs only in production so dev
// sessions aren't recorded; a missing id is a no-op.
const PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_ID;

export default function ClarityAnalytics() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !PROJECT_ID) return;
    Clarity.init(PROJECT_ID);
  }, []);

  return null;
}
