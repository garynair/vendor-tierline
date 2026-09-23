"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMembership } from "@/lib/membership";
import { friendlyError } from "@/lib/errors";
import type { ActionState } from "@/components/action-form";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function createVendor(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, orgId } = await getMembership();

  const name = text(formData, "name");
  const engagementName = text(formData, "engagement_name");
  if (!name || !engagementName) {
    return { error: "Vendor name and the first engagement are required." };
  }

  const { data: vendor, error } = await supabase
    .from("vendors")
    .insert({ organization_id: orgId, name, website: text(formData, "website") || null })
    .select("id")
    .single();
  if (error) return { error: friendlyError(error) };

  const { error: engagementError } = await supabase.from("vendor_engagements").insert({
    organization_id: orgId,
    vendor_id: vendor.id,
    name: engagementName,
    description: text(formData, "engagement_description") || null,
  });
  if (engagementError) return { error: friendlyError(engagementError) };

  redirect(`/dashboard/vendors/${vendor.id}`);
}

export async function addEngagement(
  vendorId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, orgId } = await getMembership();

  const name = text(formData, "name");
  if (!name) return { error: "Engagement name is required." };

  const { error } = await supabase.from("vendor_engagements").insert({
    organization_id: orgId,
    vendor_id: vendorId,
    name,
    description: text(formData, "description") || null,
  });
  if (error) return { error: friendlyError(error) };

  revalidatePath(`/dashboard/vendors/${vendorId}`);
  return { message: "Engagement added." };
}

export async function setEngagementActive(
  engagementId: string,
  isActive: boolean
): Promise<ActionState> {
  const { supabase } = await getMembership();

  const { data, error } = await supabase
    .from("vendor_engagements")
    .update({ is_active: isActive })
    .eq("id", engagementId)
    .select("id");
  if (error) return { error: friendlyError(error) };
  if (data.length === 0) return { error: "You don't have permission to do that." };

  revalidatePath("/dashboard", "layout");
}
