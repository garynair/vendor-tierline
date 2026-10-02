"use client";

import { useEffect } from "react";
import { PENDING_INVITE_COOKIE } from "@/lib/invites";

// Keeps the invite through sign-up and email confirmation, so onboarding can
// offer "Join <workspace>" instead of creating a new sandbox. First-party,
// 7 days, and cleared once the invite is used.
export function RememberInvite({ token }: { token: string }) {
  useEffect(() => {
    const secure = window.location.protocol === "https:" ? "; secure" : "";
    document.cookie = `${PENDING_INVITE_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=604800; samesite=lax${secure}`;
  }, [token]);
  return null;
}
