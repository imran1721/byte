"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

// A pull-chain light switch. Tap it, or grab the bead and pull the chain down
// and release past the threshold — both flip the `.light` class on <html>.
const CORD = 20; // resting cord length (px)
const MAX_PULL = 40; // how far the cord can stretch
const PULL_THRESHOLD = 18; // release past this → it switches
const TAP_PULL = 15; // virtual pull distance for taps/keyboard, so they bob too

export default function ThemeToggle() {
  const [light, setLight] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  // Height the cord springs back from; non-null → the bounce animation is playing.
  const [releaseFrom, setReleaseFrom] = useState<number | null>(null);

  const draggingRef = useRef(false);
  const dragYRef = useRef(0);
  const startY = useRef(0);
  const moved = useRef(false);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
  }, []);

  const flip = () => {
    const next = !light;
    const root = document.documentElement;
    root.classList.add("theme-transition"); // smooth color crossfade
    setLight(next);
    root.classList.toggle("light", next);
    localStorage.setItem("byte:theme", next ? "light" : "dark");
    window.setTimeout(() => root.classList.remove("theme-transition"), 350);
  };

  // Play the springy multi-bounce from the given pulled height.
  const bounce = (fromHeight: number) => {
    setReleaseFrom(null); // reset first so the animation restarts on rapid toggles
    requestAnimationFrame(() => setReleaseFrom(fromHeight));
    clearTimeout(releaseTimer.current);
    releaseTimer.current = setTimeout(() => setReleaseFrom(null), 720);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* not all pointers are capturable; fine */
    }
    startY.current = e.clientY;
    moved.current = false;
    draggingRef.current = true;
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const dy = e.clientY - startY.current;
    if (dy > 3) moved.current = true;
    const pulled = Math.max(0, Math.min(dy, MAX_PULL));
    dragYRef.current = pulled;
    setDragY(pulled);
  };

  const endDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    const pulled = dragYRef.current;
    const wasTap = !moved.current;
    if (pulled >= PULL_THRESHOLD || wasTap) flip();
    // Bounce back from wherever it was let go (taps get a small virtual pull).
    bounce(CORD + Math.max(pulled, wasTap ? TAP_PULL : 8));
    dragYRef.current = 0;
    setDragY(0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      flip();
      bounce(CORD + TAP_PULL);
    }
  };

  const releasing = releaseFrom != null;
  const cordStyle: CSSProperties = {
    height: `${CORD + dragY}px`,
    background:
      "repeating-linear-gradient(to bottom, currentColor 0 2px, transparent 2px 4.5px)",
    ...(releasing
      ? ({ "--pulled": `${releaseFrom}px`, "--cord": `${CORD}px` } as CSSProperties)
      : {}),
  };

  return (
    <button
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      aria-label={light ? "Turn off the lights" : "Turn on the lights"}
      title="Tap or pull to switch theme"
      className="relative -mt-4 h-11 w-6 touch-none cursor-grab select-none active:cursor-grabbing"
    >
      {/* Absolutely positioned so the cord stretching never resizes the header
          row — it just overflows downward. */}
      <span className="absolute inset-x-0 top-0 flex flex-col items-center">
        {/* ball-chain cord — stretches as you pull, bobs on release */}
        <span
          className={`w-[3px] text-fg/40 ${releasing ? "cord-release" : ""}`}
          style={cordStyle}
        />
        {/* the pull handle */}
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-fg/20 bg-fg/10 text-[11px] leading-none shadow-sm">
          {light ? "🌙" : "☀️"}
        </span>
      </span>
    </button>
  );
}
