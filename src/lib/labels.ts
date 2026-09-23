import type { Enums } from "@/lib/supabase/database.types";

export const categoryLabels: Record<Enums<"question_category">, string> = {
  data_sensitivity: "Data sensitivity",
  regulatory_exposure: "Regulatory exposure",
  cloud_infrastructure: "Cloud / infrastructure",
  fourth_party: "Fourth-party exposure",
  breach_history: "Breach history",
  service_criticality: "Service criticality",
  access_level: "Access level",
  other: "Other",
};

export const statusLabels: Record<Enums<"assessment_status">, string> = {
  draft: "Draft",
  sent: "Sent to vendor",
  in_progress: "In progress",
  submitted: "Awaiting review",
  reviewed: "Reviewed",
};

export const typeLabels: Record<Enums<"questionnaire_type">, string> = {
  tiering: "Tiering",
  followup: "Follow-up",
};

// Rank 1 is the most severe tier.
export function tierBadgeClass(rank: number | undefined) {
  switch (rank) {
    case 1:
      return "bg-red-100 text-red-800";
    case 2:
      return "bg-orange-100 text-orange-800";
    case 3:
      return "bg-yellow-100 text-yellow-800";
    case undefined:
      return "bg-gray-100 text-gray-600";
    default:
      return "bg-green-100 text-green-800";
  }
}

export function formatScore(score: number) {
  return `${Math.round(score * 100)}%`;
}

export function formatDate(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "";
}
