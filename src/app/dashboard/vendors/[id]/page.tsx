import Link from "next/link";
import { notFound } from "next/navigation";
import { getMembership } from "@/lib/membership";
import { engagementTierStatus, mostSevereTier } from "@/lib/engagement-tiers";
import { statusLabels } from "@/lib/labels";
import { ActionForm } from "@/components/action-form";
import { TierBadge } from "@/components/tier-badge";
import { addEngagement, setEngagementActive } from "../actions";

const inputClass = "rounded border border-gray-300 px-3 py-2 font-normal";

export default async function VendorPage({ params }: PageProps<"/dashboard/vendors/[id]">) {
  const { id } = await params;
  const { supabase, isStaff } = await getMembership();

  const { data: vendor } = await supabase
    .from("vendors")
    .select("id, name, website")
    .eq("id", id)
    .maybeSingle();
  if (!vendor) notFound();

  const { data: engagements } = await supabase
    .from("vendor_engagements")
    .select("id, name, description, is_active")
    .eq("vendor_id", id)
    .order("created_at");

  const engagementIds = (engagements ?? []).map((engagement) => engagement.id);
  const [{ data: assessments }, { data: scores }, { data: tiers }] = await Promise.all([
    supabase
      .from("assessments")
      .select("id, engagement_id, status, created_at")
      .eq("type", "tiering")
      .in("engagement_id", engagementIds),
    supabase.from("assessment_scores").select("assessment_id, final_tier_id"),
    supabase.from("risk_tiers").select("id, name, rank"),
  ]);

  const statusByEngagement = engagementTierStatus(assessments ?? [], scores ?? [], tiers ?? []);
  const summaryTier = mostSevereTier(
    (engagements ?? [])
      .filter((engagement) => engagement.is_active)
      .map((engagement) => statusByEngagement.get(engagement.id)?.tier ?? null)
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase text-gray-500">Vendor</p>
          <h1 className="text-xl font-semibold">{vendor.name}</h1>
          {vendor.website && (
            <a href={vendor.website} className="text-sm text-gray-600 underline" rel="noreferrer">
              {vendor.website}
            </a>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Summary tier</p>
          <TierBadge tier={summaryTier} />
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Engagements</h2>
        <ul className="flex flex-col gap-3">
          {(engagements ?? []).map((engagement) => {
            const status = statusByEngagement.get(engagement.id);
            return (
              <li key={engagement.id} className="rounded border border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between">
                  <Link
                    href={`/dashboard/engagements/${engagement.id}`}
                    className={`font-medium hover:underline ${engagement.is_active ? "" : "text-gray-400"}`}
                  >
                    {engagement.name}
                    {!engagement.is_active && " (inactive)"}
                  </Link>
                  <TierBadge tier={status?.tier} />
                </div>
                {engagement.description && (
                  <p className="mt-1 text-sm text-gray-600">{engagement.description}</p>
                )}
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>{status?.latest ? statusLabels[status.latest.status] : "No assessment yet"}</span>
                  {isStaff && (
                    <ActionForm
                      action={setEngagementActive.bind(null, engagement.id, !engagement.is_active)}
                      submitLabel={engagement.is_active ? "Mark inactive" : "Reactivate"}
                      variant="secondary"
                      className="flex items-center gap-2"
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {isStaff && (
        <section className="flex max-w-lg flex-col gap-3">
          <div>
            <h2 className="text-lg font-semibold">Add engagement</h2>
            <p className="text-sm text-gray-600">
              An engagement is one service or relationship with this vendor. Each engagement gets
              its own tiering questionnaire, because the same vendor can carry very different risk
              for different services.
            </p>
          </div>
          <ActionForm action={addEngagement.bind(null, vendor.id)} submitLabel="Add engagement">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Service or engagement name
              <input
                name="name"
                required
                placeholder="e.g. Payroll processing, Cloud hosting, Customer support"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              What the vendor does for us
              <textarea
                name="description"
                rows={3}
                placeholder="e.g. Runs bi-weekly payroll for all US employees; receives SSNs and bank details via SFTP; no access to our network."
                className={inputClass}
              />
              <span className="text-xs font-normal text-gray-500">
                Optional. Note the data it handles and the systems it can access, so reviewers have
                context when confirming the tier.
              </span>
            </label>
          </ActionForm>
        </section>
      )}
    </div>
  );
}
