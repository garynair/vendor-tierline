import Link from "next/link";
import { getMembership } from "@/lib/membership";
import { typeLabels } from "@/lib/labels";
import { ActionForm } from "@/components/action-form";
import { TierBadge } from "@/components/tier-badge";
import { createTemplate, loadDefaultTemplates, setTierMapping, updateTier } from "./actions";

const inputClass = "rounded border border-gray-300 px-2 py-1.5 font-normal";

export default async function SettingsPage() {
  const { supabase, isAdmin } = await getMembership();

  const [{ data: tiers }, { data: templates }, { data: questions }, { data: mappings }] = await Promise.all([
    supabase.from("risk_tiers").select("id, name, rank, min_score").order("rank"),
    supabase.from("questionnaire_templates").select("id, name, type, description").order("type").order("name"),
    supabase.from("questionnaire_questions").select("template_id"),
    supabase.from("template_tier_mappings").select("tier_id, template_id"),
  ]);

  const questionCount = new Map<string, number>();
  for (const question of questions ?? []) {
    questionCount.set(question.template_id, (questionCount.get(question.template_id) ?? 0) + 1);
  }
  const mappedTemplate = new Map((mappings ?? []).map((mapping) => [mapping.tier_id, mapping.template_id]));
  const followupTemplates = (templates ?? []).filter((template) => template.type === "followup");
  const hasTiering = (templates ?? []).some((template) => template.type === "tiering");

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        {!isAdmin && <p className="text-sm text-gray-600">Only admins can change these settings.</p>}
      </div>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">Risk tiers</h2>
          <p className="text-sm text-gray-600">
            A tiering score maps to the tier with the highest threshold it meets, so keep one tier at
            0%. Each tier can have a default follow-up questionnaire.
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-gray-500">
              <th className="py-2">Tier</th>
              <th className="py-2">Name and threshold</th>
              <th className="py-2">Default follow-up</th>
            </tr>
          </thead>
          <tbody>
            {(tiers ?? []).map((tier) => (
              <tr key={tier.id} className="border-t border-gray-100 align-top">
                <td className="py-3">
                  <TierBadge tier={tier} />
                </td>
                <td className="py-3">
                  {isAdmin ? (
                    <ActionForm
                      action={updateTier.bind(null, tier.id)}
                      submitLabel="Save"
                      variant="secondary"
                      className="flex flex-wrap items-center gap-2"
                    >
                      <input name="name" defaultValue={tier.name} required className={`${inputClass} w-28`} />
                      <label className="flex items-center gap-1">
                        score ≥
                        <input
                          name="min_score_percent"
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          defaultValue={Math.round(tier.min_score * 10000) / 100}
                          className={`${inputClass} w-20`}
                        />
                        %
                      </label>
                    </ActionForm>
                  ) : (
                    <span>score ≥ {Math.round(tier.min_score * 100)}%</span>
                  )}
                </td>
                <td className="py-3">
                  {isAdmin ? (
                    <ActionForm
                      action={setTierMapping.bind(null, tier.id)}
                      submitLabel="Save"
                      variant="secondary"
                      className="flex flex-wrap items-center gap-2"
                    >
                      <select name="template_id" defaultValue={mappedTemplate.get(tier.id) ?? ""} className={inputClass}>
                        <option value="">None</option>
                        {followupTemplates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                    </ActionForm>
                  ) : (
                    <span>
                      {followupTemplates.find((template) => template.id === mappedTemplate.get(tier.id))?.name ?? "None"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Questionnaires</h2>
        <ul className="flex flex-col gap-2">
          {(templates ?? []).map((template) => (
            <li key={template.id} className="flex items-center justify-between rounded border border-gray-200 px-4 py-3">
              <div>
                <Link href={`/dashboard/settings/templates/${template.id}`} className="font-medium hover:underline">
                  {template.name}
                </Link>
                {template.description && <p className="text-sm text-gray-600">{template.description}</p>}
              </div>
              <span className="whitespace-nowrap text-xs text-gray-500">
                {typeLabels[template.type]} · {questionCount.get(template.id) ?? 0} questions
              </span>
            </li>
          ))}
        </ul>

        {isAdmin && (templates ?? []).length === 0 && (
          <div className="flex flex-col gap-2 rounded border border-dashed border-gray-300 p-4">
            <p className="text-sm text-gray-600">
              Start from the default tiering questionnaire (seven risk factors) plus enhanced and
              baseline follow-ups mapped to the default tiers. Everything stays editable.
            </p>
            <ActionForm action={loadDefaultTemplates} submitLabel="Load default questionnaires" pendingLabel="Loading…" />
          </div>
        )}

        {isAdmin && (
          <ActionForm action={createTemplate} submitLabel="Create questionnaire" className="mt-2 flex max-w-lg flex-col gap-2">
            <p className="text-sm font-medium">New questionnaire</p>
            <select name="type" defaultValue={hasTiering ? "followup" : "tiering"} className={inputClass}>
              {!hasTiering && <option value="tiering">Tiering (one per organization)</option>}
              <option value="followup">Follow-up</option>
            </select>
            <input name="name" placeholder="Name" required className={inputClass} />
            <input name="description" placeholder="Description (optional)" className={inputClass} />
          </ActionForm>
        )}
      </section>
    </div>
  );
}
