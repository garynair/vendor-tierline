"use client";

import { useActionState } from "react";

export type ActionState = { error?: string; message?: string } | undefined;

export function ActionForm({
  action,
  submitLabel,
  pendingLabel = "Saving…",
  confirm,
  variant = "primary",
  className = "flex flex-col gap-3",
  children,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  pendingLabel?: string;
  confirm?: string;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
  children?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  const buttonClass = {
    primary: "rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50",
    secondary: "rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-50",
    danger: "rounded border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-50",
  }[variant];

  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      {children}
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="text-sm text-green-700">{state.message}</p>}
      <div>
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? pendingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
