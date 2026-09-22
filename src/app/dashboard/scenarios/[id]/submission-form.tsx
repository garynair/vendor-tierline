"use client";

import { useActionState } from "react";

export function SubmissionForm({
  tierOptions,
  action,
}: {
  tierOptions: string[];
  action: (prevState: unknown, formData: FormData) => Promise<{ error: string } | undefined>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Risk tier</legend>
        {tierOptions.map((tier) => (
          <label key={tier} className="flex items-center gap-2 text-sm capitalize">
            <input type="radio" name="tier" value={tier} required />
            {tier}
          </label>
        ))}
      </fieldset>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Rationale
        <textarea
          name="rationale"
          rows={6}
          required
          placeholder="Walk through the factors that drove your rating…"
          className="rounded border border-gray-300 px-3 py-2 font-normal"
        />
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Scoring…" : "Submit for scoring"}
      </button>
    </form>
  );
}
