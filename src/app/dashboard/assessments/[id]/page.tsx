import Link from "next/link";
import { notFound } from "next/navigation";
import { getMembership } from "@/lib/membership";
import { categoryLabels, formatDate, formatScore, statusLabels, typeLabels } from "@/lib/labels";
import { ActionForm } from "@/components/action-form";
import { QuestionnaireForm } from "@/components/questionnaire-form";
import { TierBadge } from "@/components/tier-badge";
import {
  createFollowup,
  deleteAssessment,
  issueInvite,
  reviewAssessment,
  saveInternalAnswer,
  submitInternal,
} from "../actions";
import { InvitePanel } from "./invite-panel";

const inputClass = "rounded border border-gray-300 px-3 py-2 font-normal";

export default async function AssessmentPage({ params }: PageProps<"/dashboard/assessments/[id]">) {
  const { id } = await params;
  const { supabase, user, isAdmin, isStaff } = await getMembership();

  const { data: assessment } = await supabase
    .from("assessments")
    .select(
      "id, type, status, template_id, engagement_id, parent_assessment_id, expires_at, filled_by_type, submitted_at, created_at, vendor_engagements(name, vendor_id, vendors(name)), questionnaire_templates(name)"
    )
    .eq("id", id)
    .maybeSingle();
  if (!assessment) notFound();

  const [{ data: questions }, { data: answers }, { data: score }, { data: tiers }] = await Promise.all([
    supabase
      .from("questionnaire_questions")
      .select("id, category, prompt, weight, question_options(id, label, points, position)")
      .eq("template_id", assessment.template_id)
      .order("position")
      .order("created_at"),
    supabase
      .from("assessment_answers")
      .select("question_id, option_id, points_snapshot, weight_snapshot")
      .eq("assessment_id", id),
    supabase
      .from("assessment_scores")
      .select("score, raw_score, max_possible, computed_tier_id, final_tier_id, overridden_by, override_reason, reviewed_by, reviewed_at")
      .eq("assessment_id", id)
      .maybeSingle(),
    supabase.from("risk_tiers").select("id, name, rank, min_score").order("rank"),
  ]);

  const isOpen = ["draft", "sent", "in_progress"].includes(assessment.status);
  const isTiering = assessment.type === "tiering";
  const engagement = assessment.vendor_engagements;
  const tierById = new Map((tiers ?? []).map((tier) => [tier.id, tier]));
  const answerByQuestion = new Map((answers ?? []).map((answer) => [answer.question_id, answer]));
  const sortedQuestions = (questions ?? []).map((question) => ({
    ...question,
    options: [...question.question_options].sort((a, b) => a.position - b.position),
  }));
  const linkExpired = assessment.expires_at !== null && new Date(assessment.expires_at) < new Date();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/dashboard/engagements/${assessment.engagement_id}`}
            className="text-xs uppercase text-gray-500 hover:underline"
          >
            {engagement?.vendors?.name} · {engagement?.name}
          </Link>
          <h1 className="text-xl font-semibold">{assessment.questionnaire_templates?.name}</h1>
          <p className="text-sm text-gray-600">
            {typeLabels[assessment.type]} questionnaire · created {formatDate(assessment.created_at)}
            {assessment.parent_assessment_id && (
              <>
                {" · "}
                <Link href={`/dashboard/assessments/${assessment.parent_assessment_id}`} className="underline">
                  tiering assessment
                </Link>
              </>
            )}
          </p>
        </div>
        <span className="whitespace-nowrap rounded bg-gray-100 px-2 py-1 text-xs font-medium">
          {statusLabels[assessment.status]}
        </span>
      </div>

      {isOpen && isStaff && (
        <section className="flex flex-col gap-3 rounded border border-gray-200 p-4">
          <h2 className="font-semibold">Send to vendor</h2>
          <p className="text-sm text-gray-600">
            {assessment.expires_at
              ? linkExpired
                ? `The vendor link expired ${formatDate(assessment.expires_at)}.`
                : `A vendor link is active until ${formatDate(assessment.expires_at)}.`
              : "The vendor answers through a private link. No account needed."}
          </p>
          <InvitePanel
            action={issueInvite.bind(null, assessment.id)}
            hasActiveLink={assessment.expires_at !== null && !linkExpired}
          />
        </section>
      )}

      {isOpen && isStaff ? (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-semibold">Fill in on the vendor&apos;s behalf</h2>
            <p className="text-sm text-gray-600">
              Answers here and through the vendor link are the same record, so either side can pick
              up where the other left off.
            </p>
          </div>
          <QuestionnaireForm
            questions={sortedQuestions.map(({ id, category, prompt, options }) => ({
              id,
              category,
              prompt,
              options: options.map(({ id, label }) => ({ id, label })),
            }))}
            initialAnswers={Object.fromEntries((answers ?? []).map((answer) => [answer.question_id, answer.option_id]))}
            saveAnswer={saveInternalAnswer.bind(null, assessment.id)}
            submit={submitInternal.bind(null, assessment.id)}
          />
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Answers</h2>
          {assessment.submitted_at && (
            <p className="text-sm text-gray-600">
              Submitted {formatDate(assessment.submitted_at)} by{" "}
              {assessment.filled_by_type === "vendor" ? "the vendor" : "an internal user"}.
            </p>
          )}
          <ol className="flex flex-col gap-3">
            {sortedQuestions.map((question, index) => {
              const answer = answerByQuestion.get(question.id);
              const option = question.options.find((candidate) => candidate.id === answer?.option_id);
              return (
                <li key={question.id} className="rounded border border-gray-200 px-4 py-3 text-sm">
                  <p className="text-xs uppercase text-gray-500">
                    {index + 1}. {categoryLabels[question.category]}
                  </p>
                  <p className="font-medium">{question.prompt}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span>{option?.label ?? <span className="text-gray-400">Not answered</span>}</span>
                    {isTiering && answer?.points_snapshot !== null && answer?.points_snapshot !== undefined && (
                      <span className="text-xs text-gray-500">
                        {answer.points_snapshot} pts × weight {answer.weight_snapshot}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {isTiering && score && (
        <section className="flex flex-col gap-4 rounded border border-gray-200 p-4">
          <h2 className="font-semibold">Tier</h2>
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div>
              <p className="text-xs text-gray-500">Score</p>
              <p className="text-lg font-semibold">{formatScore(score.score)}</p>
              <p className="text-xs text-gray-500">
                {score.raw_score} of {score.max_possible} weighted points
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Computed tier</p>
              <TierBadge tier={tierById.get(score.computed_tier_id)} />
            </div>
            {score.final_tier_id && (
              <div>
                <p className="text-xs text-gray-500">Final tier</p>
                <TierBadge tier={tierById.get(score.final_tier_id)} />
              </div>
            )}
          </div>

          {score.reviewed_at && (
            <p className="text-sm text-gray-600">
              {score.overridden_by ? "Overridden" : "Confirmed"} by{" "}
              {score.reviewed_by === user.id ? "you" : "a reviewer"} on {formatDate(score.reviewed_at)}.
              {score.override_reason && (
                <>
                  <br />
                  Reason: {score.override_reason}
                </>
              )}
            </p>
          )}

          {assessment.status === "submitted" && isStaff && (
            <ActionForm action={reviewAssessment.bind(null, assessment.id)} submitLabel="Record decision">
              <label className="flex flex-col gap-1 text-sm font-medium">
                Final tier
                <select name="final_tier_id" defaultValue={score.computed_tier_id} className={inputClass}>
                  {(tiers ?? []).map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.name}
                      {tier.id === score.computed_tier_id ? " (computed)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Override reason
                <textarea
                  name="reason"
                  rows={3}
                  placeholder="Required if you choose a tier other than the computed one"
                  className={inputClass}
                />
              </label>
            </ActionForm>
          )}
        </section>
      )}

      {isTiering && assessment.status === "reviewed" && (
        <FollowupSection tieringAssessmentId={assessment.id} finalTierId={score?.final_tier_id ?? null} isAdmin={isAdmin} />
      )}

      {isOpen && isAdmin && (
        <section className="border-t border-gray-200 pt-4">
          <ActionForm
            action={deleteAssessment.bind(null, assessment.id, assessment.engagement_id)}
            submitLabel="Delete assessment"
            pendingLabel="Deleting…"
            variant="danger"
            confirm="Delete this assessment and its saved answers?"
          />
        </section>
      )}
    </div>
  );
}

async function FollowupSection({
  tieringAssessmentId,
  finalTierId,
  isAdmin,
}: {
  tieringAssessmentId: string;
  finalTierId: string | null;
  isAdmin: boolean;
}) {
  const { supabase } = await getMembership();

  const [{ data: followups }, { data: templates }, { data: mapping }] = await Promise.all([
    supabase
      .from("assessments")
      .select("id, status, template_id, created_at")
      .eq("parent_assessment_id", tieringAssessmentId)
      .order("created_at"),
    supabase.from("questionnaire_templates").select("id, name").eq("type", "followup").order("name"),
    supabase.from("template_tier_mappings").select("template_id").eq("tier_id", finalTierId ?? "").maybeSingle(),
  ]);

  const templateName = new Map((templates ?? []).map((template) => [template.id, template.name]));

  return (
    <section className="flex flex-col gap-3 rounded border border-gray-200 p-4">
      <h2 className="font-semibold">Stage 2: follow-up questionnaire</h2>
      {(followups ?? []).length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm">
          {(followups ?? []).map((followup) => (
            <li key={followup.id} className="flex justify-between">
              <Link href={`/dashboard/assessments/${followup.id}`} className="underline">
                {templateName.get(followup.template_id)}
              </Link>
              <span className="text-xs text-gray-500">{statusLabels[followup.status]}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-600">No follow-up sent yet.</p>
      )}

      {isAdmin && (templates ?? []).length > 0 && (
        <ActionForm
          action={createFollowup.bind(null, tieringAssessmentId)}
          submitLabel="Create follow-up"
          pendingLabel="Creating…"
          className="flex flex-wrap items-end gap-3"
        >
          <label className="flex flex-col gap-1 text-sm">
            Template
            <select
              name="template_id"
              defaultValue={mapping?.template_id ?? ""}
              className="rounded border border-gray-300 px-2 py-2"
            >
              {!mapping && <option value="">Choose a template…</option>}
              {(templates ?? []).map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                  {template.id === mapping?.template_id ? " (mapped to this tier)" : ""}
                </option>
              ))}
            </select>
          </label>
        </ActionForm>
      )}
      {isAdmin && (templates ?? []).length === 0 && (
        <p className="text-sm text-gray-600">
          No follow-up templates yet. Create one under <Link href="/dashboard/settings" className="underline">Settings</Link>.
        </p>
      )}
    </section>
  );
}
