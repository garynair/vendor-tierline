import { APP_VERSION } from "@/lib/version";
import { LogoMark } from "@/components/logo";

// Shared layout for the signed-out screens (login, signup, onboarding).
// Always dark, whatever the OS theme. It sticks to palettes that globals.css
// doesn't remap for dark mode (zinc, emerald, rose, amber-300/400, orange-300/500,
// red-400/500/900/950), so it renders the same in both schemes.

export const authInputClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30";

export const authButtonClass =
  "w-full rounded-md bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50";

const highlights = [
  { title: "Tier each engagement", body: "Every service a vendor provides is scored on its own." },
  { title: "No vendor accounts", body: "Vendors answer through a private, expiring link." },
  { title: "Reviewer in the loop", body: "Confirm the tier or override it with a reason." },
  { title: "Diligence that fits", body: "Each tier gets its own follow-up questionnaire." },
];

// Illustrative sample for the marketing panel, not real data.
const previewRows = [
  { vendor: "Northwind Payroll", engagement: "Payroll processing", score: 0.82, tier: "Critical" },
  { vendor: "Globex Cloud", engagement: "Data warehouse hosting", score: 0.68, tier: "High" },
  { vendor: "Initech", engagement: "IT helpdesk", score: 0.41, tier: "Medium" },
  { vendor: "Umbrella Print", engagement: "Marketing print runs", score: 0.12, tier: "Low" },
];

const previewTierClass: Record<string, { badge: string; bar: string }> = {
  Critical: { badge: "bg-rose-500/15 text-rose-300 ring-rose-500/30", bar: "bg-rose-500" },
  High: { badge: "bg-orange-500/15 text-orange-300 ring-orange-500/30", bar: "bg-orange-500" },
  Medium: { badge: "bg-amber-400/15 text-amber-300 ring-amber-400/30", bar: "bg-amber-400" },
  Low: { badge: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30", bar: "bg-emerald-500" },
};

function ProductPreview() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 shadow-2xl shadow-emerald-950/40 backdrop-blur">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
          <span className="ml-2 text-xs font-medium text-zinc-400">Vendor overview</span>
        </div>
        <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-medium text-amber-300 ring-1 ring-amber-400/30">
          2 awaiting review
        </span>
      </div>
      <ul className="divide-y divide-zinc-800/80">
        {previewRows.map((row) => {
          const tierClass = previewTierClass[row.tier];
          return (
            <li key={row.vendor} className="flex items-center gap-4 px-4 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-100">{row.vendor}</p>
                <p className="truncate text-xs text-zinc-500">{row.engagement}</p>
              </div>
              <div className="hidden w-24 xl:block">
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div className={`h-full rounded-full ${tierClass.bar}`} style={{ width: `${row.score * 100}%` }} />
                </div>
                <p className="mt-1 text-right text-[10px] text-zinc-500">{Math.round(row.score * 100)}%</p>
              </div>
              <span className={`w-16 rounded-md px-2 py-0.5 text-center text-xs font-medium ring-1 ${tierClass.badge}`}>
                {row.tier}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 [color-scheme:dark]">
      <aside className="sticky top-0 hidden h-screen w-[55%] overflow-hidden border-r border-zinc-800 lg:block">
        {/* faint grid + glow */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,#a1a1aa_1px,transparent_1px),linear-gradient(to_bottom,#a1a1aa_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(ellipse_at_top_left,black_40%,transparent_75%)]"
        />
        <div aria-hidden="true" className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-emerald-700/10 blur-3xl" />

        <div className="relative flex h-full flex-col justify-between gap-6 p-10 xl:px-14">
          <LogoMark size="lg" />

          <div className="flex max-w-xl flex-col gap-6">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
                Third-party risk management
              </p>
              <h2 className="text-3xl font-semibold leading-tight text-zinc-50 [@media(min-height:960px)]:xl:text-4xl">
                Tier every vendor engagement by the risk it actually carries.
              </h2>
              <p className="text-sm leading-relaxed text-zinc-400">
                A short scored questionnaire sets the tier. The right due diligence follows. No
                spreadsheets to chase.
              </p>
            </div>

            <ProductPreview />

            <ul className="grid grid-cols-2 gap-3">
              {highlights.map((item) => (
                <li key={item.title} className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5">
                  <p className="flex items-center gap-2 text-sm font-medium text-zinc-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {item.title}
                  </p>
                  {/* descriptions only when there is vertical room */}
                  <p className="mt-1 hidden text-xs leading-relaxed text-zinc-400 [@media(min-height:900px)]:block">
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between gap-6 text-xs text-zinc-500">
            <p className="flex flex-wrap gap-x-4 gap-y-1">
              <span><span className="font-semibold text-zinc-300">7</span> risk factors</span>
              <span><span className="font-semibold text-zinc-300">4</span> configurable tiers</span>
              <span><span className="font-semibold text-zinc-300">2</span>-stage review</span>
            </p>
            <span className="shrink-0 rounded-full border border-zinc-800 px-2 py-0.5">v{APP_VERSION}</span>
          </div>
        </div>
      </aside>

      <main className="relative flex flex-1 items-center justify-center px-6 py-12">
        <div aria-hidden="true" className="absolute right-0 top-0 h-72 w-72 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="relative flex w-full max-w-sm flex-col gap-8">
          <div className="lg:hidden">
            <LogoMark size="lg" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold text-zinc-50">{title}</h1>
            <p className="text-sm text-zinc-400">{subtitle}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-xl shadow-black/30">
            {children}
          </div>
          {footer && <div className="text-sm text-zinc-400">{footer}</div>}
        </div>
      </main>
    </div>
  );
}

export function AuthField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-300">
      {label}
      {children}
    </label>
  );
}

export function AuthNotice({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  const toneClass =
    tone === "error"
      ? "border-red-900 bg-red-950/60 text-red-400"
      : "border-emerald-900 bg-emerald-950/60 text-emerald-300";
  return <p className={`rounded-md border px-3 py-2 text-sm ${toneClass}`}>{children}</p>;
}
