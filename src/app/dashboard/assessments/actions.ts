"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMembership } from "@/lib/membership";
import { friendlyError } from "@/lib/errors";
import type { ActionState } from "@/components/action-form";

// Authorization lives in the database: RLS for the direct table writes, and
// role checks inside the RPCs. These actions only translate results for the UI.

export async function startTieringAssessment(engagementId: string): Promise<ActionState> {
  const { supabase, orgId } = await getMembership();

  const { data: template } = await supabase
    .from("questionnaire_templates")
    .select("id")
    .eq("type", "tiering")
    .maybeSingle();
  if (!template) {
    return { error: "No tiering questionnaire yet. An admin can set one up under Settings." };
  }

  const { data: assessment, error } = await supabase
    .from("assessments")
    .insert({ organization_id: orgId, engagement_id: engagementId, template_id: template.id, type: "tiering" })
    .select("id")
    .single();
  if (error) return { error: friendlyError(error) };

  redirect(`/dashboard/assessments/${assessment.id}`);
}

export type InviteState = { error?: string; url?: string; expiresInDays?: number } | undefined;

export async function issueInvite(
  assessmentId: string,
  _prevState: InviteState,
  formData: FormData
): Promise<InviteState> {
  const { supabase } = await getMembership();

  const days = Number(formData.get("days") ?? 14);
  if (!Number.isInteger(days) || days < 1 || days > 90) {
    return { error: "Choose a validity between 1 and 90 days." };
  }

  const { data: token, error } = await supabase.rpc("issue_assessment_invite", {
    p_assessment_id: assessmentId,
    p_valid_for: `${days} days`,
  });
  if (error) return { error: friendlyError(error) };

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "https";

  revalidatePath(`/dashboard/assessments/${assessmentId}`);
  return { url: `${protocol}://${host}/assess/${token}`, expiresInDays: days };
}

export async function saveInternalAnswer(assessmentId: string, questionId: string, optionId: string) {
  const { supabase } = await getMembership();

  // Update first: authenticated users may only change option_id on an
  // existing answer, so an upsert (which rewrites every column) isn't allowed.
  const { data: updated, error: updateError } = await supabase
    .from("assessment_answers")
    .update({ option_id: optionId })
    .eq("assessment_id", assessmentId)
    .eq("question_id", questionId)
    .select("question_id");
  if (updateError) return { error: friendlyError(updateError, "Couldn't save that answer.") };
  if (updated.length > 0) return;

  const { error } = await supabase
    .from("assessment_answers")
    .insert({ assessment_id: assessmentId, question_id: questionId, option_id: optionId });
  if (error) return { error: friendlyError(error, "Couldn't save that answer.") };
}

export async function submitInternal(assessmentId: string) {
  const { supabase } = await getMembership();

  const { error } = await supabase.rpc("submit_assessment_internal", { p_assessment_id: assessmentId });
  if (error) return { error: friendlyError(error) };

  revalidatePath("/dashboard", "layout");
}

export async function reviewAssessment(
  assessmentId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase } = await getMembership();

  const reason = String(formData.get("reason") ?? "").trim();
  const { error } = await supabase.rpc("review_assessment", {
    p_assessment_id: assessmentId,
    p_final_tier_id: String(formData.get("final_tier_id")),
    p_override_reason: reason || undefined,
  });
  if (error) return { error: friendlyError(error) };

  revalidatePath("/dashboard", "layout");
}

export async function createFollowup(
  tieringAssessmentId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase } = await getMembership();

  const templateId = String(formData.get("template_id") ?? "");
  const { data: followupId, error } = await supabase.rpc("create_followup_assessment", {
    p_tiering_assessment_id: tieringAssessmentId,
    p_template_id: templateId || undefined,
  });
  if (error) return { error: friendlyError(error) };

  redirect(`/dashboard/assessments/${followupId}`);
}

export async function deleteAssessment(
  assessmentId: string,
  engagementId: string
): Promise<ActionState> {
  const { supabase } = await getMembership();

  const { data, error } = await supabase.from("assessments").delete().eq("id", assessmentId).select("id");
  if (error) return { error: friendlyError(error) };
  if (data.length === 0) return { error: "Only admins can delete an assessment, and only before it's submitted." };

  redirect(`/dashboard/engagements/${engagementId}`);
}
