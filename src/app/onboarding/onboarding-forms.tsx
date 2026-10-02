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
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium text-zinc-300">How do you want to start?</legend>
        <label className="flex cursor-pointer gap-3 rounded-md border border-zinc-700 p-3 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-950/40">
          <input type="radio" name="start" value="samples" defaultChecked className="mt-1 accent-emerald-500" />
          <span className="text-sm">
            <span className="font-medium text-zinc-100">With sample data</span>{" "}
            <span className="text-xs text-emerald-400">Recommended</span>
            <span className="block text-xs text-zinc-400">
              27 fictional vendors with assessments, reviewer overrides, and follow-ups, so every
              screen has something to show.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer gap-3 rounded-md border border-zinc-700 p-3 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-950/40">
          <input type="radio" name="start" value="empty" className="mt-1 accent-emerald-500" />
          <span className="text-sm">
            <span className="font-medium text-zinc-100">Empty</span>
            <span className="block text-xs text-zinc-400">
              Risk tiers and questionnaires only. Add your own vendors. You can load the sample data
              later from Settings.
            </span>
          </span>
        </label>
      </fieldset>
      {createState?.error && <AuthNotice tone="error">{createState.error}</AuthNotice>}
      <button type="submit" disabled={creating} className={`${authButtonClass} mt-2`}>
        {creating ? "Setting up your workspace…" : "Create workspace"}
      </button>
    </form>
  );
}
