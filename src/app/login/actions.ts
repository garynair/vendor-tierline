"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { captchaToken } from "@/lib/captcha";

export async function login(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
    options: { captchaToken: captchaToken(formData) },
  });

  if (error) {
    return { error: error.message };
  }

  // An invite link opened before signing in comes back here as ?next=/join/...
  const next = String(formData.get("next") ?? "");
  redirect(next.startsWith("/join/") ? next : "/dashboard");
}
