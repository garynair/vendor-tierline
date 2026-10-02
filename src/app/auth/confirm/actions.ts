"use server";

import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

export async function confirmEmail(_prev: unknown, formData: FormData) {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const type = String(formData.get("type") ?? "") as EmailOtpType;
  const next = String(formData.get("next") ?? "");

  if (!tokenHash || !OTP_TYPES.includes(type)) {
    return { error: "This confirmation link is incomplete. Open it again from your email." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    return {
      error:
        "That link has expired or was already used. If you already confirmed, log in. Otherwise, sign up again to get a new link.",
    };
  }

  // Only same-site paths, so the link can't be used as an open redirect.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}
