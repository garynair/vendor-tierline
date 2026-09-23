"use client";

import { useActionState } from "react";
import { createOrganization } from "./actions";

export default function OnboardingPage() {
  const [state, formAction, pending] = useActionState(createOrganization, undefined);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold">Set up your organization</h1>
        <p className="text-sm text-gray-500">
          This is where your team tiers vendors. You&apos;ll be its admin.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <input
          type="text"
          name="name"
          placeholder="Organization name"
          required
          className="rounded border border-gray-300 px-3 py-2"
        />
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create organization"}
        </button>
      </form>
    </main>
  );
}
