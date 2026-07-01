"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

// A pull-chain light switch. Grab the bead and pull it any direction, any
// distance — on release it springs back with a bouncy wobble and flips the
// `.light` class on <html>. Tapping works too.
const REST = 32; // resting distance from anchor to bead centre (px)
const MAX_DIST = 300; // how far the bead can be pulled
const BEAD = 24; // bead diameter
const HAPTIC_STEP = 16; // px of stretch between bead "ticks"

// Web Vibration API — buzzes on Android Chrome / capable desktops. iOS Safari
// has NO web haptic: it never implemented navigator.vibrate, and the old
// <input switch> toggle trick was patched out in iOS 26.5. Only a real user tap
// on a native switch fires the Taptic Engine there, which a pull-chain can't
// use — so iOS simply gets no buzz.
function buzz(ms: number) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported */
  }
}

// Spring constants (per-frame) — lightly underdamped: a couple of bounces then
// settles (damping ratio ~0.3).
const STIFFNESS = 0.14;
const DAMPING = 0.24;

export default function ThemeToggle() {
  const [light, setLight] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: REST }); // bead centre vs anchor

  const draggingRef = useRef(false);
  const moved = useRef(false);
  const anchor = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: REST });
  const vel = useRef({ x: 0, y: 0 });
  const raf = useRef<number | undefined>(undefined);
  const hapticStep = useRef(0); // last bead-tick step, for stretch haptics

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  const flip = () => {
    const next = !document.documentElement.classList.contains("light");
    const root = document.documentElement;
    root.classList.add("theme-transition"); // smooth color crossfade
    setLight(next);
    root.classList.toggle("light", next);
    localStorage.setItem("byte:theme", next ? "light" : "dark");
    window.setTimeout(() => root.classList.remove("theme-transition"), 350);
  };

  // Spring the bead back to rest, carrying any release velocity → natural wobble.
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

  const onPointerDown = (e: React.PointerEvent) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* not all pointers are capturable; fine */
    }
    if (raf.current) cancelAnimationFrame(raf.current);
    const r = e.currentTarget.getBoundingClientRect();
    anchor.current = { x: r.left + r.width / 2, y: r.top };
    moved.current = false;
    hapticStep.current = 0;
    draggingRef.current = true;
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    let dx = e.clientX - anchor.current.x;
    let dy = e.clientY - anchor.current.y;
    const dist = Math.hypot(dx, dy);
    if (dist > MAX_DIST) {
      dx = (dx / dist) * MAX_DIST;
      dy = (dy / dist) * MAX_DIST;
    }
    if (Math.hypot(dx, dy - REST) > 4) moved.current = true;

    // Tick like ball-chain beads passing as the cord stretches.
    const step = Math.floor(Math.max(0, dist - REST) / HAPTIC_STEP);
    if (step !== hapticStep.current) {
      hapticStep.current = step;
      buzz(4);
    }

    // Release velocity for a natural throw, clamped so a fast fling can't
    // send the spring wild.
    let vx = dx - pos.current.x;
    let vy = dy - pos.current.y;
    const vmag = Math.hypot(vx, vy);
    const VMAX = 28;
    if (vmag > VMAX) {
      vx = (vx / vmag) * VMAX;
      vy = (vy / vmag) * VMAX;
    }
    vel.current = { x: vx, y: vy };
    pos.current = { x: dx, y: dy };
    setOffset({ x: dx, y: dy });
  };

  const endDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    buzz(14); // firmer "click" of the switch
    flip(); // pulling the chain always toggles the light
    if (!moved.current) {
      // a tap gets a little downward kick so it still bounces
      pos.current = { x: 0, y: REST + 20 };
      vel.current = { x: 0, y: 0 };
    }
    startSpring();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      buzz(14);
      flip();
      pos.current = { x: 0, y: REST + 20 };
      vel.current = { x: 0, y: 0 };
      startSpring();
    }
  };

  const dist = Math.hypot(offset.x, offset.y);
  const angle = (Math.atan2(-offset.x, offset.y) * 180) / Math.PI;

  const cordStyle: CSSProperties = {
    position: "absolute",
    top: 0,
    left: "calc(50% - 1.5px)",
    width: "3px",
    // Stop at the bead's edge (not its centre) so the beads don't show inside it.
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
    <button
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      aria-label={light ? "Turn off the lights" : "Turn on the lights"}
      title="Pull the chain to switch theme"
      className={`relative -mt-4 h-11 w-6 touch-none select-none ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      }`}
    >
      {/* Overflow so the swinging chain isn't clipped by the header row. */}
      <span className="pointer-events-none absolute inset-0 text-fg/40">
        <span style={cordStyle} />
        <span
          style={beadStyle}
          className="flex items-center justify-center rounded-full border border-fg/20 bg-bg text-[11px] leading-none text-fg shadow-sm"
        >
          <span style={{ width: BEAD, height: BEAD }} className="flex items-center justify-center">
            {light ? "🌙" : "☀️"}
          </span>
        </span>
      </span>
    </button>
  );
}
