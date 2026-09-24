// Vendor Tierline mark: three bars stepping down from Critical to Low.
// Fixed colours (not theme tokens), so it looks the same in light and dark.

function TierBars({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="3" y="4" width="18" height="3.5" rx="1.75" fill="#f43f5e" />
      <rect x="3" y="10.25" width="13" height="3.5" rx="1.75" fill="#fbbf24" />
      <rect x="3" y="16.5" width="8" height="3.5" rx="1.75" fill="#34d399" />
    </svg>
  );
}

export function LogoMark({ size = "md", tone = "dark" }: { size?: "md" | "lg"; tone?: "dark" | "auto" }) {
  const large = size === "lg";
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex items-center justify-center rounded-xl border shadow-lg ${
          large ? "h-11 w-11" : "h-8 w-8 rounded-lg"
        } ${
          tone === "dark"
            ? "border-zinc-700 bg-zinc-900 shadow-emerald-500/10"
            : "border-gray-200 bg-white shadow-none"
        }`}
      >
        <TierBars className={large ? "h-6 w-6" : "h-5 w-5"} />
      </span>
      <span
        className={`font-semibold tracking-tight ${large ? "text-xl" : "text-base"} ${
          tone === "dark" ? "text-zinc-50" : ""
        }`}
      >
        Vendor Tierline
      </span>
    </div>
  );
}
