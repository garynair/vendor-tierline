import Link from "next/link";
import { getMembership } from "@/lib/membership";
import { engagementTierStatus, mostSevereTier } from "@/lib/engagement-tiers";
import { statusLabels } from "@/lib/labels";
import { TierBadge } from "@/components/tier-badge";
import { ReadOnlyAction } from "@/components/read-only-action";

export default async function VendorsPage() {
  const { supabase, isStaff } = await getMembership();

  const [{ data: vendors }, { data: engagements }, { data: assessments }, { data: scores }, { data: tiers }] =
    await Promise.all([
      supabase.from("vendors").select("id, name, website").order("name"),
      supabase.from("vendor_engagements").select("id, vendor_id, name, is_active"),
      supabase.from("assessments").select("id, engagement_id, status, created_at").eq("type", "tiering"),
      supabase.from("assessment_scores").select("assessment_id, final_tier_id"),
      supabase.from("risk_tiers").select("id, name, rank"),
    ]);

  const statusByEngagement = engagementTierStatus(assessments ?? [], scores ?? [], tiers ?? []);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Vendors</h1>
        {isStaff ? (
          <Link href="/dashboard/vendors/new" className="rounded bg-black px-3 py-2 text-sm text-white">
            Add vendor
          </Link>
        ) : (
          <ReadOnlyAction label="Add vendor" />
        )}
      </div>

      <ul className="flex flex-col gap-3">
        {(vendors ?? []).map((vendor) => {
          const vendorEngagements = (engagements ?? []).filter((engagement) => engagement.vendor_id === vendor.id);
          const summaryTier = mostSevereTier(
            vendorEngagements
              .filter((engagement) => engagement.is_active)
              .map((engagement) => statusByEngagement.get(engagement.id)?.tier ?? null)
          );

          return (
            <li key={vendor.id} className="rounded border border-gray-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <Link href={`/dashboard/vendors/${vendor.id}`} className="font-medium hover:underline">
                  {vendor.name}
                </Link>
                <TierBadge tier={summaryTier} />
              </div>
              <ul className="mt-2 flex flex-col gap-1">
                {vendorEngagements.map((engagement) => {
                  const status = statusByEngagement.get(engagement.id);
                  return (
                    <li key={engagement.id} className="flex items-center justify-between text-sm">
                      <Link
                        href={`/dashboard/engagements/${engagement.id}`}
                        className={`hover:underline ${engagement.is_active ? "" : "text-gray-400"}`}
                      >
                        {engagement.name}
                        {!engagement.is_active && " (inactive)"}
                      </Link>
                      <span className="text-xs text-gray-500">
                        {status?.latest ? statusLabels[status.latest.status] : "No assessment yet"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
        {(vendors ?? []).length === 0 && (
          <p className="text-sm text-gray-500">
            No vendors yet.{isStaff && " Add one to start tiering its engagements."}
          </p>
        )}
      </ul>
    </section>
  );
}
