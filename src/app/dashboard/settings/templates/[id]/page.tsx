import Link from "next/link";
import { notFound } from "next/navigation";
import { getMembership } from "@/lib/membership";
import { categoryLabels, typeLabels } from "@/lib/labels";
import { ActionForm } from "@/components/action-form";
import {
  addOption,
  addQuestion,
  deleteOption,
  deleteQuestion,
  deleteTemplate,
  updateOption,
  updateQuestion,
  updateTemplate,
} from "../../actions";

const inputClass = "rounded border border-gray-300 px-2 py-1.5 font-normal";

function CategorySelect({ defaultValue }: { defaultValue?: string }) {
  return (
    <select name="category" defaultValue={defaultValue ?? "other"} className={inputClass}>
      {Object.entries(categoryLabels).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

export default async function TemplatePage({ params }: PageProps<"/dashboard/settings/templates/[id]">) {
  const { id } = await params;
  const { supabase, isAdmin } = await getMembership();

  const { data: template } = await supabase
    .from("questionnaire_templates")
    .select("id, name, type, description")
    .eq("id", id)
    .maybeSingle();
  if (!template) notFound();

  const { data: questions } = await supabase
    .from("questionnaire_questions")
    .select("id, category, prompt, weight, position, question_options(id, label, points, position)")
    .eq("template_id", id)
    .order("position")
    .order("created_at");

  // Only tiering questions are scored; follow-ups are plain multiple choice.
  const scored = template.type === "tiering";
  const maxPossible = (questions ?? []).reduce(
    (sum, question) => sum + question.weight * Math.max(0, ...question.question_options.map((option) => option.points)),
    0
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/dashboard/settings" className="text-xs uppercase text-gray-500 hover:underline">
          Settings
        </Link>
        <h1 className="text-xl font-semibold">{template.name}</h1>
        <p className="text-sm text-gray-600">
          {typeLabels[template.type]} questionnaire · {(questions ?? []).length} questions
          {scored && ` · max ${maxPossible} weighted points`}
        </p>
      </div>

      {isAdmin && (
        <p className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          Edits apply to questionnaires not yet submitted. Submitted assessments keep the points and
          weights they were scored with. Questions and options that already have answers can&apos;t be
          deleted.
        </p>
      )}

      {isAdmin && (
        <ActionForm
          action={updateTemplate.bind(null, template.id)}
          submitLabel="Save details"
          variant="secondary"
          className="flex max-w-lg flex-col gap-2"
        >
          <input name="name" defaultValue={template.name} required className={inputClass} />
          <input name="description" defaultValue={template.description ?? ""} placeholder="Description" className={inputClass} />
        </ActionForm>
      )}

      <ol className="flex flex-col gap-4">
        {(questions ?? []).map((question) => {
          const options = [...question.question_options].sort((a, b) => a.position - b.position);
          return (
            <li key={question.id} className="flex flex-col gap-3 rounded border border-gray-200 p-4">
              {isAdmin ? (
                <ActionForm
                  action={updateQuestion.bind(null, template.id, question.id, scored)}
                  submitLabel="Save question"
                  variant="secondary"
                  className="flex flex-col gap-2"
                >
                  <textarea name="prompt" defaultValue={question.prompt} rows={2} required className={inputClass} />
                  <div className="flex flex-wrap gap-3 text-sm">
                    <CategorySelect defaultValue={question.category} />
                    {scored && (
                      <label className="flex items-center gap-1">
                        Weight
                        <input name="weight" type="number" min={0.01} step={0.01} defaultValue={question.weight} className={`${inputClass} w-20`} />
                      </label>
                    )}
                    <label className="flex items-center gap-1">
                      Position
                      <input name="position" type="number" step={1} defaultValue={question.position} className={`${inputClass} w-16`} />
                    </label>
                  </div>
                </ActionForm>
              ) : (
                <div>
                  <p className="text-xs uppercase text-gray-500">{categoryLabels[question.category]}</p>
                  <p className="font-medium">{question.prompt}</p>
                  {scored && <p className="text-xs text-gray-500">Weight {question.weight}</p>}
                </div>
              )}

              <ul className="flex flex-col gap-2 border-l-2 border-gray-100 pl-3">
                {options.map((option) => (
                  <li key={option.id} className="flex flex-wrap items-start gap-2 text-sm">
                    {isAdmin ? (
                      <>
                        <ActionForm
                          action={updateOption.bind(null, template.id, option.id, scored)}
                          submitLabel="Save"
                          variant="secondary"
                          className="flex flex-wrap items-center gap-2"
                        >
                          <input name="label" defaultValue={option.label} required className={`${inputClass} w-72`} />
                          {scored && (
                            <label className="flex items-center gap-1">
                              <input name="points" type="number" min={0} step={0.01} defaultValue={option.points} className={`${inputClass} w-20`} />
                              pts
                            </label>
                          )}
                        </ActionForm>
                        <ActionForm
                          action={deleteOption.bind(null, template.id, option.id)}
                          submitLabel="Remove"
                          variant="danger"
                          confirm="Remove this option?"
                          className="flex items-center gap-2"
                        />
                      </>
                    ) : (
                      <span>
                        {option.label}
                        {scored && <span className="text-gray-500"> · {option.points} pts</span>}
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              {isAdmin && (
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <ActionForm
                    action={addOption.bind(null, template.id, question.id, scored)}
                    submitLabel="Add option"
                    variant="secondary"
                    className="flex flex-wrap items-center gap-2 text-sm"
                  >
                    <input name="label" placeholder="New option" required className={`${inputClass} w-64`} />
                    {scored && (
                      <input name="points" type="number" min={0} step={0.01} placeholder="pts" required className={`${inputClass} w-20`} />
                    )}
                  </ActionForm>
                  <ActionForm
                    action={deleteQuestion.bind(null, template.id, question.id)}
                    submitLabel="Delete question"
                    variant="danger"
                    confirm="Delete this question and its options?"
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {isAdmin && (
        <section className="flex max-w-lg flex-col gap-2">
          <h2 className="text-lg font-semibold">Add question</h2>
          <ActionForm action={addQuestion.bind(null, template.id, scored)} submitLabel="Add question">
            <textarea name="prompt" rows={2} placeholder="Question" required className={inputClass} />
            <div className="flex flex-wrap gap-3 text-sm">
              <CategorySelect />
              {scored && (
                <label className="flex items-center gap-1">
                  Weight
                  <input name="weight" type="number" min={0.01} step={0.01} defaultValue={1} className={`${inputClass} w-20`} />
                </label>
              )}
            </div>
            <label className="flex flex-col gap-1 text-sm">
              {scored ? "Options, one per line as “label | points”. Include N/A if it applies." : "Options, one per line"}
              <textarea
                name="options"
                rows={4}
                required
                placeholder={scored ? "None | 0\nSome | 5\nExtensive | 10\nN/A | 0" : "Yes\nNo"}
                className={`${inputClass} font-mono text-xs`}
              />
            </label>
          </ActionForm>
        </section>
      )}

      {isAdmin && (
        <section className="border-t border-gray-200 pt-4">
          <ActionForm
            action={deleteTemplate.bind(null, template.id)}
            submitLabel="Delete questionnaire"
            pendingLabel="Deleting…"
            variant="danger"
            confirm="Delete this questionnaire? This fails if any assessment uses it."
          />
        </section>
      )}
    </div>
  );
}
