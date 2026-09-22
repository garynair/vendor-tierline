import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { submitAnswer } from "./actions";
import { SubmissionForm } from "./submission-form";
import type { Rubric } from "@/lib/scoring";

export default async function ScenarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: scenario } = await supabase
    .from("scenarios")
    .select("id, title, brief, rubric")
    .eq("id", id)
    .single();

  if (!scenario) {
    notFound();
  }

  const rubric = scenario.rubric as Rubric;
  const boundSubmit = submitAnswer.bind(null, scenario.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{scenario.title}</h1>
        <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{scenario.brief}</p>
      </div>

      <SubmissionForm tierOptions={rubric.tier_options} action={boundSubmit} />
    </div>
  );
}
