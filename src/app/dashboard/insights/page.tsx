// src/app/dashboard/insights/page.tsx
// Vendor Tierline insights. Reads the dash_* views (RLS applies via security_invoker).
// Uses the same getMembership() helper as src/app/dashboard/page.tsx.
import type { SupabaseClient } from "@supabase/supabase-js";
import { getMembership } from "@/lib/membership";

type RegisterRow = {
  score: number | null;
  was_overridden: boolean | null;
  tiering_status: string | null;
};
type TierRow = { final_tier: string; assessments: number };
type PipelineRow = { questionnaire_type: string; status: string; stage_order: number; assessments: number };
type OverrideRow = {
  vendor_name: string;
  computed_tier: string;
  final_tier: string;
  direction: "raised" | "lowered";
  override_reason: string | null;
  reviewed_at: string | null;
};
type FollowupRow = {
  vendor_name: string;
  tier: string | null;
  status: string;
  sent_at: string;
  days_open: number | null;
  is_overdue: boolean;
};
type MonthlyRow = {
  month: string;
  new_engagements: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  not_yet_scored: number;
};

export const dynamic = "force-dynamic";

const TIER_COLORS: Record<string, string> = {
  Critical: "bg-red-500",
  High: "bg-orange-400",
  Medium: "bg-yellow-400",
  Low: "bg-emerald-500",
  "Awaiting review": "bg-slate-400",
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 p-5">
      <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-32 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-3 rounded bg-slate-100 dark:bg-slate-800">
        <div className={`h-3 rounded ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right tabular-nums">{value}</span>
    </div>
  );
}

export default async function InsightsPage() {
  const { supabase } = await getMembership();

  // The dash_* views are newer than database.types.ts, so query them through an
  // untyped client and cast each result to the row types defined above.
  const db = supabase as unknown as SupabaseClient;

  const [register, tiers, pipeline, overrides, aging, monthly] = await Promise.all([
    db.from("dash_vendor_register").select("*").returns<RegisterRow[]>(),
    db.from("dash_tier_distribution").select("*").returns<TierRow[]>(),
    db.from("dash_pipeline").select("*").order("stage_order").returns<PipelineRow[]>(),
    db.from("dash_override_log").select("*").order("reviewed_at", { ascending: false }).returns<OverrideRow[]>(),
    db.from("dash_followup_aging").select("*").not("days_open", "is", null).order("days_open", { ascending: false }).returns<FollowupRow[]>(),
    db.from("dash_monthly_intake").select("*").order("month").returns<MonthlyRow[]>(),
  ]);

  const reg = register.data ?? [];
  const totalEngagements = reg.length;
  const scored = reg.filter((r) => r.score !== null).length;
  const overridden = reg.filter((r) => r.was_overridden).length;
  const awaitingReview = reg.filter((r) => r.tiering_status === "submitted").length;

  // Final tier counts
  const finalCounts: Record<string, number> = {};
  for (const t of tiers.data ?? []) finalCounts[t.final_tier] = (finalCounts[t.final_tier] ?? 0) + t.assessments;
  const tierOrder = ["Critical", "High", "Medium", "Low", "Awaiting review"];
  const maxTier = Math.max(0, ...Object.values(finalCounts));

  const tiering = (pipeline.data ?? []).filter((p) => p.questionnaire_type === "tiering");
  const maxPipe = Math.max(0, ...tiering.map((p) => p.assessments));

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Third-party risk dashboard</h1>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ["Engagements", totalEngagements],
          ["Scored", scored],
          ["Awaiting review", awaitingReview],
          ["Reviewer overrides", overridden],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-xs text-slate-500">{label}</div>
            <div className="text-3xl font-semibold tabular-nums">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Final risk tier">
          <div className="space-y-2">
            {tierOrder.filter((t) => finalCounts[t]).map((t) => (
              <Bar key={t} label={t} value={finalCounts[t]} max={maxTier} color={TIER_COLORS[t]} />
            ))}
          </div>
        </Card>

        <Card title="Tiering pipeline">
          <div className="space-y-2">
            {tiering.map((p) => (
              <Bar key={p.status} label={p.status.replace("_", " ")} value={p.assessments} max={maxPipe} color="bg-sky-500" />
            ))}
          </div>
        </Card>
      </div>

      <Card title="Monthly intake by tier">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr><th>Month</th><th>New</th><th>Critical</th><th>High</th><th>Medium</th><th>Low</th><th>Not scored</th></tr>
          </thead>
          <tbody>
            {(monthly.data ?? []).map((m) => (
              <tr key={m.month} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-1.5">{new Date(m.month).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</td>
                <td>{m.new_engagements}</td><td>{m.critical}</td><td>{m.high}</td><td>{m.medium}</td><td>{m.low}</td><td>{m.not_yet_scored}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Reviewer overrides (audit trail)">
          <ul className="space-y-3 text-sm">
            {(overrides.data ?? []).map((o) => (
              <li key={`${o.vendor_name}-${o.reviewed_at}`}>
                <div className="font-medium">
                  {o.vendor_name}: {o.computed_tier} → {o.final_tier}{" "}
                  <span className={o.direction === "raised" ? "text-red-600" : "text-emerald-600"}>({o.direction})</span>
                </div>
                <div className="text-slate-500">{o.override_reason}</div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Open follow-ups (oldest first)">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500"><tr><th>Vendor</th><th>Tier</th><th>Status</th><th>Days open</th></tr></thead>
            <tbody>
              {(aging.data ?? []).map((f) => (
                <tr key={`${f.vendor_name}-${f.sent_at}`} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1.5">{f.vendor_name}</td>
                  <td>{f.tier}</td>
                  <td>{f.status.replace("_", " ")}</td>
                  <td className={f.is_overdue ? "text-red-600 font-medium" : ""}>{f.days_open}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </main>
  );
}
