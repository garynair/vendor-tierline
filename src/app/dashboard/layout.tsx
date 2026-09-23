import Link from "next/link";
import { getMembership } from "@/lib/membership";
import { signOut } from "./actions";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const { orgName, role } = await getMembership();

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-8">
          <div>
            <Link href="/dashboard" className="font-semibold">
              Vendor Tierline
            </Link>
            <p className="text-xs text-gray-500">
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
