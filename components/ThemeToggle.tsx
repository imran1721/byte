"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

// A pull-chain light switch. The bead hangs on a cord and bounces on a spring
// when toggled. The tappable target is a real <input type="checkbox" switch>
// overlaid on the bead — on iOS that native control is the ONLY thing that
// fires the Taptic Engine (Safari has no Vibration API, and the old
// programmatic switch hack was patched out in iOS 26.5). A genuine finger tap
// on it buzzes; Android/desktop get navigator.vibrate too.
const REST = 32; // resting distance from anchor to bead centre (px)
const BEAD = 24; // bead diameter
const KICK = 22; // downward bounce given on each toggle

// Spring constants (per-frame) — lightly underdamped: a couple of bounces then
// settles (damping ratio ~0.3).
const STIFFNESS = 0.14;
const DAMPING = 0.24;

// Non-iOS vibration. No-op on iOS Safari (unsupported) — the native switch tap
// covers iOS instead.
function buzz(ms: number) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported */
  }
}

export default function ThemeToggle() {
  const [light, setLight] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: REST }); // bead centre vs anchor

  const pos = useRef({ x: 0, y: REST });
  const vel = useRef({ x: 0, y: 0 });
  const raf = useRef<number | undefined>(undefined);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  // Spring the bead back to rest → natural wobble after a kick.
  const startSpring = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    const step = () => {
      const p = pos.current;
      const v = vel.current;
      v.x += (0 - p.x) * STIFFNESS - v.x * DAMPING;
      v.y += (REST - p.y) * STIFFNESS - v.y * DAMPING;
      p.x += v.x;
      p.y += v.y;
      setOffset({ x: p.x, y: p.y });
      const settled =
        Math.abs(p.x) < 0.3 &&
        Math.abs(p.y - REST) < 0.3 &&
        Math.hypot(v.x, v.y) < 0.3;
      if (settled) {
        pos.current = { x: 0, y: REST };
        vel.current = { x: 0, y: 0 };
        setOffset({ x: 0, y: REST });
        return;
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  // Fired by the native switch toggling (real tap / keyboard). On iOS the tap
  // itself already buzzed via the Taptic Engine; buzz() covers Android/desktop.
  const onToggle = () => {
    const next = !document.documentElement.classList.contains("light");
    const root = document.documentElement;
    root.classList.add("theme-transition"); // smooth colour crossfade
    setLight(next);
    root.classList.toggle("light", next);
    localStorage.setItem("byte:theme", next ? "light" : "dark");
    window.setTimeout(() => root.classList.remove("theme-transition"), 350);

    buzz(14);
    // Kick the bead down so the chain bounces on every flip.
    pos.current = { x: 0, y: REST + KICK };
    vel.current = { x: 0, y: 0 };
    startSpring();
  };

  const dist = Math.hypot(offset.x, offset.y);
  const angle = (Math.atan2(-offset.x, offset.y) * 180) / Math.PI;

  const cordStyle: CSSProperties = {
    position: "absolute",
    top: 0,
    left: "calc(50% - 1.5px)",
    width: "3px",
    height: `${Math.max(0, dist - BEAD / 2)}px`,
    transformOrigin: "top center",
    transform: `rotate(${angle}deg)`,
    background:
      "repeating-linear-gradient(to bottom, currentColor 0 2px, transparent 2px 4.5px)",
  };
  const beadStyle: CSSProperties = {
    position: "absolute",
    top: 0,
    left: "50%",
    transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
  };

  return (
    <div className="relative -mt-4 h-11 w-6 select-none">
      {/* Visual pull-chain — purely decorative; the input below takes the tap. */}
      <span className="pointer-events-none absolute inset-0 text-fg/40">
        <span style={cordStyle} />
        <span
          style={beadStyle}
          className="flex items-center justify-center rounded-full border border-fg/20 bg-bg text-[11px] leading-none text-fg shadow-sm"
        >
          <span
            style={{ width: BEAD, height: BEAD }}
            className="flex items-center justify-center"
          >
            {light ? "🌙" : "☀️"}
          </span>
        </span>
      </span>

      {/* The real native switch: a genuine tap here fires the iOS Taptic Engine.
          Invisible (opacity 0) but hit-testable; sized as a comfortable target
          over the resting bead. `switch` is set via ref so React keeps it. */}
      <input
        type="checkbox"
        role="switch"
        checked={light}
        onChange={onToggle}
        ref={(el) => el?.setAttribute("switch", "")}
        aria-label={light ? "Turn off the lights" : "Turn on the lights"}
        title="Tap the chain to switch theme"
        className="absolute left-1/2 h-11 w-11 -translate-x-1/2 cursor-pointer opacity-0"
        style={{ top: REST - 22 }}
      />
    </div>
  );
}
