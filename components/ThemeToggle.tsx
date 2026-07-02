"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

// A pull-chain light switch that both TAPS and PULLS:
//   • Tap the bead → it goes through a real <input type="checkbox" switch>,
//     the only control that fires the iOS Taptic Engine (Safari has no
//     Vibration API and the programmatic switch hack died in iOS 26.5). So a
//     tap buzzes.
//   • Pull the bead → once the finger actually moves we take over the pointer
//     and run a draggable pendulum with spring-back; releasing flips the theme.
//     A drag can't be routed through the native control, so a pull doesn't buzz
//     on iOS (Android/desktop still get navigator.vibrate).
// We only hijack the pointer AFTER movement, so an untouched tap stays a clean
// native toggle and keeps its haptic.
const REST = 32; // resting distance from anchor to bead centre (px)
const MAX_DIST = 300; // how far the bead can be pulled
const BEAD = 24; // bead diameter
const DRAG_THRESHOLD = 6; // px of movement before a tap becomes a pull

const STIFFNESS = 0.14; // lightly underdamped spring: a couple of bounces
const DAMPING = 0.24;

function buzz(ms: number) {
  try {
    navigator.vibrate?.(ms); // no-op on iOS Safari
  } catch {
    /* unsupported */
  }
}

export default function ThemeToggle() {
  const [light, setLight] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: REST }); // bead centre vs anchor

  const box = useRef<HTMLDivElement>(null);
  const down = useRef(false); // a pointer is currently pressed
  const draggingRef = useRef(false); // escalated to a pull
  const anchor = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: REST });
  const vel = useRef({ x: 0, y: 0 });
  const raf = useRef<number | undefined>(undefined);
  const skipChange = useRef(false); // a pull already handled the flip; ignore native change
  const endDrag = useRef<(() => void) | null>(null); // tears down the active pull

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      endDrag.current?.(); // don't leak window listeners if we unmount mid-pull
    };
  }, []);

  const applyTheme = (next: boolean) => {
    const root = document.documentElement;
    root.classList.add("theme-transition"); // smooth colour crossfade
    setLight(next);
    root.classList.toggle("light", next);
    localStorage.setItem("byte:theme", next ? "light" : "dark");
    window.setTimeout(() => root.classList.remove("theme-transition"), 350);
  };

  // Spring the bead back to rest → natural wobble, carrying release velocity.
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

  // TAP path: the native switch toggled from a real tap/keyboard → on iOS the
  // Taptic Engine already fired. Skip if a pull just handled the flip.
  const onChange = () => {
    if (skipChange.current) {
      skipChange.current = false;
      return;
    }
    applyTheme(!document.documentElement.classList.contains("light"));
    buzz(14);
    pos.current = { x: 0, y: REST + 22 }; // kick the chain so it bounces
    vel.current = { x: 0, y: 0 };
    startSpring();
  };

  const onPointerDown = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    const r = box.current!.getBoundingClientRect();
    anchor.current = { x: r.left + r.width / 2, y: r.top };
    down.current = true;
    draggingRef.current = false;

    // Track the pull on `window`, not the tiny <input>, so the bead keeps
    // following once the cursor leaves the hit-area (e.g. dragged down over the
    // feed) and always gets its release — no more freezing mid-pull. We don't
    // capture or preventDefault until movement escalates a press into a pull,
    // so a plain tap stays a clean native toggle (keeps the iOS haptic).
    const move = (ev: PointerEvent) => {
      if (!down.current) return;
      let dx = ev.clientX - anchor.current.x;
      let dy = ev.clientY - anchor.current.y;

      if (!draggingRef.current) {
        if (Math.hypot(dx, dy - REST) <= DRAG_THRESHOLD) return;
        draggingRef.current = true;
        setDragging(true);
      }
      ev.preventDefault(); // it's a pull now — suppress text selection etc.

      const d = Math.hypot(dx, dy);
      if (d > MAX_DIST) {
        dx = (dx / d) * MAX_DIST;
        dy = (dy / d) * MAX_DIST;
      }
      let vx = dx - pos.current.x;
      let vy = dy - pos.current.y;
      const vmag = Math.hypot(vx, vy);
      const VMAX = 28; // clamp so a fast fling can't send the spring wild
      if (vmag > VMAX) {
        vx = (vx / vmag) * VMAX;
        vy = (vy / vmag) * VMAX;
      }
      vel.current = { x: vx, y: vy };
      pos.current = { x: dx, y: dy };
      setOffset({ x: dx, y: dy });
    };

    const up = () => {
      down.current = false;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("blur", up); // released outside the window
      endDrag.current = null;
      if (!draggingRef.current) return; // a tap — let the native onChange handle it
      draggingRef.current = false;
      setDragging(false);
      skipChange.current = true; // a stray native change may follow; ignore it
      window.setTimeout(() => (skipChange.current = false), 0);
      applyTheme(!document.documentElement.classList.contains("light"));
      buzz(14);
      startSpring();
    };

    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("blur", up);
    endDrag.current = up;
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
    <div
      ref={box}
      className={`relative -mt-4 h-11 w-6 touch-none select-none ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      }`}
    >
      {/* Visual pull-chain — decorative; the input below owns the pointer. */}
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

      {/* Real native switch: a plain tap fires the iOS Taptic Engine. It also
          receives the pointer, so a drag becomes the pull (handlers above).
          `switch` is set via ref so React keeps the attribute. */}
      <input
        type="checkbox"
        role="switch"
        checked={light}
        onChange={onChange}
        onPointerDown={onPointerDown}
        ref={(el) => el?.setAttribute("switch", "")}
        aria-label={light ? "Turn off the lights" : "Turn on the lights"}
        title="Tap or pull the chain to switch theme"
        className="absolute left-1/2 h-11 w-11 -translate-x-1/2 opacity-0"
        style={{ top: REST - 22, cursor: "inherit" }}
      />
    </div>
  );
}
