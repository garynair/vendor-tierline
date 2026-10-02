import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { roleLabels } from "@/lib/invites";
import { formatDate } from "@/lib/labels";
import { AuthNotice, AuthShell, authButtonClass } from "@/components/auth-shell";
import { RememberInvite } from "./remember-invite";
import { AcceptInviteForm } from "./accept-form";

const statusMessages: Record<string, string> = {
  used: "This invite link has already been used.",
  revoked: "This invite link was revoked by an admin.",
  expired: "This invite link has expired. Ask your admin for a new one.",
};

export default async function JoinPage({ params }: PageProps<"/join/[token]">) {
  const { token } = await params;
  const supabase = await createClient();

  const [{ data: inviteRows }, { data: userData }] = await Promise.all([
    supabase.rpc("get_org_invite", { p_token: token }),
    supabase.auth.getUser(),
  ]);
  const invite = inviteRows?.[0];
  const user = userData.user;

  if (!invite || invite.status !== "valid") {
    return (
      <AuthShell title="Invite link" subtitle="Join a Vendor Tierline workspace.">
        <AuthNotice tone="error">
          {invite ? statusMessages[invite.status] : "This invite link isn't valid. Check that you copied all of it."}
        </AuthNotice>
      </AuthShell>
    );
  }

  const next = encodeURIComponent(`/join/${token}`);

  return (
    <AuthShell
      title={`Join ${invite.organization_name}`}
      subtitle={`You've been invited as ${roleLabels[invite.role]}. The link expires ${formatDate(invite.expires_at)}.`}
    >
      <RememberInvite token={token} />
      {user ? (
        <AcceptInviteForm token={token} email={user.email ?? ""} />
      ) : (
        <div className="flex flex-col gap-3">
          <Link href="/signup" className={`${authButtonClass} text-center`}>
            Create an account to join
          </Link>
          <Link
            href={`/login?next=${next}`}
            className="rounded-md border border-zinc-700 px-4 py-2.5 text-center text-sm text-zinc-200 hover:border-zinc-500"
          >
            I already have an account
          </Link>
          <p className="text-xs text-zinc-500">
            After you confirm your email, you&apos;ll be offered to join this workspace.
          </p>
        </div>
      )}
    </AuthShell>
  );
}
