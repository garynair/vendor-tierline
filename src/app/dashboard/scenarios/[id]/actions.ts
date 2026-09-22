"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { scoreRubricSubmission, type Rubric } from "@/lib/scoring";

export async function submitAnswer(scenarioId: string, _prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const answer = {
    tier: String(formData.get("tier")),
    rationale: String(formData.get("rationale")),
  };

  if (!answer.tier || !answer.rationale.trim()) {
    return { error: "Choose a tier and explain your rationale." };
  }

  const { data: scenario, error: scenarioError } = await supabase
    .from("scenarios")
    .select("rubric")
    .eq("id", scenarioId)
    .single();

  if (scenarioError || !scenario) {
    return { error: "Scenario not found." };
  }

  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .insert({ scenario_id: scenarioId, user_id: user.id, answer })
    .select()
    .single();

  if (submissionError) {
    return { error: submissionError.message };
  }

  const result = scoreRubricSubmission(scenario.rubric as Rubric, answer);

  const { error: scoreError } = await supabase.from("scores").insert({
    submission_id: submission.id,
    score: result.score,
    factor_breakdown: result.factor_breakdown,
    summary: result.summary,
  });

  if (scoreError) {
    return { error: scoreError.message };
  }

  redirect(`/dashboard/scenarios/${scenarioId}/result/${submission.id}`);
}
