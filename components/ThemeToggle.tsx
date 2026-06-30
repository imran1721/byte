"use client";

import { useEffect, useState } from "react";

// The actual theme is applied pre-paint by the inline script in layout.tsx
// (no flash). This button just reads/flips the `.light` class on <html> and
// remembers the choice.
export default function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
  }, []);

  const toggle = () => {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    localStorage.setItem("byte:theme", next ? "light" : "dark");
  };

  return (
    <button
      onClick={toggle}
      aria-label={light ? "Switch to dark theme" : "Switch to light theme"}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-fg/10 text-sm leading-none transition hover:bg-fg/20"
    >
      {light ? "🌙" : "☀️"}
    </button>
  );
}
