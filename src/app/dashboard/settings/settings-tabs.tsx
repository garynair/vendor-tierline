import Link from "next/link";

export function SettingsTabs({ active }: { active: "program" | "users" }) {
  const tabClass = (tab: "program" | "users") =>
    `border-b-2 px-1 pb-2 text-sm ${active === tab ? "border-black font-medium" : "border-transparent text-gray-500 hover:text-gray-700"}`;
  return (
    <nav className="flex gap-6 border-b border-gray-200">
      <Link href="/dashboard/settings" className={tabClass("program")}>
        Risk tiers & questionnaires
      </Link>
      <Link href="/dashboard/settings/users" className={tabClass("users")}>
        Users & roles
      </Link>
    </nav>
  );
}
