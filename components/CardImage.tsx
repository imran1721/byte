"use client";

import { useState } from "react";

/**
 * Renders an og:image as a rounded hero. og:images are unpredictable (dead
 * links, hotlink protection, wrong content-type), so we hide the element on
 * error instead of showing a broken-image icon.
 */
export default function CardImage({
  src,
  alt,
  accent,
}: {
  src: string;
  alt: string;
  accent: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <div
      className="mb-5 overflow-hidden rounded-2xl border border-fg/10"
      style={{ background: `${accent}14` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-32 w-full object-cover sm:h-40"
      />
    </div>
  );
}
