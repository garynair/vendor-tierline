"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AuthField, AuthNotice, AuthShell, authButtonClass, authInputClass } from "@/components/auth-shell";
import { DemoLogin } from "@/components/demo-login";
import { Turnstile } from "@/components/turnstile";
import { signup } from "./actions";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, undefined);

  return (
    <AuthShell
      title="Create your own workspace"
      subtitle="Get a private copy of the sample data with full admin access: add vendors, run assessments, override tiers, and invite teammates."
      footer={
        <p>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-emerald-400 hover:text-emerald-300">
            Log in
          </Link>
        </p>
      }
    >
      {!state?.message && <DemoLogin compact />}

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
          <AuthField label="Confirm password">
            <input
              type="password"
              name="confirm_password"
              autoComplete="new-password"
              required
              minLength={10}
              className={authInputClass}
            />
          </AuthField>
          <Turnstile resetKey={state} />
          {state?.error && <AuthNotice tone="error">{state.error}</AuthNotice>}
          <button type="submit" disabled={pending} className={`${authButtonClass} mt-2`}>
            {pending ? "Creating workspace…" : "Create workspace"}
          </button>
          <p className="text-xs text-zinc-500">
            We&apos;ll email a link to confirm your address. Workspaces with no sign-in for 30 days
            are deleted; we email a reminder 7 days before.
          </p>
        </form>
      )}
    </AuthShell>
  );
}
