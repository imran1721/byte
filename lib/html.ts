const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#x27;": "'",
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&[a-z0-9#]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
}

/** Strip HTML tags, decode entities, collapse whitespace. */
export function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/** Truncate on a word boundary with an ellipsis. */
export function truncate(s: string, max = 220): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return cut.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd() + "…";
}

/** Find the first `content` value for any of the given meta property/name keys. */
function metaContent(html: string, props: string[]): string | null {
  for (const prop of props) {
    // content before the property attr, or property before content — match both.
    const a = new RegExp(
      `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)`,
      "i",
    );
    const b = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`,
      "i",
    );
    const m = html.match(a) ?? html.match(b);
    if (m?.[1]) return m[1];
  }
  return null;
}

/**
 * Human-readable summary from a page's HTML: prefer Open Graph / Twitter
 * description, fall back to the standard meta description.
 */
export function extractMetaDescription(html: string): string | null {
  const raw = metaContent(html, [
    "og:description",
    "twitter:description",
    "description",
  ]);
  if (!raw) return null;
  const text = stripHtml(raw);
  return text.length > 10 ? text : null;
}

/**
 * A representative image for the page (og:image / twitter:image). Relative URLs
 * are resolved against the page URL. Returns null if none or invalid.
 */
export function extractMetaImage(html: string, baseUrl: string): string | null {
  const raw = metaContent(html, [
    "og:image",
    "og:image:url",
    "og:image:secure_url",
    "twitter:image",
    "twitter:image:src",
  ]);
  if (!raw) return null;
  try {
    const resolved = new URL(decodeEntities(raw.trim()), baseUrl);
    // Only surface http(s) images — skip data: and other schemes.
    return resolved.protocol === "https:" || resolved.protocol === "http:"
      ? resolved.toString()
      : null;
  } catch {
    return null;
  }
}
