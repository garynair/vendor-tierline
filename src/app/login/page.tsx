"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AuthField, AuthNotice, AuthShell, authButtonClass, authInputClass } from "@/components/auth-shell";
import { login } from "./actions";

// Public, read-only demo account (learner role). Safe to expose: row-level
// security blocks all writes for this role. Also listed in the README.
const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "Password@123";

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
      <form action={formAction} className="mb-6 flex flex-col gap-3 rounded-lg border border-emerald-800 bg-emerald-950/40 p-4">
        <p className="text-sm text-zinc-300">
          <span className="font-medium text-emerald-300">Just exploring?</span> Try a read-only
          demo workspace with sample vendors, risk tiers, reviewer overrides, and the Insights
          dashboard.
        </p>
        <input type="hidden" name="email" value={DEMO_EMAIL} />
        <input type="hidden" name="password" value={DEMO_PASSWORD} />
        <button type="submit" disabled={pending} className={authButtonClass}>
          {pending ? "Opening demo…" : "Explore the demo"}
        </button>
        <p className="text-xs text-zinc-500">
          Demo login: {DEMO_EMAIL} / {DEMO_PASSWORD}. Changes are turned off.
        </p>
      </form>

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
