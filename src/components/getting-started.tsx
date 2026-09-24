import Link from "next/link";

export type GettingStartedProgress = {
  hasTieringTemplate: boolean;
  hasVendor: boolean;
  hasTieringAssessment: boolean;
  hasSubmitted: boolean;
  hasReviewed: boolean;
  hasFollowup: boolean;
  firstEngagementHref: string | null;
  firstAssessmentHref: string | null;
  firstReviewableHref: string | null;
};

// Walks a new org through the two-stage flow. Each step is derived from real
// data, so it ticks itself off; the card disappears once everything is done.
export function GettingStarted({ progress, isAdmin }: { progress: GettingStartedProgress; isAdmin: boolean }) {
  const steps = [
    {
      done: progress.hasTieringTemplate,
      title: "Check your tiering questionnaire",
      body: "Seven risk questions score each engagement. Adjust questions, weights, or tier cutoffs to match your program.",
      href: "/dashboard/settings",
      cta: isAdmin ? "Open settings" : "View settings",
    },
    {
      done: progress.hasVendor,
      title: "Add a vendor",
      body: "Enter the company and the service it provides you. Each service (engagement) gets its own tier.",
      href: "/dashboard/vendors/new",
      cta: "Add vendor",
    },
    {
      done: progress.hasTieringAssessment,
      title: "Start tiering",
      body: "Open the engagement and start a tiering questionnaire.",
      href: progress.firstEngagementHref,
      cta: "Open engagement",
    },
    {
      done: progress.hasSubmitted,
      title: "Collect the answers",
      body: "Send the vendor a private link (no account needed), or answer it yourself, then submit.",
      href: progress.firstAssessmentHref,
      cta: "Open questionnaire",
    },
    {
      done: progress.hasReviewed,
      title: "Review the tier",
      body: "The score suggests a tier. Confirm it, or override it with a reason your auditors can see.",
      href: progress.firstReviewableHref,
      cta: "Review",
    },
    {
      done: progress.hasFollowup,
      title: "Send the follow-up",
      body: "Each tier maps to a due-diligence questionnaire. Critical and High get the enhanced one.",
      href: progress.firstReviewableHref,
      cta: "Create follow-up",
    },
  ];

  const completed = steps.filter((step) => step.done).length;
  if (completed === steps.length) return null;
  const nextIndex = steps.findIndex((step) => !step.done);

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Getting started</h2>
          <p className="text-sm text-gray-600">
            Take one vendor through the whole flow. It takes about five minutes.
          </p>
        </div>
        <span className="whitespace-nowrap text-sm text-gray-500">
          {completed} of {steps.length} done
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-green-700 transition-all"
          style={{ width: `${(completed / steps.length) * 100}%` }}
        />
      </div>

      <ol className="flex flex-col gap-3">
        {steps.map((step, index) => {
          const isNext = index === nextIndex;
          return (
            <li key={step.title} className={`flex gap-3 ${step.done ? "opacity-60" : ""}`}>
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  step.done
                    ? "bg-green-100 text-green-800"
                    : isNext
                      ? "bg-black text-white"
                      : "border border-gray-300 text-gray-500"
                }`}
              >
                {step.done ? "✓" : index + 1}
              </span>
              <div className="flex flex-1 flex-col gap-1">
                <p className={`text-sm font-medium ${step.done ? "line-through" : ""}`}>{step.title}</p>
                {isNext && (
                  <>
                    <p className="text-sm text-gray-600">{step.body}</p>
                    {step.href && (
                      <div>
                        <Link href={step.href} className="mt-1 inline-block rounded bg-black px-3 py-1.5 text-sm text-white">
                          {step.cta}
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
