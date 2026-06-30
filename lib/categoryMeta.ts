import type { CategoryId } from "@/lib/categorize";

export const CATEGORY_META: Record<
  CategoryId,
  { label: string; emoji: string }
> = {
  ai: { label: "AI", emoji: "🤖" },
  devtools: { label: "Dev Tools", emoji: "🛠️" },
  web: { label: "Web", emoji: "🌐" },
  data: { label: "Data & Infra", emoji: "🗄️" },
  security: { label: "Security", emoji: "🔒" },
  apps: { label: "Apps & Games", emoji: "🎮" },
  hardware: { label: "Hardware & Science", emoji: "🔬" },
  other: { label: "Other", emoji: "✨" },
};

/** Display order for the filter bar. */
export const CATEGORY_ORDER: CategoryId[] = [
  "ai",
  "devtools",
  "web",
  "data",
  "security",
  "apps",
  "hardware",
  "other",
];
