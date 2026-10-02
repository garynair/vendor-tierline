"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PENDING_INVITE_COOKIE } from "@/lib/invites";

export async function acceptInvite(token: string, _prev: unknown) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_org_invite", { p_token: token });
  if (error) {
    return { error: error.message };
  }
  (await cookies()).delete(PENDING_INVITE_COOKIE);
  redirect("/dashboard");
}
