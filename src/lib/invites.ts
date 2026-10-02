import type { MemberRole } from "@/lib/membership";

// Set by /join/[token] so the invite survives sign-up and email confirmation.
export const PENDING_INVITE_COOKIE = "vt_pending_invite";

export const roleLabels: Record<MemberRole, string> = {
  admin: "Admin",
  practitioner: "Practitioner",
  learner: "Read-only",
};

export const roleDescriptions: Record<MemberRole, string> = {
  admin: "Everything a practitioner can do, plus risk tiers, questionnaires, and users & roles.",
  practitioner: "Adds vendors and engagements, sends questionnaires, reviews and overrides tiers.",
  learner: "Views vendors, assessments, and Insights. Can't change anything.",
};
