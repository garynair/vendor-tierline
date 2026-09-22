export interface RubricFactor {
  key: string;
  label: string;
  weight: number;
  keywords: string[];
}

export interface Rubric {
  tier_options: string[];
  expected_tier: string;
  tier_weight: number;
  factors: RubricFactor[];
}

export interface SubmissionAnswer {
  tier: string;
  rationale: string;
}

export interface FactorVerdict {
  key: string;
  label: string;
  weight: number;
  matched: boolean;
  points: number;
}

export interface ScoreResult {
  score: number;
  factor_breakdown: {
    tier: { expected: string; submitted: string; matched: boolean; points: number };
    factors: FactorVerdict[];
  };
  summary: string;
}

export function scoreRubricSubmission(rubric: Rubric, answer: SubmissionAnswer): ScoreResult {
  const rationale = answer.rationale.toLowerCase();

  const tierMatched = answer.tier === rubric.expected_tier;
  const tierPoints = tierMatched ? rubric.tier_weight : 0;

  const factors: FactorVerdict[] = rubric.factors.map((factor) => {
    const matched = factor.keywords.some((keyword) => rationale.includes(keyword));
    return {
      key: factor.key,
      label: factor.label,
      weight: factor.weight,
      matched,
      points: matched ? factor.weight : 0,
    };
  });

  const score = tierPoints + factors.reduce((sum, f) => sum + f.points, 0);

  const missedFactors = factors.filter((f) => !f.matched).map((f) => f.label);
  const summary = tierMatched
    ? missedFactors.length === 0
      ? "Correct tier, and your rationale addressed every factor a reviewer would look for."
      : `Correct tier. Your rationale didn't clearly address: ${missedFactors.join(", ")}.`
    : `Reviewer expected a "${rubric.expected_tier}" tier; you submitted "${answer.tier}". Review the factors below before re-tiering.`;

  return {
    score,
    factor_breakdown: {
      tier: {
        expected: rubric.expected_tier,
        submitted: answer.tier,
        matched: tierMatched,
        points: tierPoints,
      },
      factors,
    },
    summary,
  };
}
