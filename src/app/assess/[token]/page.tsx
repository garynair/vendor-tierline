import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { QuestionnaireForm, type QuestionnaireQuestion } from "@/components/questionnaire-form";
import { formatDate } from "@/lib/labels";
import { saveVendorAnswer, submitVendorAssessment } from "./actions";

// The token is in the URL, so keep it out of Referer headers and search indexes.
export const metadata: Metadata = {
  title: "Vendor questionnaire · Vendor Tierline",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

type TokenAssessment = {
  assessment: { id: string; type: string; status: string; expires_at: string };
  vendor: { name: string };
  engagement: { name: string; description: string | null };
  template: { name: string; description: string | null };
  questions: QuestionnaireQuestion[];
  answers: Record<string, string>;
};

export default async function AssessPage({ params }: PageProps<"/assess/[token]">) {
  const { token } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_assessment_for_token", { p_token: token });

  if (error || !data) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-3 px-4">
        <h1 className="text-xl font-semibold">This link is no longer valid</h1>
        <p className="text-sm text-gray-600">
          It may have expired, been replaced by a newer link, or the questionnaire was already
          submitted. Contact the person who sent it to you for a new link.
        </p>
      </main>
    );
  }

  const assessment = data as unknown as TokenAssessment;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <p className="text-xs uppercase text-gray-500">Vendor Tierline</p>
        <h1 className="text-2xl font-semibold">{assessment.template.name}</h1>
        <p className="text-sm text-gray-700">
          For <span className="font-medium">{assessment.vendor.name}</span> ·{" "}
          {assessment.engagement.name}
        </p>
        {assessment.template.description && (
          <p className="text-sm text-gray-600">{assessment.template.description}</p>
        )}
        <p className="text-xs text-gray-500">
          This link expires {formatDate(assessment.assessment.expires_at)}. Don&apos;t share it:
          anyone with the link can answer on your behalf.
        </p>
      </header>

      <QuestionnaireForm
        questions={assessment.questions}
        initialAnswers={assessment.answers}
        saveAnswer={saveVendorAnswer.bind(null, token)}
        submit={submitVendorAssessment.bind(null, token)}
      />
    </main>
  );
}
