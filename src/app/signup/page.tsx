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

  const [formError, setFormError] = useState<string | null>(null);

  const mismatch = confirm.length > 0 && confirm !== password;

  // The button is always clickable; a click explains what's missing instead
  // of a disabled button that gives no reason.
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const missing = PASSWORD_RULES.filter((rule) => !rule.test(password)).map((rule) => rule.label.toLowerCase());
    if (missing.length > 0) {
      event.preventDefault();
      setFormError(`Your password still needs: ${missing.join(", ")}.`);
      return;
    }
    if (confirm !== password) {
      event.preventDefault();
      setFormError("The passwords don't match. Type the same password in both fields.");
      return;
    }
    setFormError(null);
    captcha.onSubmit(event);
  };

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
        <form onSubmit={onSubmit} action={formAction} className="flex flex-col gap-4">
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
              onChange={(event) => { setPassword(event.target.value); setFormError(null); }}
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
              onChange={(event) => { setConfirm(event.target.value); setFormError(null); }}
              className={authInputClass}
            />
            {mismatch && <span className="text-xs font-normal text-red-400">Passwords don&apos;t match yet.</span>}
          </AuthField>
          <Turnstile resetKey={state} onToken={captcha.setToken} onFailed={captcha.setFailed} />
          {(formError ?? state?.error) && <AuthNotice tone="error">{formError ?? state?.error}</AuthNotice>}
          <button
            type="submit"
            disabled={pending || captcha.queued || captcha.status === "failed"}
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
