"use client";

import { useEffect, useState } from "react";

// The 10 white tiles of the byte mark, on a 92px grid inside a 600x600 squircle
// (measured from public/byte-logo.png). `step` orders the cascade: the long
// left column fills top→bottom first, then the glyph's branches — so the mark
// "types" itself in like data filling, on-brand for a byte.
const TILE = 75;
const SQUARES = [
  { x: 171, y: 80, step: 0 },
  { x: 171, y: 171, step: 1 },
  { x: 171, y: 263, step: 2 },
  { x: 171, y: 354, step: 3 },
  { x: 171, y: 446, step: 4 },
  { x: 263, y: 263, step: 5 },
  { x: 354, y: 263, step: 6 },
  { x: 354, y: 354, step: 7 },
  { x: 263, y: 446, step: 8 },
  { x: 354, y: 446, step: 9 },
];

export default function Splash() {
  // Show on every load/reload (start visible so the feed never flashes first).
  const [show, setShow] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Just play the animation, then reveal the feed — don't wait on any
    // readiness signal. Page 0 is server-rendered, so real content is already
    // behind the splash; gating on readiness only risked lingering too long.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hold = reduce ? 300 : 1800; // ~the animation length
    const a = window.setTimeout(() => setLeaving(true), hold);
    const b = window.setTimeout(() => setShow(false), hold + 450);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-7 bg-bg transition-opacity duration-[450ms] ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      aria-hidden
    >
      <svg
        className="byte-mark h-32 w-32"
        viewBox="0 0 600 600"
        fill="none"
        role="img"
        aria-label="byte"
      >
        <defs>
          <linearGradient
            id="byte-grad"
            x1="0"
            y1="0"
            x2="600"
            y2="600"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#2bc9a0" />
            <stop offset="1" stopColor="#86cf22" />
          </linearGradient>
        </defs>
        <rect width="600" height="600" rx="140" fill="url(#byte-grad)" />
        {SQUARES.map((s) => (
          <rect
            key={`${s.x}-${s.y}`}
            className="byte-tile"
            x={s.x}
            y={s.y}
            width={TILE}
            height={TILE}
            rx="15"
            fill="#fff"
            style={{ animationDelay: `${0.3 + s.step * 0.055}s` }}
          />
        ))}
      </svg>

      <div className="flex flex-col items-center gap-3">
        <span className="byte-word bg-gradient-to-r from-[#28b380] to-[#57a728] bg-clip-text text-5xl font-bold tracking-tight text-transparent">
          byte
        </span>
        <span className="byte-tag text-xs font-semibold uppercase text-fg/45">
          Tech in bite-size
        </span>
      </div>

      <style>{`
        @keyframes byte-mark-in {
          0%   { opacity: 0; transform: scale(0.6); }
          70%  { opacity: 1; transform: scale(1.06); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes byte-tile-in {
          0%   { opacity: 0; transform: scale(0); }
          70%  { opacity: 1; transform: scale(1.18); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes byte-rise {
          0%   { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes byte-track {
          0%   { opacity: 0; letter-spacing: 0.1em; transform: translateY(8px); }
          100% { opacity: 1; letter-spacing: 0.42em; transform: translateY(0); }
        }

        .byte-mark {
          transform-origin: center;
          animation: byte-mark-in 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .byte-tile {
          transform-box: fill-box;
          transform-origin: center;
          /* back-out overshoot — each tile pops as it lands */
          animation: byte-tile-in 0.34s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .byte-word {
          animation: byte-rise 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.95s both;
        }
        .byte-tag {
          /* tracking-in trails the wordmark for follow-through */
          animation: byte-track 0.6s cubic-bezier(0.16, 1, 0.3, 1) 1.3s both;
          letter-spacing: 0.42em;
        }

        @media (prefers-reduced-motion: reduce) {
          .byte-mark, .byte-tile, .byte-word, .byte-tag { animation: none; }
        }
      `}</style>
    </div>
  );
}
