"use client";

import { useState } from "react";
import type { CategoryId } from "@/lib/categorize";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/categoryMeta";

const MIN = 3;
// "other" isn't a real interest — only offer the meaningful topics.
const CHOICES = CATEGORY_ORDER.filter((id) => id !== "other");

export default function Onboarding({
  onDone,
  initial = [],
  onCancel,
}: {
  onDone: (selected: CategoryId[]) => void;
  /** Pre-selected interests (when editing an existing selection). */
  initial?: CategoryId[];
  /** When provided (edit mode), shows a way to back out without saving. */
  onCancel?: () => void;
}) {
  const [selected, setSelected] = useState<CategoryId[]>(initial);

  const toggle = (id: CategoryId) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-bg px-6 py-12">
      <div className="w-full max-w-lg">
        {onCancel && (
          <button
            onClick={onCancel}
            aria-label="Close"
            className="absolute right-5 top-5 text-2xl leading-none text-fg/40 transition hover:text-fg"
          >
            ✕
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/byte-logo.png" alt="byte" className="h-10 w-auto" />
        <p className="mt-2 text-sm font-semibold uppercase tracking-[0.2em] text-fg/40">
          Tech in bite-size
        </p>

        <h1 className="mt-10 text-3xl font-bold tracking-tight">
          What are you into?
        </h1>
        <p className="mt-2 text-fg/60">
          Pick at least {MIN} topics to personalize your feed.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {CHOICES.map((id) => {
            const active = selected.includes(id);
            return (
              <button
                key={id}
                onClick={() => toggle(id)}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "border-fg bg-fg text-bg"
                    : "border-fg/15 bg-fg/5 text-fg/80 hover:bg-fg/10"
                }`}
              >
                <span>{CATEGORY_META[id].emoji}</span>
                <span>{CATEGORY_META[id].label}</span>
              </button>
            );
          })}
        </div>

        <button
          disabled={selected.length < MIN}
          onClick={() => onDone(selected)}
          className="mt-10 w-full rounded-xl bg-fg py-3 font-semibold text-bg transition enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {selected.length < MIN
            ? `Select ${MIN - selected.length} more`
            : "Show my feed"}
        </button>
      </div>
    </div>
  );
}
