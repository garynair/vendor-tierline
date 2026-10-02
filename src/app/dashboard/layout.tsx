import Link from "next/link";
import { getMembership } from "@/lib/membership";
import { APP_VERSION } from "@/lib/version";
import { LogoMark } from "@/components/logo";
import { roleLabels } from "@/lib/invites";
import { signOut } from "./actions";
import { NavLinks } from "./nav-links";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const { orgName, role } = await getMembership();

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-8">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/dashboard">
                <LogoMark tone="auto" />
              </Link>
              <span className="rounded-full border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-500">
                v{APP_VERSION}
              </span>
            </div>
            <p className="ml-11 text-xs text-gray-500">
              {orgName} · {roleLabels[role]}
            </p>
          </div>
        </div>
        <nav
          aria-label="Main"
          className="flex flex-wrap items-center gap-1 rounded-lg border border-green-200 bg-green-50 p-1"
        >
          <NavLinks />
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-green-200" />
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-green-100"
            >
              Sign out
            </button>
          </form>
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </div>
  );
}
