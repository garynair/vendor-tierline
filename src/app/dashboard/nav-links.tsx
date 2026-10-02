"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Home", exact: true },
  { href: "/dashboard/vendors", label: "Vendors" },
  { href: "/dashboard/insights", label: "Insights" },
  { href: "/dashboard/settings", label: "Settings" },
];

// Vendor and engagement detail pages belong to the Vendors tab.
function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  if (href === "/dashboard/vendors") {
    return ["/dashboard/vendors", "/dashboard/engagements", "/dashboard/assessments"].some((prefix) =>
      pathname.startsWith(prefix)
    );
  }
  return pathname.startsWith(href);
}

export function NavLinks() {
  const pathname = usePathname();
  return (
    <>
      {links.map((link) => {
        const active = isActive(pathname, link.href, link.exact);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              active ? "bg-emerald-600 text-white" : "text-gray-700 hover:bg-green-100"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
