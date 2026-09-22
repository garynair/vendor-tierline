import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ScoreResult } from "@/lib/scoring";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string; submissionId: string }>;
}) {
  const { id, submissionId } = await params;
  const supabase = await createClient();

  const { data: score } = await supabase
    .from("scores")
    .select("score, factor_breakdown, summary")
    .eq("submission_id", submissionId)
    .single();

  if (!score) {
    notFound();
  }

  const breakdown = score.factor_breakdown as ScoreResult["factor_breakdown"];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Score: {score.score}/100</h1>
        <p className="mt-2 text-sm text-gray-700">{score.summary}</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between rounded border border-gray-200 px-4 py-2">
          <span className="text-sm">
            Tier: expected <strong>{breakdown.tier.expected}</strong>, submitted{" "}
            <strong>{breakdown.tier.submitted}</strong>
          </span>
          <span className="text-sm">
            {breakdown.tier.matched ? "✓" : "✗"} {breakdown.tier.points} pts
          </span>
        </div>

        {breakdown.factors.map((factor) => (
          <div
            key={factor.key}
            className="flex items-center justify-between rounded border border-gray-200 px-4 py-2"
          >
            <span className="text-sm">{factor.label}</span>
            <span className="text-sm">
              {factor.matched ? "✓" : "✗"} {factor.points}/{factor.weight} pts
            </span>
          </div>
        ))}
      </div>

      <Link href={`/dashboard/scenarios/${id}`} className="text-sm underline">
        Try again
      </Link>
    </div>
  );
}
