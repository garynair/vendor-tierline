"use client";

import { useActionState } from "react";
import { AuthField, AuthNotice, AuthShell, authButtonClass, authInputClass } from "@/components/auth-shell";
import { createOrganization } from "./actions";

export default function OnboardingPage() {
  const [state, formAction, pending] = useActionState(createOrganization, undefined);

  return (
    <AuthShell
      title="Name your organization"
      subtitle="This is where your team tiers vendors. You'll be its admin."
    >
      <form action={formAction} className="flex flex-col gap-4">
        <AuthField label="Organization name">
          <input type="text" name="name" placeholder="e.g. Acme Corp" required className={authInputClass} />
        </AuthField>
        {state?.error && <AuthNotice tone="error">{state.error}</AuthNotice>}
        <button type="submit" disabled={pending} className={`${authButtonClass} mt-2`}>
          {pending ? "Setting up…" : "Create organization"}
        </button>
        <p className="text-xs text-zinc-500">
          We&apos;ll add default risk tiers and questionnaires so you can tier your first vendor
          right away.
        </p>
      </form>
    </AuthShell>
  );
}
