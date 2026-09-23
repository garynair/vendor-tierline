import type { Tables } from "@/lib/supabase/database.types";

type Assessment = Pick<Tables<"assessments">, "id" | "engagement_id" | "status" | "created_at">;
type Score = Pick<Tables<"assessment_scores">, "assessment_id" | "final_tier_id">;
type Tier = Pick<Tables<"risk_tiers">, "id" | "name" | "rank">;

export type EngagementTierStatus = {
  latest: Assessment | null;
  tier: Tier | null;
};

// An engagement's tier is the reviewer's final tier on its most recent
// reviewed tiering assessment. `latest` is the newest tiering assessment in
// any status, for showing work in progress.
export function engagementTierStatus(
  tieringAssessments: Assessment[],
  scores: Score[],
  tiers: Tier[]
) {
  const finalTierByAssessment = new Map(scores.map((score) => [score.assessment_id, score.final_tier_id]));
  const tierById = new Map(tiers.map((tier) => [tier.id, tier]));
  const byEngagement = new Map<string, EngagementTierStatus>();

  const newestFirst = [...tieringAssessments].sort((a, b) => b.created_at.localeCompare(a.created_at));
  for (const assessment of newestFirst) {
    const entry = byEngagement.get(assessment.engagement_id) ?? { latest: assessment, tier: null };
    if (!entry.tier && assessment.status === "reviewed") {
      const tierId = finalTierByAssessment.get(assessment.id);
      entry.tier = (tierId && tierById.get(tierId)) || null;
    }
    byEngagement.set(assessment.engagement_id, entry);
  }
  return byEngagement;
}

// Vendor summary tier: the most severe tier across its active engagements.
export function mostSevereTier(tiers: (Tier | null)[]) {
  return tiers.reduce<Tier | null>(
    (worst, tier) => (tier && (!worst || tier.rank < worst.rank) ? tier : worst),
    null
  );
}
