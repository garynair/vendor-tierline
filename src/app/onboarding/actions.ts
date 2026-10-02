"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PENDING_INVITE_COOKIE } from "@/lib/invites";

// New accounts get a sandbox workspace with the user as admin: risk tiers and
// questionnaires always, plus the sample vendors and assessments unless they
// chose to start empty (they can load the samples later from Home or Settings).
export async function createOrganization(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Workspace name is required." };
  }

  const withSamples = formData.get("start") !== "empty";
  const { error } = await supabase.rpc("create_sandbox_workspace", { p_name: name, p_with_samples: withSamples });
  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

// Accepts the teammate invite remembered from /join/[token].
export async function acceptPendingInvite() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const token = cookieStore.get(PENDING_INVITE_COOKIE)?.value;
  if (!token) {
    return { error: "No pending invite found. Open the invite link again." };
  }

  const { error } = await supabase.rpc("accept_org_invite", { p_token: token });
  cookieStore.delete(PENDING_INVITE_COOKIE);
  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}
