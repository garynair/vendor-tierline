import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";

export type MemberRole = Enums<"member_role">;

// The signed-in user's org and role. v1 assumes one org per user.
// RLS and the RPCs enforce access; this only drives redirects and which
// controls the UI shows.
export const getMembership = cache(async () => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("organization_id, role, organizations(name)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect("/onboarding");
  }

  return {
    supabase,
    user,
    orgId: membership.organization_id,
    orgName: membership.organizations?.name ?? "",
    role: membership.role,
    isAdmin: membership.role === "admin",
    isStaff: membership.role === "admin" || membership.role === "practitioner",
  };
});
