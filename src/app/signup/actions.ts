"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { captchaToken, friendlyAuthError } from "@/lib/captcha";
import { passwordProblems } from "@/lib/password-rules";

export async function signup(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  if (password !== String(formData.get("confirm_password") ?? "")) {
    return { error: "The passwords don't match. Type the same password in both fields." };
  }
  const problems = passwordProblems(password);
  if (problems.length > 0) {
    return { error: `Your password still needs: ${problems.join(", ")}.` };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { captchaToken: captchaToken(formData) },
  });

  if (error) {
    return { error: friendlyAuthError(error.message) };
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
