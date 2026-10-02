"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AuthField, AuthNotice, AuthShell, authButtonClass, authInputClass } from "@/components/auth-shell";
import { DemoLogin } from "@/components/demo-login";
import { Turnstile, captchaButtonLabel, useTurnstile } from "@/components/turnstile";
import { PASSWORD_RULES } from "@/lib/password-rules";
import { signup } from "./actions";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, undefined);
  const captcha = useTurnstile();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const rulesMet = PASSWORD_RULES.every((rule) => rule.test(password));
  const mismatch = confirm.length > 0 && confirm !== password;

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
        <form onSubmit={captcha.onSubmit} action={formAction} className="flex flex-col gap-4">
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
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-describedby="password-rules"
              className={authInputClass}
            />
            <ul id="password-rules" className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs font-normal">
              {PASSWORD_RULES.map((rule) => {
                const met = rule.test(password);
                return (
                  <li key={rule.label} className={`whitespace-nowrap ${met ? "text-emerald-400" : "text-zinc-500"}`}>
                    <span aria-hidden="true">{met ? "✓" : "○"}</span> {rule.label}
                    <span className="sr-only">{met ? " (done)" : " (missing)"}</span>
                  </li>
                );
              })}
            </ul>
          </AuthField>
          <AuthField label="Confirm password">
            <input
              type="password"
              name="confirm_password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className={authInputClass}
            />
            {mismatch && <span className="text-xs font-normal text-red-400">Passwords don&apos;t match yet.</span>}
          </AuthField>
          <Turnstile resetKey={state} onToken={captcha.setToken} onFailed={captcha.setFailed} />
          {state?.error && <AuthNotice tone="error">{state.error}</AuthNotice>}
          <button
            type="submit"
            disabled={pending || captcha.queued || captcha.status === "failed" || !rulesMet || mismatch || !confirm}
            className={`${authButtonClass} mt-2`}
          >
            {pending ? "Creating workspace…" : captchaButtonLabel(captcha, "Create workspace", "Creating workspace…")}
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
