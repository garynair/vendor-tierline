import { NextResponse } from "next/server";

// Keeps the free-tier Supabase project from pausing after 7 days without
// activity. Vercel Cron calls this route daily (see vercel.json). It runs one
// tiny read through the Supabase REST API with the public key; row-level
// security returns no rows to an anonymous caller, but the request still
// counts as project activity. It reads nothing sensitive and writes nothing.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // When CRON_SECRET is set in Vercel, only Vercel Cron (which sends it as a
  // bearer token) can trigger the ping.
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ ok: false, error: "supabase env missing" }, { status: 500 });
  }

  const res = await fetch(`${url}/rest/v1/risk_tiers?select=id&limit=1`, {
    headers: { apikey: key },
    cache: "no-store",
  });

  return NextResponse.json(
    { ok: res.ok, supabaseStatus: res.status, at: new Date().toISOString() },
    { status: res.ok ? 200 : 502 },
  );
}
