import type { FeedItem } from "@/lib/types";

export type CategoryId =
  | "ai"
  | "devtools"
  | "web"
  | "data"
  | "security"
  | "apps"
  | "hardware"
  | "other";

export interface Category {
  id: CategoryId;
  label: string;
  emoji: string;
  /** Keywords matched (word-boundary, case-insensitive) against title+description. */
  keywords: string[];
}

/**
 * Ordered by specificity — an item can match several categories, and the filter
 * shows it under each. "other" is the implicit fallback when nothing matches.
 * Keep keywords specific enough to avoid false positives (e.g. "go" the
 * language is too noisy to include).
 */
export const CATEGORIES: Category[] = [
  {
    id: "ai",
    label: "AI",
    emoji: "🤖",
    keywords: [
      "ai", "a.i.", "llm", "llms", "gpt", "chatgpt", "claude", "anthropic",
      "openai", "gemini", "llama", "mistral", "qwen", "deepseek", "agent",
      "agents", "agentic", "model", "models", "machine learning", "ml",
      "neural", "deep learning", "diffusion", "transformer", "embedding",
      "embeddings", "rag", "fine-tune", "fine-tuning", "inference", "chatbot",
      "prompt", "prompts", "vision model", "speech", "text-to", "image gen",
      "generative", "mcp", "copilot", "vector",
    ],
  },
  {
    id: "devtools",
    label: "Dev Tools",
    emoji: "🛠️",
    keywords: [
      "cli", "terminal", "library", "framework", "sdk", "api", "compiler",
      "debugger", "ide", "editor", "devtool", "devtools", "linter",
      "formatter", "package manager", "build tool", "plugin", "extension",
      "boilerplate", "scaffold", "toolkit", "wrapper", "parser", "runtime",
      "git", "open-source tool",
    ],
  },
  {
    id: "web",
    label: "Web",
    emoji: "🌐",
    keywords: [
      "web", "browser", "frontend", "front-end", "css", "html", "javascript",
      "typescript", "react", "vue", "svelte", "angular", "next.js", "nextjs",
      "tailwind", "website", "web app", "webapp", "http", "dom", "wasm",
      "webassembly", "spa", "ssr", "ui component",
    ],
  },
  {
    id: "data",
    label: "Data & Infra",
    emoji: "🗄️",
    keywords: [
      "database", "sql", "postgres", "postgresql", "mysql", "sqlite",
      "kubernetes", "k8s", "docker", "container", "cloud", "serverless",
      "devops", "infra", "infrastructure", "pipeline", "etl", "data engineering",
      "analytics", "warehouse", "redis", "kafka", "observability", "logging",
      "monitoring", "self-host", "self-hosted", "deployment", "terraform",
    ],
  },
  {
    id: "security",
    label: "Security",
    emoji: "🔒",
    keywords: [
      "security", "encryption", "encrypted", "privacy", "private", "auth",
      "authentication", "oauth", "vulnerability", "cve", "password", "passkey",
      "vpn", "exploit", "malware", "phishing", "firewall", "zero-trust",
      "end-to-end", "e2ee", "secrets",
    ],
  },
  {
    id: "apps",
    label: "Apps & Games",
    emoji: "🎮",
    keywords: [
      "game", "gaming", "puzzle", "app", "productivity", "note-taking",
      "notes", "calendar", "todo", "chat app", "social", "music", "video",
      "photo", "ios", "android", "mobile app", "desktop app", "macos",
      "iphone", "browser game",
    ],
  },
  {
    id: "hardware",
    label: "Hardware & Science",
    emoji: "🔬",
    keywords: [
      "hardware", "robot", "robotics", "chip", "fpga", "arduino", "raspberry pi",
      "space", "satellite", "rocket", "physics", "biology", "chemistry",
      "science", "scientific", "quantum", "sensor", "3d print", "3d-print",
      "embedded", "iot", "drone", "telescope", "genome", "dna",
    ],
  },
];

const COMPILED = CATEGORIES.map((c) => ({
  id: c.id,
  test: new RegExp(
    "(?:^|[^a-z0-9])(?:" +
      c.keywords
        .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|") +
      ")(?:[^a-z0-9]|$)",
    "i",
  ),
}));

/** Categories an item belongs to (may be empty → treated as "other"). */
export function categorize(item: FeedItem): CategoryId[] {
  const haystack = `${item.title} ${item.description} ${item.language ?? ""}`;
  const ids = COMPILED.filter((c) => c.test.test(haystack)).map((c) => c.id);
  return ids.length > 0 ? ids : ["other"];
}
