import Link from "next/link";
import { getMembership } from "@/lib/membership";
import { APP_VERSION } from "@/lib/version";
import { LogoMark } from "@/components/logo";
import { signOut } from "./actions";

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
              {orgName} · {role}
            </p>
          </div>
          <nav className="flex gap-4 text-sm">
            <Link href="/dashboard" className="hover:underline">
              Vendors
            </Link>
            <Link href="/dashboard/settings" className="hover:underline">
              Settings
            </Link>
          </nav>
        </div>
        <form action={signOut}>
          <button type="submit" className="text-sm underline">
            Sign out
          </button>
        </form>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </div>
  );
}
