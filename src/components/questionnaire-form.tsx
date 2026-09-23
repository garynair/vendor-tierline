"use client";

import { useState, useTransition } from "react";
import { categoryLabels } from "@/lib/labels";
import type { Enums } from "@/lib/supabase/database.types";

export type QuestionnaireQuestion = {
  id: string;
  category: Enums<"question_category">;
  prompt: string;
  options: { id: string; label: string }[];
};

type Result = { error?: string } | undefined;

// Shared by the vendor token page and internal fill mode. Each choice is
// saved as soon as it's picked, so a vendor can leave and resume.
export function QuestionnaireForm({
  questions,
  initialAnswers,
  saveAnswer,
  submit,
  submitLabel = "Submit questionnaire",
}: {
  questions: QuestionnaireQuestion[];
  initialAnswers: Record<string, string>;
  saveAnswer: (questionId: string, optionId: string) => Promise<Result>;
  submit: () => Promise<Result>;
  submitLabel?: string;
}) {
  const [answers, setAnswers] = useState(initialAnswers);
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();

  const answeredCount = questions.filter((question) => answers[question.id]).length;
  const complete = answeredCount === questions.length;

  async function choose(questionId: string, optionId: string) {
    const previous = answers[questionId];
    setAnswers((current) => ({ ...current, [questionId]: optionId }));
    setSavingId(questionId);
    const result = await saveAnswer(questionId, optionId);
    setSavingId((current) => (current === questionId ? null : current));
    if (result?.error) {
      setAnswers((current) => {
        const next = { ...current };
        if (previous) next[questionId] = previous;
        else delete next[questionId];
        return next;
      });
      setSaveErrors((current) => ({ ...current, [questionId]: result.error! }));
    } else {
      setSaveErrors((current) => {
        const next = { ...current };
        delete next[questionId];
        return next;
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex flex-col gap-5">
        {questions.map((question, index) => (
          <li key={question.id} className="rounded border border-gray-200 p-4">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1">
                <span className="block text-xs uppercase text-gray-500">
                  {index + 1}. {categoryLabels[question.category]}
                </span>
                <span className="font-medium">{question.prompt}</span>
              </legend>
              {question.options.map((option) => (
                <label key={option.id} className="flex items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name={question.id}
                    value={option.id}
                    checked={answers[question.id] === option.id}
                    disabled={submitting}
                    onChange={() => choose(question.id, option.id)}
                    className="mt-0.5"
                  />
                  {option.label}
                </label>
              ))}
              {savingId === question.id && <p className="text-xs text-gray-500">Saving…</p>}
              {saveErrors[question.id] && (
                <p className="text-xs text-red-600">{saveErrors[question.id]}</p>
              )}
            </fieldset>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-2 border-t border-gray-200 pt-4">
        <p className="text-sm text-gray-600">
          {answeredCount} of {questions.length} answered. Answers save automatically.
        </p>
        {submitError && <p className="text-sm text-red-600">{submitError}</p>}
        <div>
          <button
            type="button"
            disabled={!complete || submitting || savingId !== null}
            onClick={() => {
              if (!window.confirm("Submit? Answers can't be changed afterwards.")) return;
              setSubmitError(null);
              startSubmit(async () => {
                const result = await submit();
                if (result?.error) setSubmitError(result.error);
              });
            }}
            className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {submitting ? "Submitting…" : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
