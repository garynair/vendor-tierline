"use client";

import { useActionState } from "react";
import { AuthNotice, authButtonClass } from "@/components/auth-shell";
import { confirmEmail } from "./actions";

export function ConfirmForm({ tokenHash, type, next }: { tokenHash: string; type: string; next: string }) {
  const [state, formAction, pending] = useActionState(confirmEmail, undefined);

  if (!tokenHash || !type) {
    return <AuthNotice tone="error">This confirmation link is incomplete. Open it again from your email.</AuthNotice>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="next" value={next} />
      {state?.error && <AuthNotice tone="error">{state.error}</AuthNotice>}
      <button type="submit" disabled={pending} className={authButtonClass}>
        {pending ? "Confirming…" : "Confirm my email"}
      </button>
    </form>
  );
}
