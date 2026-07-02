"use client";

// Opens a Tally feedback form in a popup. Configure the form id via
// NEXT_PUBLIC_TALLY_FORM_ID (from the form's tally.so/r/<id> URL); the button
// is hidden until it's set. Loads Tally's embed script on first click.
const FORM_ID = process.env.NEXT_PUBLIC_TALLY_FORM_ID;
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

export default function Feedback({ className }: { className?: string }) {
  if (!FORM_ID) return null;

  const open = async () => {
    try {
      await loadTally();
      window.Tally?.openPopup(FORM_ID, { layout: "modal", width: 500, overlay: true });
    } catch {
      // script blocked/offline — fall back to the hosted form in a new tab
      window.open(`https://tally.so/r/${FORM_ID}`, "_blank", "noopener");
    }
  };

  return (
    <div className={className ?? "mt-7 border-t border-fg/10 pt-4"}>
      <button
        onClick={open}
        className="text-sm font-medium text-fg/60 transition hover:text-fg"
      >
        💬 Send feedback
      </button>
    </div>
  );
}
