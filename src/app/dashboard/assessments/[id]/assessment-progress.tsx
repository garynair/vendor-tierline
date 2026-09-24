import type { Enums } from "@/lib/supabase/database.types";

type Status = Enums<"assessment_status">;

const nextStepHint: Record<Status, { tiering: string; followup: string }> = {
  draft: {
    tiering: "Create a vendor link below and send it, or answer the questions yourself. Submit once every question is answered.",
    followup: "Create a vendor link below and send it, or answer the questions yourself.",
  },
  sent: {
    tiering: "Waiting on the vendor. Their answers save as they go, and you can finish the questionnaire here too.",
    followup: "Waiting on the vendor. Their answers save as they go, and you can finish the questionnaire here too.",
  },
  in_progress: {
    tiering: "The vendor has started answering. You can wait for them or finish it here.",
    followup: "The vendor has started answering. You can wait for them or finish it here.",
  },
  submitted: {
    tiering: "Check the score below, then confirm the computed tier or override it with a reason.",
    followup: "All done. The answers are recorded below.",
  },
  reviewed: {
    tiering: "Tier decided. Create the follow-up questionnaire for this tier at the bottom of the page.",
    followup: "All done. The answers are recorded below.",
  },
};

// Where this assessment sits in the two-stage flow, plus what to do next.
export function AssessmentProgress({ type, status }: { type: Enums<"questionnaire_type">; status: Status }) {
  const stages =
    type === "tiering"
      ? ["Answer questionnaire", "Review tier", "Send follow-up"]
      : ["Answer follow-up", "Done"];

  const current =
    status === "draft" || status === "sent" || status === "in_progress"
      ? 0
      : type === "tiering"
        ? status === "submitted"
          ? 1
          : 2
        : 1;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4">
      <ol className="flex items-center gap-2 text-xs">
        {stages.map((stage, index) => (
          <li key={stage} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-semibold ${
                index < current
                  ? "bg-green-100 text-green-800"
                  : index === current
                    ? "bg-black text-white"
                    : "border border-gray-300 text-gray-500"
              }`}
            >
              {index < current ? "✓" : index + 1}
            </span>
            <span className={index === current ? "font-medium" : "text-gray-500"}>{stage}</span>
            {index < stages.length - 1 && <span className="h-px flex-1 bg-gray-200" />}
          </li>
        ))}
      </ol>
      <p className="text-sm text-gray-600">
        <span className="font-medium">Next: </span>
        {nextStepHint[status][type]}
      </p>
    </section>
  );
}
