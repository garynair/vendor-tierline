import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

// Daily Vercel Cron job (see vercel.json). Deletes sandbox workspaces that
// stayed idle 7 days after their reminder (30 days total), then emails a
// reminder to sandboxes idle for 23 days. A sandbox is only marked as
// reminded after its email was accepted by Resend, and the database never
// deletes one that wasn't marked, so a failed email delays deletion instead
// of skipping the warning.
export const dynamic = "force-dynamic";

type DueSandbox = { org_id: string; org_name: string; emails: string[] | null; delete_after: string };

const SENDER = "Vendor Tierline <no-reply@vendor.axionsec.com>";
const APP_URL = "https://vendor-tierline.vercel.app";

function reminderHtml(orgName: string, deleteAfter: string) {
  const safeName = orgName.replace(/[<>&"]/g, "");
  return `<p>Your Vendor Tierline workspace <strong>${safeName}</strong> hasn't been used in a while.</p>
<p>Trial workspaces are deleted after 30 days without a sign-in. Unless someone signs in, this one and its data will be deleted on or after <strong>${deleteAfter}</strong>.</p>
<p><a href="${APP_URL}/login">Sign in to keep it</a></p>
<p>If you no longer need it, you can ignore this email.</p>`;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await supabase.rpc("sandbox_maintenance", { p_secret: secret });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
  }

  const result = data as { deleted: number; reminders_due: DueSandbox[] };
  const resendKey = process.env.RESEND_API_KEY;
  const reminded: string[] = [];
  const failures: string[] = [];

  if (resendKey) {
    for (const sandbox of result.reminders_due) {
      const to = (sandbox.emails ?? []).filter(Boolean);
      if (to.length === 0) continue;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: SENDER,
          to,
          subject: "Your Vendor Tierline workspace will be deleted in 7 days",
          html: reminderHtml(sandbox.org_name, sandbox.delete_after),
        }),
      });
      if (res.ok) reminded.push(sandbox.org_id);
      else failures.push(`${sandbox.org_id}: ${res.status}`);
    }
  }

  if (reminded.length > 0) {
    const { error: markError } = await supabase.rpc("sandbox_mark_reminded", {
      p_secret: secret,
      p_orgs: reminded,
    });
    if (markError) failures.push(`mark: ${markError.message}`);
  }

  return NextResponse.json({
    ok: failures.length === 0,
    deleted: result.deleted,
    remindersDue: result.reminders_due.length,
    reminded: reminded.length,
    emailConfigured: Boolean(resendKey),
    failures,
  });
}
