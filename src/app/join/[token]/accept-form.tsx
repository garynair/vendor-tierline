"use client";

import { useActionState } from "react";
import { AuthNotice, authButtonClass } from "@/components/auth-shell";
import { acceptInvite } from "./actions";

export function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const [state, formAction, pending] = useActionState(acceptInvite.bind(null, token), undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <p className="text-sm text-zinc-400">Signed in as {email}.</p>
      {state?.error && <AuthNotice tone="error">{state.error}</AuthNotice>}
      <button type="submit" disabled={pending} className={authButtonClass}>
        {pending ? "Joining…" : "Accept invite"}
      </button>
    </form>
  );
}
