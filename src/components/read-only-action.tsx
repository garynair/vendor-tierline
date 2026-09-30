"use client";

import { useEffect, useState } from "react";

// Shown to read-only (learner) members in place of an action they can't perform,
// such as the public demo account. Clicking it explains why instead of doing nothing.
export function ReadOnlyAction({
  label,
  message = "This is a read-only demo account, so changes are turned off. Sign in as an admin or practitioner to add or edit data.",
  className = "rounded bg-black px-3 py-2 text-sm text-white",
}: {
  label: string;
  message?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => setOpen(false), 5000);
    return () => clearTimeout(timer);
  }, [open]);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-describedby={open ? "read-only-note" : undefined}
        className={`${className} opacity-70`}
      >
        {label}
      </button>
      {open && (
        <div
          id="read-only-note"
          role="status"
          className="absolute right-0 z-10 mt-2 w-72 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 shadow"
        >
          {message}
        </div>
      )}
    </div>
  );
}
