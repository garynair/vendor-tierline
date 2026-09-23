import Link from "next/link";
import { notFound } from "next/navigation";
import { getMembership } from "@/lib/membership";
import { formatDate, statusLabels, typeLabels } from "@/lib/labels";
import { ActionForm } from "@/components/action-form";
import { TierBadge } from "@/components/tier-badge";
import { startTieringAssessment } from "../../assessments/actions";

export default async function EngagementPage({ params }: PageProps<"/dashboard/engagements/[id]">) {
  const { id } = await params;
  const { supabase, isStaff } = await getMembership();

  const { data: engagement } = await supabase
    .from("vendor_engagements")
    .select("id, name, description, is_active, vendor_id, vendors(name)")
    .eq("id", id)
    .maybeSingle();
  if (!engagement) notFound();

  const [{ data: assessments }, { data: scores }, { data: tiers }, { data: templates }] = await Promise.all([
    supabase
      .from("assessments")
      .select("id, type, status, template_id, parent_assessment_id, created_at, submitted_at")
      .eq("engagement_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("assessment_scores").select("assessment_id, computed_tier_id, final_tier_id"),
    supabase.from("risk_tiers").select("id, name, rank"),
    supabase.from("questionnaire_templates").select("id, name"),
  ]);

  const tierById = new Map((tiers ?? []).map((tier) => [tier.id, tier]));
  const scoreByAssessment = new Map((scores ?? []).map((score) => [score.assessment_id, score]));
  const templateName = new Map((templates ?? []).map((template) => [template.id, template.name]));
  const tiering = (assessments ?? []).filter((assessment) => assessment.type === "tiering");
  const followupsByParent = Map.groupBy(
    (assessments ?? []).filter((assessment) => assessment.type === "followup"),
    (assessment) => assessment.parent_assessment_id
  );
  const hasOpenTiering = tiering.some((assessment) =>
    ["draft", "sent", "in_progress", "submitted"].includes(assessment.status)
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href={`/dashboard/vendors/${engagement.vendor_id}`} className="text-xs uppercase text-gray-500 hover:underline">
          {engagement.vendors?.name}
        </Link>
        <h1 className="text-xl font-semibold">
          {engagement.name}
          {!engagement.is_active && <span className="text-gray-400"> (inactive)</span>}
        </h1>
        {engagement.description && <p className="text-sm text-gray-600">{engagement.description}</p>}
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Assessments</h2>
          {isStaff && !hasOpenTiering && (
            <ActionForm
              action={startTieringAssessment.bind(null, engagement.id)}
              submitLabel={tiering.length > 0 ? "Re-tier engagement" : "Start tiering"}
              pendingLabel="Creating…"
              className="flex flex-col items-end gap-1"
            />
          )}
        </div>

        {tiering.length === 0 && (
          <p className="text-sm text-gray-500">This engagement hasn&apos;t been tiered yet.</p>
        )}

        <ul className="flex flex-col gap-3">
          {tiering.map((assessment) => {
            const score = scoreByAssessment.get(assessment.id);
            const tier = score?.final_tier_id ? tierById.get(score.final_tier_id) : undefined;
            return (
              <li key={assessment.id} className="rounded border border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between">
                  <Link href={`/dashboard/assessments/${assessment.id}`} className="font-medium hover:underline">
                    {typeLabels.tiering} · {formatDate(assessment.created_at)}
                  </Link>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{statusLabels[assessment.status]}</span>
                    {assessment.status === "reviewed" && <TierBadge tier={tier} />}
                  </div>
                </div>
                {(followupsByParent.get(assessment.id) ?? []).map((followup) => (
                  <div key={followup.id} className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2 text-sm">
                    <Link href={`/dashboard/assessments/${followup.id}`} className="hover:underline">
                      ↳ {typeLabels.followup}: {templateName.get(followup.template_id)}
                    </Link>
                    <span className="text-xs text-gray-500">{statusLabels[followup.status]}</span>
                  </div>
                ))}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
