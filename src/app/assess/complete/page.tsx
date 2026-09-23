import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Questionnaire submitted · Vendor Tierline",
  robots: { index: false, follow: false },
};

export default function AssessCompletePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-3 px-4">
      <h1 className="text-xl font-semibold">Thanks, your answers were submitted</h1>
      <p className="text-sm text-gray-600">
        The team that sent you this questionnaire will review your responses. The link no longer
        works now that it has been submitted. You can close this page.
      </p>
    </main>
  );
}
