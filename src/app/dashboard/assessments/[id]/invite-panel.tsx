"use client";

import { useActionState, useState } from "react";
import type { InviteState } from "../actions";

export function InvitePanel({
  action,
  hasActiveLink,
}: {
  action: (prevState: InviteState, formData: FormData) => Promise<InviteState>;
  hasActiveLink: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <form
        action={formAction}
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          if (hasActiveLink && !window.confirm("This replaces the current link; the old one stops working. Continue?")) {
            event.preventDefault();
          }
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          Link valid for
          <select name="days" defaultValue="14" className="rounded border border-gray-300 px-2 py-2">
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {pending ? "Creating link…" : hasActiveLink ? "Replace vendor link" : "Create vendor link"}
        </button>
      </form>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.url && (
        <div className="flex flex-col gap-2 rounded border border-green-200 bg-green-50 p-3 text-sm">
          <p>
            Send this link to the vendor. It&apos;s shown only once, and it expires in{" "}
            {state.expiresInDays} days.
          </p>
          <div className="flex gap-2">
            <input readOnly value={state.url} className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 font-mono text-xs" />
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(state.url!);
                setCopied(true);
              }}
              className="rounded border border-gray-300 bg-white px-2 py-1"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
