"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { captchaToken } from "@/lib/captcha";

export async function signup(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email"));
  const { data, error } = await supabase.auth.signUp({
    email,
    password: String(formData.get("password")),
    options: { captchaToken: captchaToken(formData) },
  });

  if (error) {
    return { error: error.message };
  }

  // With email confirmation on, there's no session until the user clicks
  // the link in their inbox (handled by /auth/confirm).
  if (!data.session) {
    return {
      message: `Check ${email} for a confirmation link. Your workspace will be ready when you click it.`,
    };
  }

  redirect("/onboarding");
}
