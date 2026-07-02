"use client";

// Opens the byte feedback form (tally.so/r/ODgNRg) in a popup. The form id is
// public (it ships in embed code), so we default it and allow an override via
// NEXT_PUBLIC_TALLY_FORM_ID. Tally's embed script loads on first click, not on
// every page, so it costs nothing until someone actually opens feedback.
const FORM_ID = process.env.NEXT_PUBLIC_TALLY_FORM_ID || "ODgNRg";
const SCRIPT = "https://tally.so/widgets/embed.js";

declare global {
  interface Window {
    Tally?: { openPopup: (id: string, opts?: Record<string, unknown>) => void };
  }
}

function loadTally(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Tally) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT}"]`,
    );
    const s = existing ?? document.createElement("script");
    s.addEventListener("load", () => resolve(), { once: true });
    s.addEventListener("error", () => reject(), { once: true });
    if (!existing) {
      s.src = SCRIPT;
      s.async = true;
      document.body.appendChild(s);
    }
  });
}

export default function Feedback({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const open = async () => {
    try {
      await loadTally();
      window.Tally?.openPopup(FORM_ID, {
        layout: "modal",
        width: 500,
        overlay: true,
        emoji: { text: "👋", animation: "wave" },
      });
    } catch {
      // script blocked/offline — fall back to the hosted form in a new tab
      window.open(`https://tally.so/r/${FORM_ID}`, "_blank", "noopener");
    }
  };

  return (
    <button
      onClick={open}
      aria-label="Send feedback"
      title="Send feedback"
      className={
        className ?? "text-sm font-medium text-fg/60 transition hover:text-fg"
      }
    >
      {children ?? "💬 Send feedback"}
    </button>
  );
}
