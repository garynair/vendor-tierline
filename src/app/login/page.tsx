"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthField, AuthNotice, AuthShell, authButtonClass, authInputClass } from "@/components/auth-shell";
import { DemoLogin } from "@/components/demo-login";
import { Turnstile, captchaButtonLabel, useTurnstile } from "@/components/turnstile";
import { login } from "./actions";

function LoginForm() {
  const [state, formAction, pending] = useActionState(login, undefined);
  const next = useSearchParams().get("next") ?? "";
  const captcha = useTurnstile();

  return (
    <form onSubmit={captcha.onSubmit} action={formAction} className="flex flex-col gap-4 lg:gap-3">
      <input type="hidden" name="next" value={next} />
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
      <Turnstile resetKey={state} onToken={captcha.setToken} onFailed={captcha.setFailed} />
      {state?.error && <AuthNotice tone="error">{state.error}</AuthNotice>}
      <button type="submit" disabled={pending || captcha.queued || captcha.status === "failed"} className={authButtonClass}>
        {pending ? "Logging in…" : captchaButtonLabel(captcha, "Log in", "Logging in…")}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to your workspace, or try the demo below."
      footer={
        <div className="flex flex-col gap-4">
          <p>
            Want to try it hands-on?{" "}
            <Link href="/signup" className="font-medium text-emerald-400 hover:text-emerald-300">
              Create your own workspace
            </Link>
            , pre-loaded with sample data and full access.
          </p>
          <p className="border-t border-zinc-800 pt-4 text-xs text-zinc-500">
            Answering a questionnaire for a customer? You don&apos;t need an account. Use the
            private link from your email.
          </p>
        </div>
      }
    >
      <DemoLogin />
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
