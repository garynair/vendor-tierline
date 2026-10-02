import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Target of the links in auth emails (the "Confirm signup" template points
// here with token_hash and type). Verifying the token signs the user in.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");

  // Build the redirect from a clean URL so the token never lingers in history.
  const redirectTo = request.nextUrl.clone();
  redirectTo.search = "";
  // Only same-site paths, so the link can't be used as an open redirect.
  redirectTo.pathname = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(redirectTo);
  }

  redirectTo.pathname = "/auth/error";
  return NextResponse.redirect(redirectTo);
}
