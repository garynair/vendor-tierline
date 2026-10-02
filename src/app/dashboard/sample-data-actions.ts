"use server";

import { revalidatePath } from "next/cache";
import { getMembership } from "@/lib/membership";
import type { ActionState } from "@/components/action-form";

// The database function checks the caller is an admin and that the samples
// aren't already loaded.
export async function loadSampleData(): Promise<ActionState> {
  const { supabase, orgId } = await getMembership();
  const { data, error } = await supabase.rpc("load_sample_data", { p_org: orgId });
  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
  return { message: `Loaded ${data} sample vendors.` };
}
