"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMembership } from "@/lib/membership";
import { friendlyError } from "@/lib/errors";
import { seedDefaultTemplates } from "@/lib/default-templates";
import { categoryLabels } from "@/lib/labels";
import type { Enums } from "@/lib/supabase/database.types";
import type { ActionState } from "@/components/action-form";

// Admin-only configuration. RLS rejects non-admin writes; an update or delete
// that RLS filters out affects zero rows, which is reported as a permission error.

const noPermission = { error: "Only admins can change settings." };

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function number(formData: FormData, name: string) {
  const value = Number(text(formData, name));
  return Number.isFinite(value) ? value : NaN;
}

function category(formData: FormData): Enums<"question_category"> | null {
  const value = text(formData, "category");
  return Object.hasOwn(categoryLabels, value) ? (value as Enums<"question_category">) : null;
}

function done(templateId?: string): ActionState {
  revalidatePath("/dashboard/settings", "layout");
  if (templateId) revalidatePath(`/dashboard/settings/templates/${templateId}`);
  return { message: "Saved." };
}

export async function loadDefaultTemplates(): Promise<ActionState> {
  const { supabase, orgId, isAdmin } = await getMembership();
  if (!isAdmin) return noPermission;

  try {
    await seedDefaultTemplates(supabase, orgId);
  } catch {
    return { error: "Couldn't load the defaults. If a tiering questionnaire already exists, edit it instead." };
  }
  return done();
}

export async function updateTier(tierId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await getMembership();

  const name = text(formData, "name");
  const minScore = number(formData, "min_score_percent") / 100;
  if (!name || !(minScore >= 0 && minScore <= 1)) {
    return { error: "Enter a name and a threshold between 0 and 100." };
  }

  const { data, error } = await supabase
    .from("risk_tiers")
    .update({ name, min_score: minScore })
    .eq("id", tierId)
    .select("id");
  if (error) return { error: friendlyError(error) };
  if (data.length === 0) return noPermission;
  return done();
}

export async function setTierMapping(tierId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, orgId, isAdmin } = await getMembership();
  if (!isAdmin) return noPermission;

  const templateId = text(formData, "template_id");
  const { error } = templateId
    ? await supabase
        .from("template_tier_mappings")
        .upsert({ tier_id: tierId, organization_id: orgId, template_id: templateId }, { onConflict: "tier_id" })
    : await supabase.from("template_tier_mappings").delete().eq("tier_id", tierId);
  if (error) return { error: friendlyError(error) };
  return done();
}

export async function createTemplate(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, orgId } = await getMembership();

  const name = text(formData, "name");
  const type = text(formData, "type") === "tiering" ? "tiering" : "followup";
  if (!name) return { error: "Template name is required." };

  const { data, error } = await supabase
    .from("questionnaire_templates")
    .insert({ organization_id: orgId, type, name, description: text(formData, "description") || null })
    .select("id")
    .single();
  if (error) {
    return {
      error: error.code === "23505" ? "There's already a tiering questionnaire; edit that one instead." : friendlyError(error),
    };
  }
  redirect(`/dashboard/settings/templates/${data.id}`);
}

export async function updateTemplate(templateId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await getMembership();

  const name = text(formData, "name");
  if (!name) return { error: "Template name is required." };

  const { data, error } = await supabase
    .from("questionnaire_templates")
    .update({ name, description: text(formData, "description") || null })
    .eq("id", templateId)
    .select("id");
  if (error) return { error: friendlyError(error) };
  if (data.length === 0) return noPermission;
  return done(templateId);
}

export async function deleteTemplate(templateId: string): Promise<ActionState> {
  const { supabase } = await getMembership();

  const { data, error } = await supabase.from("questionnaire_templates").delete().eq("id", templateId).select("id");
  if (error) return { error: friendlyError(error) };
  if (data.length === 0) return noPermission;
  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings");
}

// Options are entered one per line as "label | points".
function parseOptions(raw: string, scored: boolean) {
  const lines = raw.split("\n").map((line) => line.trim()).filter(Boolean);
  const options = lines.map((line) => {
    const [label, points] = line.split("|").map((part) => part.trim());
    return { label, points: scored ? Number(points ?? 0) : 0 };
  });
  const valid = options.every((option) => option.label && Number.isFinite(option.points) && option.points >= 0);
  return valid && options.length >= 2 ? options : null;
}

