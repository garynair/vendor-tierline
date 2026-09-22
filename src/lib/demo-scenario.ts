import type { Rubric } from "@/lib/scoring";

const rubric: Rubric = {
  tier_options: ["low", "medium", "high", "critical"],
  expected_tier: "high",
  tier_weight: 40,
  factors: [
    {
      key: "data_sensitivity",
      label: "Data sensitivity the vendor will handle",
      weight: 15,
      keywords: ["pii", "payroll", "sensitive", "personal data"],
    },
    {
      key: "access_scope",
      label: "Scope of system access granted",
      weight: 15,
      keywords: [
        "read/write",
        "production",
        "access scope",
        "privileged access",
        "database access",
      ],
    },
    {
      key: "certification_gap",
      label: "Gap between certification held and expected",
      weight: 15,
      keywords: ["soc 2 type i", "type ii", "attestation", "certification"],
    },
    {
      key: "incident_history",
      label: "Vendor's security incident track record",
      weight: 15,
      keywords: ["incident", "breach", "remediat", "track record"],
    },
  ],
};

export const demoVendorRiskScenario = {
  type: "vendor_risk_tiering" as const,
  title: "New Cloud HR Vendor — Risk Tier Assessment",
  brief:
    "Your organization is onboarding TalentFlow HR, a cloud vendor that will host and process employee PII and payroll data. " +
    "TalentFlow will connect via API with read/write access to your production HRIS database, authenticated through SSO. " +
    "They hold a SOC 2 Type I report (not yet Type II) and disclosed one low-severity data exposure incident 18 months ago, " +
    "which they remediated within 72 hours. Your organization operates under GDPR and several US state privacy laws.\n\n" +
    "Assign a risk tier (low / medium / high / critical) to this vendor and justify your rating.",
  context: {
    vendor_name: "TalentFlow HR",
    data_types: ["PII", "payroll"],
    access_level: "read/write to production HRIS",
    certifications: ["SOC 2 Type I"],
    incident_history: "one disclosed low-severity data exposure, remediated in 72 hours",
    regulatory_scope: ["GDPR", "US state privacy laws"],
  },
  rubric,
};
