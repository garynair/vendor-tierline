import { tierBadgeClass } from "@/lib/labels";

export function TierBadge({ tier }: { tier: { name: string; rank: number } | null | undefined }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${tierBadgeClass(tier?.rank)}`}>
      {tier?.name ?? "Not tiered"}
    </span>
  );
}
