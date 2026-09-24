import { APP_VERSION } from "@/lib/version";

// Shared layout for the signed-out screens (login, signup, onboarding).
// Always dark, whatever the OS theme. It uses the zinc and emerald palettes,
// which globals.css doesn't remap for dark mode, so it renders the same in
// both schemes.

export const authInputClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30";

export const authButtonClass =
  "w-full rounded-md bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50";

const highlights = [
  {
    title: "Tier each engagement",
    body: "One vendor can run payroll and host your wiki. Each service is scored on its own risk.",
  },
  {
    title: "No accounts for vendors",
    body: "Vendors answer through a private, expiring link and can pick up where they left off.",
  },
  {
    title: "A reviewer decides",
    body: "Scores suggest a tier. A reviewer confirms it or overrides it with a recorded reason.",
  },
  {
    title: "Due diligence that fits",
    body: "Critical engagements get the enhanced follow-up; low-risk ones stay light.",
  },
];

function LogoMark() {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
        <rect x="3" y="4" width="18" height="3.5" rx="1.75" className="fill-red-500" />
        <rect x="3" y="10.25" width="13" height="3.5" rx="1.75" className="fill-amber-400" />
        <rect x="3" y="16.5" width="8" height="3.5" rx="1.75" className="fill-emerald-400" />
      </svg>
      <span className="text-lg font-semibold tracking-tight text-zinc-50">Vendor Tierline</span>
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
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-950 to-emerald-950/40 p-12 lg:flex">
        <LogoMark />
        <div className="flex max-w-md flex-col gap-8">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
              Third-party risk management
            </p>
            <h2 className="text-3xl font-semibold leading-tight text-zinc-50">
              Tier every vendor engagement by the risk it actually carries.
            </h2>
            <p className="text-sm leading-relaxed text-zinc-400">
              A short scored questionnaire sets the tier. The right due diligence follows. No
              spreadsheets to chase.
            </p>
          </div>
          <ul className="flex flex-col gap-4">
            {highlights.map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-zinc-100">{item.title}</p>
                  <p className="text-sm text-zinc-400">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-end justify-between gap-6 text-xs text-zinc-500">
          <p>
            Scores are snapshotted at submission, so editing a questionnaire never rewrites past
            decisions.
          </p>
          <span className="shrink-0 rounded-full border border-zinc-800 px-2 py-0.5">v{APP_VERSION}</span>
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <div className="lg:hidden">
            <LogoMark />
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold text-zinc-50">{title}</h1>
            <p className="text-sm text-zinc-400">{subtitle}</p>
          </div>
          {children}
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
