import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: scenarios } = await supabase
    .from("scenarios")
    .select("id, title, type, created_at")
    .order("created_at", { ascending: true });

  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, scenario_id, scores(score)")
    .eq("user_id", user!.id);

  const bestByScenario = new Map<string, { submissionId: string; score: number }>();
  for (const submission of submissions ?? []) {
    const score = (submission.scores as unknown as { score: number } | null)?.score;
    if (score === undefined) continue;
    const existing = bestByScenario.get(submission.scenario_id);
    if (!existing || score > existing.score) {
      bestByScenario.set(submission.scenario_id, { submissionId: submission.id, score });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Scenarios</h1>
      <ul className="flex flex-col gap-3">
        {(scenarios ?? []).map((scenario) => {
          const best = bestByScenario.get(scenario.id);
          return (
            <li
              key={scenario.id}
              className="flex items-center justify-between rounded border border-gray-200 px-4 py-3"
            >
              <div>
                <p className="font-medium">{scenario.title}</p>
                <p className="text-xs uppercase text-gray-500">{scenario.type.replace(/_/g, " ")}</p>
              </div>
              <div className="flex items-center gap-4">
                {best && <span className="text-sm text-gray-500">Best: {best.score}/100</span>}
                <Link href={`/dashboard/scenarios/${scenario.id}`} className="text-sm underline">
                  {best ? "Retry" : "Attempt"}
                </Link>
              </div>
            </li>
          );
        })}
        {(scenarios ?? []).length === 0 && (
          <p className="text-sm text-gray-500">No scenarios yet.</p>
        )}
      </ul>
    </div>
  );
}
