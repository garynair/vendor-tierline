"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getMembership, type MemberRole } from "@/lib/membership";
import type { ActionState } from "@/components/action-form";

const ROLES: MemberRole[] = ["admin", "practitioner", "learner"];

function parseRole(value: FormDataEntryValue | null): MemberRole | null {
  return ROLES.includes(value as MemberRole) ? (value as MemberRole) : null;
}

// All checks (admin only, last admin, no self-removal) are enforced by the
// database functions; these actions only pass the request through.

export async function createInvite(_prev: unknown, formData: FormData) {
  const { supabase, orgId } = await getMembership();
  const role = parseRole(formData.get("role"));
  if (!role) return { error: "Choose a role." };

  const { data: token, error } = await supabase.rpc("create_org_invite", { p_org: orgId, p_role: role });
  if (error || !token) return { error: error?.message ?? "Couldn't create the invite." };

  const host = (await headers()).get("host");
  const origin = host ? `https://${host}` : "https://vendor-tierline.vercel.app";
  revalidatePath("/dashboard/settings/users");
  return { link: `${origin}/join/${token}` };
}

export async function changeRole(userId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, orgId } = await getMembership();
  const role = parseRole(formData.get("role"));
  if (!role) return { error: "Choose a role." };
  const { error } = await supabase.rpc("set_member_role", { p_org: orgId, p_user: userId, p_role: role });
  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
  return { message: "Saved." };
}

export async function removeMember(userId: string): Promise<ActionState> {
  const { supabase, orgId } = await getMembership();
  const { error } = await supabase.rpc("remove_member", { p_org: orgId, p_user: userId });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings/users");
  return { message: "Removed." };
}

export async function revokeInvite(inviteId: string): Promise<ActionState> {
  const { supabase } = await getMembership();
  const { error } = await supabase.rpc("revoke_org_invite", { p_invite_id: inviteId });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings/users");
  return { message: "Revoked." };
}