export async function addQuestion(
  templateId: string,
  scored: boolean,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, orgId } = await getMembership();

  const prompt = text(formData, "prompt");
  const questionCategory = category(formData);
  const weight = scored ? number(formData, "weight") : 1;
  const options = parseOptions(text(formData, "options"), scored);
  if (!prompt || !questionCategory) return { error: "Enter a question and pick a category." };
  if (!(weight > 0)) return { error: "Weight must be greater than 0." };
  if (!options) {
    return {
      error: scored
        ? "Add at least two options, one per line, as “label | points” with points of 0 or more."
        : "Add at least two options, one per line.",
    };
  }

  const { count } = await supabase
    .from("questionnaire_questions")
    .select("id", { count: "exact", head: true })
    .eq("template_id", templateId);

  const { data: question, error } = await supabase
    .from("questionnaire_questions")
    .insert({
      organization_id: orgId,
      template_id: templateId,
      category: questionCategory,
      prompt,
      weight,
      position: (count ?? 0) + 1,
    })
    .select("id")
    .single();
  if (error) return { error: friendlyError(error) };

  const { error: optionError } = await supabase.from("question_options").insert(
    options.map((option, index) => ({
      organization_id: orgId,
      question_id: question.id,
      label: option.label,
      points: option.points,
      position: index + 1,
    }))
  );
  if (optionError) {
    await supabase.from("questionnaire_questions").delete().eq("id", question.id);
    return { error: friendlyError(optionError) };
  }
  return done(templateId);
}

export async function updateQuestion(
  templateId: string,
  questionId: string,
  scored: boolean,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase } = await getMembership();

  const prompt = text(formData, "prompt");
  const questionCategory = category(formData);
  const position = number(formData, "position");
  if (!prompt || !questionCategory || !Number.isInteger(position)) {
    return { error: "Enter a question, a category and a whole-number position." };
  }
  const weight = scored ? number(formData, "weight") : undefined;
  if (weight !== undefined && !(weight > 0)) return { error: "Weight must be greater than 0." };

  const { data, error } = await supabase
    .from("questionnaire_questions")
    .update({ prompt, category: questionCategory, position, ...(weight !== undefined && { weight }) })
    .eq("id", questionId)
    .select("id");
  if (error) return { error: friendlyError(error) };
  if (data.length === 0) return noPermission;
  return done(templateId);
}

export async function deleteQuestion(templateId: string, questionId: string): Promise<ActionState> {
  const { supabase } = await getMembership();

  const { data, error } = await supabase.from("questionnaire_questions").delete().eq("id", questionId).select("id");
  if (error) return { error: friendlyError(error) };
  if (data.length === 0) return noPermission;
  return done(templateId);
}

export async function addOption(
  templateId: string,
  questionId: string,
  scored: boolean,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, orgId } = await getMembership();

  const label = text(formData, "label");
  const points = scored ? number(formData, "points") : 0;
  if (!label || !(points >= 0)) return { error: "Enter a label and points of 0 or more." };

  const { count } = await supabase
    .from("question_options")
    .select("id", { count: "exact", head: true })
    .eq("question_id", questionId);

  const { error } = await supabase.from("question_options").insert({
    organization_id: orgId,
    question_id: questionId,
    label,
    points,
    position: (count ?? 0) + 1,
  });
  if (error) return { error: friendlyError(error) };
  return done(templateId);
}

export async function updateOption(
  templateId: string,
  optionId: string,
  scored: boolean,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase } = await getMembership();

  const label = text(formData, "label");
  const points = scored ? number(formData, "points") : undefined;
  if (!label || (points !== undefined && !(points >= 0))) {
    return { error: "Enter a label and points of 0 or more." };
  }

  const { data, error } = await supabase
    .from("question_options")
    .update({ label, ...(points !== undefined && { points }) })
    .eq("id", optionId)
    .select("id");
  if (error) return { error: friendlyError(error) };
  if (data.length === 0) return noPermission;
  return done(templateId);
}

export async function deleteOption(templateId: string, optionId: string): Promise<ActionState> {
  const { supabase } = await getMembership();

  const { data, error } = await supabase.from("question_options").delete().eq("id", optionId).select("id");
  if (error) return { error: friendlyError(error) };
  if (data.length === 0) return noPermission;
  return done(templateId);
}
