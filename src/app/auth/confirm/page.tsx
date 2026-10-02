import { AuthShell } from "@/components/auth-shell";
import { ConfirmForm } from "./confirm-form";

// Target of the links in auth emails (the "Confirm signup" template points
// here with token_hash and type). Opening the page does nothing by itself:
// the one-time token is only used when the person clicks the button. Email
// security scanners (e.g. Microsoft Safe Links) open links before the
// recipient does, and would otherwise use up the token.
export default async function ConfirmPage({ searchParams }: PageProps<"/auth/confirm">) {
  const params = await searchParams;
  const tokenHash = typeof params.token_hash === "string" ? params.token_hash : "";
  const type = typeof params.type === "string" ? params.type : "";
  const next = typeof params.next === "string" ? params.next : "";

  return (
    <AuthShell title="Confirm your email" subtitle="One more click and you're in.">
      <ConfirmForm tokenHash={tokenHash} type={type} next={next} />
    </AuthShell>
  );
}
