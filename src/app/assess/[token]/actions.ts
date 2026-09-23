"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";

// Vendor-side actions. The token is the only credential: the RPCs resolve it
// to one assessment and reject anything outside that assessment's template.

export async function saveVendorAnswer(token: string, questionId: string, optionId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_assessment_answer", {
    p_token: token,
    p_question_id: questionId,
    p_option_id: optionId,
  });
  if (error) return { error: friendlyError(error, "Couldn't save that answer. Try again.") };
}

export async function submitVendorAssessment(token: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_assessment", { p_token: token });
  if (error) return { error: friendlyError(error) };
  // The token is invalidated on submit, so the questionnaire URL stops working.
  redirect("/assess/complete");
}
