"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AuthField, AuthNotice, AuthShell, authButtonClass, authInputClass } from "@/components/auth-shell";
import { DemoLogin } from "@/components/demo-login";
import { signup } from "./actions";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, undefined);

  return (
    <AuthShell
      title="Create your workspace"
      subtitle="Set up your team's vendor risk program. You'll start with a ready-made tiering questionnaire you can adjust."
      footer={
        <p>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-emerald-400 hover:text-emerald-300">
            Log in
          </Link>
        </p>
      }
    >
      {!state?.message && <DemoLogin />}

      {state?.message ? (
        <AuthNotice tone="success">{state.message}</AuthNotice>
      ) : (
        <form action={formAction} className="flex flex-col gap-4">
          <AuthField label="Work email">
            <input type="email" name="email" autoComplete="email" required className={authInputClass} />
          </AuthField>
          <AuthField label="Password">
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              required
              minLength={10}
              className={authInputClass}
            />
            <span className="text-xs font-normal text-zinc-500">
              At least 10 characters, with letters and numbers.
            </span>
          </AuthField>
          {state?.error && <AuthNotice tone="error">{state.error}</AuthNotice>}
          <button type="submit" disabled={pending} className={`${authButtonClass} mt-2`}>
            {pending ? "Creating account…" : "Create account"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
