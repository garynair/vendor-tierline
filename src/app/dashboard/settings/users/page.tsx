import { getMembership } from "@/lib/membership";
import { formatDate } from "@/lib/labels";
import { roleDescriptions, roleLabels } from "@/lib/invites";
import { ActionForm } from "@/components/action-form";
import { ReadOnlyAction } from "@/components/read-only-action";
import { SettingsTabs } from "../settings-tabs";
import { InviteForm } from "./invite-form";
import { changeRole, removeMember, revokeInvite } from "./actions";

const ROLE_ORDER = ["admin", "practitioner", "learner"] as const;

// What each role can do. Mirrors the row-level security policies and RPC
// checks in the database, which are what actually enforce it.
const capabilities: { label: string; roles: (typeof ROLE_ORDER)[number][] }[] = [
  { label: "View vendors, assessments, and Insights", roles: ["admin", "practitioner", "learner"] },
  { label: "Add vendors and engagements", roles: ["admin", "practitioner"] },
  { label: "Send questionnaires and answer them internally", roles: ["admin", "practitioner"] },
  { label: "Review tiers and override with a reason", roles: ["admin", "practitioner"] },
  { label: "Edit risk tiers and questionnaires", roles: ["admin"] },
  { label: "Invite users and change roles", roles: ["admin"] },
];

export default async function UsersPage() {
  const { supabase, orgId, isAdmin } = await getMembership();

  const [{ data: members }, { data: invites }, { data: events }] = await Promise.all([
    supabase.rpc("org_members", { p_org: orgId }),
    isAdmin
      ? supabase
          .from("org_invites")
          .select("id, role, created_at, expires_at, accepted_at, revoked_at")
          .order("created_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: null }),
    isAdmin
      ? supabase
          .from("membership_events")
          .select("id, user_id, action, old_role, new_role, changed_at")
          .order("changed_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: null }),
  ]);

  const emailById = new Map((members ?? []).map((member) => [member.user_id, member.email]));
  const now = new Date().toISOString();
  const openInvites = (invites ?? []).filter(
    (invite) => !invite.accepted_at && !invite.revoked_at && invite.expires_at > now
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Settings</h1>
        <SettingsTabs active="users" />
        {!isAdmin && (
          <p className="text-sm text-gray-600">
            Only admins can invite users or change roles. Emails are partly hidden for non-admins.
          </p>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Members</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-gray-500">
              <th className="py-2">Email</th>
              <th className="py-2">Role</th>
              <th className="py-2">Joined</th>
              {isAdmin && <th className="py-2">Last sign-in</th>}
              {isAdmin && <th className="py-2" />}
            </tr>
          </thead>
          <tbody>
            {(members ?? []).map((member) => (
              <tr key={member.user_id} className="border-t border-gray-100 align-top">
                <td className="py-3">
                  {member.email}
                  {member.is_you && <span className="ml-2 text-xs text-gray-500">(you)</span>}
                </td>
                <td className="py-3">
                  {isAdmin && !member.is_you ? (
                    <ActionForm
                      action={changeRole.bind(null, member.user_id)}
                      submitLabel="Save"
                      variant="secondary"
                      className="flex flex-wrap items-center gap-2"
                    >
                      <select
                        name="role"
                        defaultValue={member.role}
                        className="rounded border border-gray-300 px-2 py-1.5"
                      >
                        {ROLE_ORDER.map((role) => (
                          <option key={role} value={role}>
                            {roleLabels[role]}
                          </option>
                        ))}
                      </select>
                    </ActionForm>
                  ) : (
                    roleLabels[member.role]
                  )}
                </td>
                <td className="py-3">{formatDate(member.joined_at)}</td>
                {isAdmin && <td className="py-3">{formatDate(member.last_sign_in_at) || "Never"}</td>}
                {isAdmin && (
                  <td className="py-3 text-right">
                    {!member.is_you && (
                      <ActionForm
                        action={removeMember.bind(null, member.user_id)}
                        submitLabel="Remove"
                        pendingLabel="Removing…"
                        variant="danger"
                        confirm={`Remove ${member.email} from this workspace? They lose access immediately.`}
                      />
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">Invite a teammate</h2>
          <p className="text-sm text-gray-600">
            Create a one-time join link and send it however you like. The teammate signs up (or logs
            in) and joins with the role you chose.
          </p>
        </div>
        {isAdmin ? (
          <InviteForm />
        ) : (
          <div>
            <ReadOnlyAction
              label="Create invite link"
              message="Only admins can invite users. In the read-only demo, changes are turned off."
            />
          </div>
        )}
        {isAdmin && openInvites.length > 0 && (
          <ul className="flex flex-col gap-2">
            {openInvites.map((invite) => (
              <li
                key={invite.id}
                className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 text-sm"
              >
                <span>
                  Open link · {roleLabels[invite.role]} · expires {formatDate(invite.expires_at)}
                </span>
                <ActionForm
                  action={revokeInvite.bind(null, invite.id)}
                  submitLabel="Revoke"
                  pendingLabel="Revoking…"
                  variant="secondary"
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Roles</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-gray-500">
              <th className="py-2">Can…</th>
              {ROLE_ORDER.map((role) => (
                <th key={role} className="py-2 text-center">
                  {roleLabels[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {capabilities.map((capability) => (
              <tr key={capability.label} className="border-t border-gray-100">
                <td className="py-2">{capability.label}</td>
                {ROLE_ORDER.map((role) => (
                  <td key={role} className="py-2 text-center">
                    {capability.roles.includes(role) ? "✓" : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="flex flex-col gap-1 text-xs text-gray-500">
          {ROLE_ORDER.map((role) => (
            <li key={role}>
              <span className="font-medium">{roleLabels[role]}:</span> {roleDescriptions[role]}
            </li>
          ))}
          <li>Enforced in the database (row-level security and checked functions), not just hidden in the UI.</li>
        </ul>
      </section>

      {isAdmin && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Recent changes</h2>
          {(events ?? []).length === 0 ? (
            <p className="text-sm text-gray-500">No membership changes yet.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {(events ?? []).map((event) => (
                <li key={event.id}>
                  <span className="text-gray-500">{formatDate(event.changed_at)}</span>{" "}
                  {(event.user_id && emailById.get(event.user_id)) ?? "Former member"}{" "}
                  {event.action === "joined" && `joined as ${event.new_role ? roleLabels[event.new_role] : ""}`}
                  {event.action === "role_changed" &&
                    `changed from ${event.old_role ? roleLabels[event.old_role] : ""} to ${event.new_role ? roleLabels[event.new_role] : ""}`}
                  {event.action === "removed" && "was removed"}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
