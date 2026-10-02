import Link from "next/link";
import { getMembership } from "@/lib/membership";
import { engagementTierStatus } from "@/lib/engagement-tiers";
import { formatDate, tierBadgeClass } from "@/lib/labels";
import { roleDescriptions, roleLabels } from "@/lib/invites";
import { GettingStarted } from "@/components/getting-started";
import { ReadOnlyAction } from "@/components/read-only-action";
import { LoadSampleData } from "./sample-data";

const DAY_MS = 24 * 60 * 60 * 1000;

function daysSince(value: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / DAY_MS));
}

export default async function HomePage() {
  const { supabase, isStaff, isAdmin, role } = await getMembership();

  const [
    { data: vendors },
    { data: engagements },
    { data: assessments },
    { data: scores },
    { data: tiers },
    { count: tieringTemplateCount },
  ] = await Promise.all([
    supabase.from("vendors").select("id, name"),
    supabase.from("vendor_engagements").select("id, vendor_id, name, is_active"),
    supabase.from("assessments").select("id, engagement_id, type, status, created_at, submitted_at"),
    supabase.from("assessment_scores").select("assessment_id, final_tier_id"),
    supabase.from("risk_tiers").select("id, name, rank").order("rank"),
    supabase.from("questionnaire_templates").select("id", { count: "exact", head: true }).eq("type", "tiering"),
  ]);

  const allAssessments = assessments ?? [];
  const tiering = allAssessments.filter((assessment) => assessment.type === "tiering");
  const followups = allAssessments.filter((assessment) => assessment.type === "followup");
  const activeEngagements = (engagements ?? []).filter((engagement) => engagement.is_active);
  const statusByEngagement = engagementTierStatus(tiering, scores ?? [], tiers ?? []);

  const vendorName = new Map((vendors ?? []).map((vendor) => [vendor.id, vendor.name]));
  const engagementById = new Map((engagements ?? []).map((engagement) => [engagement.id, engagement]));
  const label = (engagementId: string) => {
    const engagement = engagementById.get(engagementId);
    return engagement ? `${vendorName.get(engagement.vendor_id) ?? ""} · ${engagement.name}` : "";
  };

  // Snapshot numbers
  const tierCounts = (tiers ?? []).map((tier) => ({
    tier,
    count: activeEngagements.filter((engagement) => statusByEngagement.get(engagement.id)?.tier?.id === tier.id)
      .length,
  }));
  const awaitingReview = tiering
    .filter((assessment) => assessment.status === "submitted")
    .sort((a, b) => (a.submitted_at ?? "").localeCompare(b.submitted_at ?? ""));
  const openFollowups = followups
    .filter((assessment) => ["draft", "sent", "in_progress"].includes(assessment.status))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const neverAssessed = activeEngagements.filter((engagement) => !statusByEngagement.get(engagement.id)?.latest);

  // Getting-started checklist (same data as before, now on Home)
  const oldestFirst = [...tiering].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const firstSubmitted = oldestFirst.find((assessment) => ["submitted", "reviewed"].includes(assessment.status));
  const progress = {
    hasTieringTemplate: (tieringTemplateCount ?? 0) > 0,
    hasVendor: (vendors ?? []).length > 0,
    hasTieringAssessment: oldestFirst.length > 0,
    hasSubmitted: Boolean(firstSubmitted),
    hasReviewed: oldestFirst.some((assessment) => assessment.status === "reviewed"),
    hasFollowup: followups.length > 0,
    firstEngagementHref: engagements?.[0] ? `/dashboard/engagements/${engagements[0].id}` : null,
    firstAssessmentHref: oldestFirst[0] ? `/dashboard/assessments/${oldestFirst[0].id}` : null,
    firstReviewableHref: firstSubmitted ? `/dashboard/assessments/${firstSubmitted.id}` : null,
  };

  const quickActions = [
    { label: "Add vendor", href: "/dashboard/vendors/new", allowed: isStaff },
    {
      label: "Review next",
      href: awaitingReview[0] ? `/dashboard/assessments/${awaitingReview[0].id}` : null,
      allowed: isStaff,
    },
    { label: "Open Insights", href: "/dashboard/insights", allowed: true },
    { label: isAdmin ? "Manage users" : "View users", href: "/dashboard/settings/users", allowed: true },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Home</h1>
          <p className="text-sm text-gray-600">Your third-party risk program at a glance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) =>
            !action.allowed ? (
              <ReadOnlyAction
                key={action.label}
                label={action.label}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm"
              />
            ) : action.href ? (
              <Link
                key={action.label}
                href={action.href}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                {action.label}
              </Link>
            ) : null
          )}
        </div>
      </div>

      {isAdmin && (vendors ?? []).length === 0 && (
        <section className="flex flex-col gap-3 rounded border border-dashed border-gray-300 p-4">
          <div>
            <h2 className="text-sm font-semibold">Want to explore first?</h2>
            <p className="text-sm text-gray-600">
              Load 27 fictional sample vendors with assessments, reviewer overrides, and follow-ups.
              They sit alongside anything you add yourself.
            </p>
          </div>
          <LoadSampleData />
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Vendors" value={(vendors ?? []).length} href="/dashboard/vendors" />
        <Stat label="Active engagements" value={activeEngagements.length} href="/dashboard/vendors" />
        <Stat label="Awaiting review" value={awaitingReview.length} tone={awaitingReview.length ? "amber" : undefined} />
        <Stat label="Open follow-ups" value={openFollowups.length} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Tier mix (active engagements)</h2>
        <div className="flex flex-wrap gap-2">
          {tierCounts.map(({ tier, count }) => (
            <span key={tier.id} className={`rounded px-3 py-1.5 text-sm font-medium ${tierBadgeClass(tier.rank)}`}>
              {tier.name}: {count}
            </span>
          ))}
          <span className={`rounded px-3 py-1.5 text-sm font-medium ${tierBadgeClass(undefined)}`}>
            Not yet tiered: {activeEngagements.length - tierCounts.reduce((sum, item) => sum + item.count, 0)}
          </span>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <AttentionList
          title="Awaiting review"
          empty="Nothing waiting."
          items={awaitingReview.slice(0, 5).map((assessment) => ({
            key: assessment.id,
            href: `/dashboard/assessments/${assessment.id}`,
            label: label(assessment.engagement_id),
            meta: `submitted ${formatDate(assessment.submitted_at)}`,
          }))}
        />
        <AttentionList
          title="Oldest open follow-ups"
          empty="No open follow-ups."
          items={openFollowups.slice(0, 5).map((assessment) => ({
            key: assessment.id,
            href: `/dashboard/assessments/${assessment.id}`,
            label: label(assessment.engagement_id),
            meta: `${daysSince(assessment.created_at)} days open`,
          }))}
        />
        <AttentionList
          title="Never assessed"
          empty="Every active engagement has a tiering assessment."
          items={neverAssessed.slice(0, 5).map((engagement) => ({
            key: engagement.id,
            href: `/dashboard/engagements/${engagement.id}`,
            label: `${vendorName.get(engagement.vendor_id) ?? ""} · ${engagement.name}`,
            meta: "no tiering yet",
          }))}
        />
      </section>

      <section className="rounded border border-gray-200 px-4 py-3 text-sm">
        <span className="font-medium">Your role: {roleLabels[role]}.</span>{" "}
        <span className="text-gray-600">{roleDescriptions[role]}</span>{" "}
        <Link href="/dashboard/settings/users" className="underline">
          See all roles
        </Link>
      </section>

      {isStaff && <GettingStarted progress={progress} isAdmin={isAdmin} />}
    </div>
  );
}

function Stat({ label, value, href, tone }: { label: string; value: number; href?: string; tone?: "amber" }) {
  const body = (
    <>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </>
  );
  const className = `rounded border px-4 py-3 ${
    tone === "amber" ? "border-amber-200 bg-amber-50" : "border-gray-200"
  }`;
  return href ? (
    <Link href={href} className={`${className} hover:bg-gray-50`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function AttentionList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: { key: string; href: string; label: string; meta: string }[];
}) {
  return (
    <div className="flex flex-col gap-2 rounded border border-gray-200 p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.key} className="text-sm">
              <Link href={item.href} className="hover:underline">
                {item.label}
              </Link>
              <p className="text-xs text-gray-500">{item.meta}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
