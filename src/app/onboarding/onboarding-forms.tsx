"use client";

import { useActionState } from "react";
import { AuthField, AuthNotice, authButtonClass, authInputClass } from "@/components/auth-shell";
import { acceptPendingInvite, createOrganization } from "./actions";

export function OnboardingForms({
  invite,
}: {
  invite: { organizationName: string; roleLabel: string } | null;
}) {
  const [createState, createAction, creating] = useActionState(createOrganization, undefined);
  const [joinState, joinAction, joining] = useActionState(acceptPendingInvite, undefined);

  if (invite) {
    return (
      <form action={joinAction} className="flex flex-col gap-4">
        {joinState?.error && <AuthNotice tone="error">{joinState.error}</AuthNotice>}
        <button type="submit" disabled={joining} className={authButtonClass}>
          {joining ? "Joining…" : `Join ${invite.organizationName}`}
        </button>
      </form>
    );
  }

  return (
    <form action={createAction} className="flex flex-col gap-4">
      <AuthField label="Workspace name">
        <input type="text" name="name" placeholder="e.g. Acme Corp" required maxLength={80} className={authInputClass} />
      </AuthField>
      {createState?.error && <AuthNotice tone="error">{createState.error}</AuthNotice>}
      <button type="submit" disabled={creating} className={`${authButtonClass} mt-2`}>
        {creating ? "Setting up your workspace…" : "Create workspace"}
      </button>
      <p className="text-xs text-zinc-500">
        Includes 27 fictional vendors with assessments, reviewer overrides, and follow-ups. Edit or
        delete anything.
      </p>
    </form>
  );
}
