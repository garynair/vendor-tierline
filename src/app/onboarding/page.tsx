import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PENDING_INVITE_COOKIE, roleLabels } from "@/lib/invites";
import { AuthShell } from "@/components/auth-shell";
import { OnboardingForms } from "./onboarding-forms";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { count } = await supabase
    .from("memberships")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((count ?? 0) > 0) redirect("/dashboard");

  // A teammate invite opened before signing up takes priority.
  const token = (await cookies()).get(PENDING_INVITE_COOKIE)?.value;
  let invite: { organizationName: string; roleLabel: string } | null = null;
  if (token) {
    const { data } = await supabase.rpc("get_org_invite", { p_token: token });
    const row = data?.[0];
    if (row?.status === "valid") {
      invite = { organizationName: row.organization_name, roleLabel: roleLabels[row.role] };
    }
  }

  return (
    <AuthShell
      title={invite ? `Join ${invite.organizationName}` : "Name your workspace"}
      subtitle={
        invite
          ? `You've been invited as ${invite.roleLabel}.`
          : "We'll fill it with sample vendors, assessments, and risk tiers so you can try everything. You'll be its admin."
      }
    >
      <OnboardingForms invite={invite} />
    </AuthShell>
  );
}
