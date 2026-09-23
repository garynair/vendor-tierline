"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { seedDefaultTemplates } from "@/lib/default-templates";

export async function createOrganization(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const name = String(formData.get("name")).trim();
  if (!name) {
    return { error: "Organization name is required." };
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const orgId = randomUUID();

  const { error: orgError } = await supabase
    .from("organizations")
    .insert({ id: orgId, name, slug: `${slug}-${user.id.slice(0, 8)}` });

  if (orgError) {
    return { error: orgError.message };
  }

  const { error: membershipError } = await supabase
    .from("memberships")
    .insert({ organization_id: orgId, user_id: user.id, role: "admin" });

  if (membershipError) {
    return { error: membershipError.message };
  }

  // Risk tiers are seeded by a database trigger; questionnaires start from
  // the defaults. A failure here isn't fatal: Settings offers to load them.
  try {
    await seedDefaultTemplates(supabase, orgId);
  } catch {}

  redirect("/dashboard");
}
