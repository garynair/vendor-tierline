"use client";

import { useActionState, useState } from "react";
import { createInvite } from "./actions";

export function InviteForm() {
  const [state, formAction, pending] = useActionState(createInvite, undefined);
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <label className="text-sm" htmlFor="invite-role">
          Invite as
        </label>
        <select id="invite-role" name="role" defaultValue="practitioner" className="rounded border border-gray-300 px-2 py-1.5 text-sm">
          <option value="practitioner">Practitioner</option>
          <option value="learner">Read-only</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" disabled={pending} className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50">
          {pending ? "Creating…" : "Create invite link"}
        </button>
      </form>
      {state && "error" in state && state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state && "link" in state && state.link && (
        <div className="flex flex-col gap-1 rounded border border-green-200 bg-green-50 p-3">
          <p className="text-sm">Send this link to your teammate. It works once and expires in 7 days.</p>
          <div className="flex gap-2">
            <input readOnly value={state.link} className="flex-1 rounded border border-gray-300 px-2 py-1 font-mono text-xs" onFocus={(event) => event.target.select()} />
            <button
              type="button"
              className="rounded border border-gray-300 px-2 py-1 text-xs"
              onClick={async () => {
                await navigator.clipboard.writeText(state.link);
                setCopied(true);
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-gray-500">The link is shown only now; only a hash of it is stored.</p>
        </div>
      )}
    </div>
  );
}
