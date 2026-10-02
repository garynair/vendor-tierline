"use client";

import { useActionState } from "react";
import { AuthNotice, authButtonClass } from "@/components/auth-shell";
import { Turnstile, captchaButtonLabel, useTurnstile } from "@/components/turnstile";
import { login } from "@/app/login/actions";

// Public, read-only demo account (learner role). Safe to expose: row-level
// security blocks all writes for this role. Also listed in the README.
export const DEMO_EMAIL = "demo@example.com";
export const DEMO_PASSWORD = "Password@123";

// One-click entry into the demo workspace, shown on the login and signup pages
// so visitors who land on the app directly can explore without signing up.
export function DemoLogin({ compact = false }: { compact?: boolean }) {
  const [state, formAction, pending] = useActionState(login, undefined);
  const captcha = useTurnstile();

  return (
    <form
      action={formAction}
      className="mb-5 flex flex-col gap-3 rounded-lg border border-emerald-800 bg-emerald-950/40 p-4"
    >
      <p className="text-sm text-zinc-300">
        {compact ? (
          <>
            <span className="font-medium text-emerald-300">Prefer a quick look?</span> Open the
            read-only demo instead.
          </>
        ) : (
          <>
            <span className="font-medium text-emerald-300">Just looking?</span> Open the read-only demo:
            sample vendors, risk tiers, and Insights. No sign-up needed.
          </>
        )}
      </p>
      <input type="hidden" name="email" value={DEMO_EMAIL} />
      <input type="hidden" name="password" value={DEMO_PASSWORD} />
      <Turnstile resetKey={state} onToken={captcha.setToken} onFailed={captcha.setFailed} />
      {state?.error && <AuthNotice tone="error">{state.error}</AuthNotice>}
      <button type="submit" disabled={pending || !captcha.ready} className={authButtonClass}>
        {pending ? "Opening demo…" : captchaButtonLabel(captcha.status, "Explore the demo")}
      </button>
    </form>
  );
}
