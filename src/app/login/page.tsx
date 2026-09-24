"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AuthField, AuthNotice, AuthShell, authButtonClass, authInputClass } from "@/components/auth-shell";
import { login } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to review tiers, send questionnaires, and track due diligence."
      footer={
        <div className="flex flex-col gap-4">
          <p>
            New to Vendor Tierline?{" "}
            <Link href="/signup" className="font-medium text-emerald-400 hover:text-emerald-300">
              Create a workspace
            </Link>
          </p>
          <p className="border-t border-zinc-800 pt-4 text-xs text-zinc-500">
            Answering a questionnaire for a customer? You don&apos;t need an account. Use the
            private link from your email.
          </p>
        </div>
      }
    >
      <form action={formAction} className="flex flex-col gap-4">
        <AuthField label="Work email">
          <input type="email" name="email" autoComplete="email" required className={authInputClass} />
        </AuthField>
        <AuthField label="Password">
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            className={authInputClass}
          />
        </AuthField>
        {state?.error && <AuthNotice tone="error">{state.error}</AuthNotice>}
        <button type="submit" disabled={pending} className={`${authButtonClass} mt-2`}>
          {pending ? "Logging in…" : "Log in"}
        </button>
      </form>
    </AuthShell>
  );
}
