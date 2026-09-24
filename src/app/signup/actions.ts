"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signup(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email"));
  const { data, error } = await supabase.auth.signUp({
    email,
    password: String(formData.get("password")),
  });

  if (error) {
    return { error: error.message };
  }

  // With email confirmation on, there's no session until the user clicks
  // the link in their inbox (handled by /auth/confirm).
  if (!data.session) {
    return { message: `Check ${email} for a confirmation link to finish signing up.` };
  }

  redirect("/onboarding");
}
