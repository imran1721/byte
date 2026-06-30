import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        hn: "#ff6600",
        gh: "#8b5cf6",
        // Themeable fg/bg — channels live in globals.css, swapped by .light on
        // <html>. <alpha-value> keeps every existing /10, /40 etc. working.
        fg: "rgb(var(--fg) / <alpha-value>)",
        bg: "rgb(var(--bg) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};

export default config;
