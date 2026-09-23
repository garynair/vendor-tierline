import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Enums } from "@/lib/supabase/database.types";

type SeedQuestion = {
  category: Enums<"question_category">;
  prompt: string;
  weight?: number;
  options: [label: string, points: number][];
};

type SeedTemplate = {
  name: string;
  description: string;
  questions: SeedQuestion[];
};

// Starting point for every org; admins edit it under Settings. Each question
// tops out at 10 points so weights alone decide how much a factor counts.
export const defaultTieringTemplate: SeedTemplate = {
  name: "Vendor risk tiering",
  description: "Scores the engagement's inherent risk to pick its tier and follow-up questionnaire.",
  questions: [
    {
      category: "data_sensitivity",
      prompt: "What is the most sensitive data this vendor will store, process, or access for us?",
      weight: 3,
      options: [
        ["No company or customer data", 0],
        ["Internal business data only", 3],
        ["Confidential data or personal data (PII)", 7],
        ["Regulated data (PHI, cardholder, financial account data)", 10],
      ],
    },
    {
      category: "regulatory_exposure",
      prompt: "Which compliance obligations apply to this engagement?",
      weight: 2,
      options: [
        ["None", 0],
        ["Contractual obligations only", 3],
        ["One regulation or framework (e.g. GDPR, SOX, HIPAA)", 7],
        ["Multiple regulations or frameworks", 10],
      ],
    },
    {
      category: "cloud_infrastructure",
      prompt: "How is the service hosted?",
      weight: 2,
      options: [
        ["N/A: software we install and operate ourselves", 0],
        ["Vendor-managed SaaS on a major cloud provider", 5],
        ["Vendor-operated data centers", 7],
        ["Unknown or not disclosed", 10],
      ],
    },
    {
      category: "fourth_party",
      prompt: "Does the vendor rely on subcontractors (fourth parties) that handle our data or deliver the service?",
      weight: 1,
      options: [
        ["No", 0],
        ["Yes, disclosed and assessed by the vendor", 4],
        ["Yes, but not assessed", 8],
        ["Unknown", 10],
      ],
    },
    {
      category: "breach_history",
      prompt: "Has the vendor had a security incident or data breach in the last three years?",
      weight: 2,
      options: [
        ["No known incidents", 0],
        ["Minor incident, fully remediated", 4],
        ["Unknown", 7],
        ["Material breach", 10],
      ],
    },
    {
      category: "service_criticality",
      prompt: "How critical is this service to our operations?",
      weight: 3,
      options: [
        ["Low: easy workaround if unavailable", 0],
        ["Moderate: internal disruption only", 4],
        ["High: outage affects customers", 7],
        ["Mission critical: no viable workaround", 10],
      ],
    },
    {
      category: "access_level",
      prompt: "What access will the vendor have to our systems or network?",
      weight: 3,
      options: [
        ["None", 0],
        ["Limited, non-privileged user access", 4],
        ["Privileged or administrative access", 8],
        ["Persistent network connectivity (VPN, site-to-site)", 10],
      ],
    },
  ],
};

const yesNo: [string, number][] = [
  ["Yes", 0],
  ["No", 0],
];

export const defaultFollowupTemplates: (SeedTemplate & { tiers: string[] })[] = [
  {
    name: "Enhanced due diligence",
    description: "Security due diligence for Critical and High tier engagements.",
    tiers: ["Critical", "High"],
    questions: [
      {
        category: "other",
        prompt: "Can you provide a current SOC 2 Type II report or ISO 27001 certificate?",
        options: [
          ["Yes", 0],
          ["In progress", 0],
          ["No", 0],
        ],
      },
      {
        category: "other",
        prompt: "Do you commission an independent penetration test at least annually?",
        options: yesNo,
      },
      {
        category: "access_level",
        prompt: "Is multi-factor authentication enforced for all access to systems holding our data?",
        options: [
          ["Yes", 0],
          ["Partially", 0],
          ["No", 0],
        ],
      },
      {
        category: "breach_history",
        prompt: "Will you notify us of a security incident affecting our data within 72 hours?",
        options: yesNo,
      },
      {
        category: "service_criticality",
        prompt: "Do you maintain a business continuity and disaster recovery plan?",
        options: [
          ["Yes, tested in the last 12 months", 0],
          ["Yes, not tested recently", 0],
          ["No", 0],
        ],
      },
      {
        category: "fourth_party",
        prompt: "Do you assess the security of subcontractors that handle our data?",
        options: [
          ["Yes", 0],
          ["No", 0],
          ["N/A: no subcontractors", 0],
        ],
      },
    ],
  },
  {
    name: "Baseline due diligence",
    description: "Lightweight checks for Medium and Low tier engagements.",
    tiers: ["Medium", "Low"],
    questions: [
      {
        category: "other",
        prompt: "Do you have a written information security policy?",
        options: yesNo,
      },
      {
        category: "access_level",
        prompt: "Is multi-factor authentication enforced for access to systems holding our data?",
        options: yesNo,
      },
      {
        category: "breach_history",
        prompt: "Will you notify us of a security incident affecting our data?",
        options: yesNo,
      },
    ],
  },
];

async function insertTemplate(
  supabase: SupabaseClient<Database>,
  orgId: string,
  type: Enums<"questionnaire_type">,
  template: SeedTemplate
) {
  const { data: created, error } = await supabase
    .from("questionnaire_templates")
    .insert({ organization_id: orgId, type, name: template.name, description: template.description })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { data: questions, error: questionError } = await supabase
    .from("questionnaire_questions")
    .insert(
      template.questions.map((question, index) => ({
        organization_id: orgId,
        template_id: created.id,
        category: question.category,
        prompt: question.prompt,
        weight: question.weight ?? 1,
        position: index + 1,
      }))
    )
    .select("id, position");
  if (questionError) throw new Error(questionError.message);

  const idByPosition = new Map(questions.map((question) => [question.position, question.id]));
  const { error: optionError } = await supabase.from("question_options").insert(
    template.questions.flatMap((question, index) =>
      question.options.map(([label, points], optionIndex) => ({
        organization_id: orgId,
        question_id: idByPosition.get(index + 1)!,
        label,
        points,
        position: optionIndex + 1,
      }))
    )
  );
  if (optionError) throw new Error(optionError.message);

  return created.id;
}

// Creates the default tiering questionnaire and follow-ups, mapped to the
// default tiers by name. Requires the caller to be an org admin.
export async function seedDefaultTemplates(supabase: SupabaseClient<Database>, orgId: string) {
  await insertTemplate(supabase, orgId, "tiering", defaultTieringTemplate);

  const { data: tiers, error } = await supabase
    .from("risk_tiers")
    .select("id, name")
    .eq("organization_id", orgId);
  if (error) throw new Error(error.message);
  const tierIdByName = new Map(tiers.map((tier) => [tier.name, tier.id]));

  for (const followup of defaultFollowupTemplates) {
    const templateId = await insertTemplate(supabase, orgId, "followup", followup);
    const mappings = followup.tiers
      .map((name) => tierIdByName.get(name))
      .filter((tierId): tierId is string => Boolean(tierId))
      .map((tierId) => ({ tier_id: tierId, organization_id: orgId, template_id: templateId }));

    if (mappings.length > 0) {
      const { error: mappingError } = await supabase
        .from("template_tier_mappings")
        .upsert(mappings, { onConflict: "tier_id" });
      if (mappingError) throw new Error(mappingError.message);
    }
  }
}
