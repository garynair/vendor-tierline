![Vendor Tierline](docs/banner.png)

# Vendor Tierline

Third-party risk tiering and vendor questionnaires.

Vendor Tierline scores each vendor **engagement** (not just the vendor) against a tiering questionnaire, maps the result to an org-configurable risk tier, and routes the engagement to the follow-up questionnaire for that tier. A reviewer confirms or overrides the computed tier before it becomes final.

## How it works

1. **Tiering questionnaire.** Multiple-choice questions grouped by risk factor (data sensitivity, regulatory exposure, cloud/infrastructure dependency, fourth-party exposure, breach history, service criticality, access level). Answers are weighted and normalized into a score.
2. **Tier assignment.** The score maps to a risk tier (Critical / High / Medium / Low by default, configurable per org). The computed tier and the reviewer's final tier are stored separately, with an override reason.
3. **Follow-up questionnaire.** Each tier has its own follow-up template. The reviewer sends it once the tier is confirmed.

Vendors can fill questionnaires through a token link without an account, or an internal user can complete them on the vendor's behalf.

## Try it

Go to [vendor-tierline.vercel.app](https://vendor-tierline.vercel.app). There are two ways in:

- **Explore the demo (one click, no sign-up).** Opens a sample organization with 27 fictional vendors, scores, reviewer overrides, and follow-ups as a read-only user. It can browse everything, including the Insights dashboard, but row-level security blocks all changes. The same account works from the login form: `demo@example.com` / `Password@123`.
- **Create your own workspace.** Sign up and confirm your email to get a private workspace where you're the admin, either pre-loaded with the sample data or empty (the samples can be loaded later from Settings). You can add vendors, run assessments, override tiers, and invite teammates. Workspaces with no sign-in for 30 days are deleted after an email reminder.

## Insights dashboard

![Vendor Tierline insights dashboard: engagements, final risk tiers, and tiering pipeline](docs/dashboard.png)

The Insights page shows the final tier mix, the tiering pipeline, monthly intake, the reviewer-override audit trail, and aging of open follow-ups. It reads from `dash_*` database views that respect each organization's row-level security. The screenshot uses fictional demo data.

## Users and roles

Each workspace has three roles, enforced in the database rather than only hidden in the UI:

| Role | Can |
| --- | --- |
| Admin | Everything below, plus edit risk tiers and questionnaires, invite users, change roles |
| Practitioner | Add vendors and engagements, send questionnaires, review and override tiers |
| Read-only | View vendors, assessments, and Insights |

Admins invite teammates with a one-time join link (7-day expiry; only a hash of the token is stored). Role changes and removals are recorded in an audit log, the last admin can't be demoted or removed, and non-admins see member emails partly masked.

## Status

**v1.1** (2 Oct 2026). Adds a Home overview (snapshot, tier mix, items needing attention), Users & roles with invite links, self-service workspaces with optional sample data, Cloudflare Turnstile bot protection on sign-in and sign-up, strong password rules, and a scanner-safe email confirmation step.

**v1.0** (23 Sep 2026). The two-stage flow from the [architecture](docs/architecture.md): vendor token links, internal fill, scoring, reviewer confirm/override, tier-mapped follow-ups, a getting-started checklist, and dark mode.

Schema changes live in `supabase/migrations/`.

## Stack

- Next.js (App Router) and Tailwind CSS
- Supabase: Postgres, Auth, and row-level security scoped by organization membership
- Vercel for hosting and scheduled jobs (database keep-alive, inactive-workspace cleanup)
- Cloudflare Turnstile for bot protection; Resend for transactional email

## Local development

Create `.env.local` with your Supabase project values:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...

# Optional
NEXT_PUBLIC_TURNSTILE_SITE_KEY=...  # bot check; leave unset unless CAPTCHA is on in Supabase
CRON_SECRET=...                     # protects the scheduled-job routes
RESEND_API_KEY=...                  # inactivity reminder emails
```

Then:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## License

Vendor Tierline is source-available under the [Business Source License 1.1](LICENSE).

- **Allowed:** reading the code, running it locally, evaluation, learning, research, and testing.
- **Not allowed without a commercial license:** production use, including offering it as a hosted service or using it to run a commercial vendor risk offering.
- **Converts to open source:** on 2030-09-30, the code converts to the Apache License 2.0.

For commercial licensing, contact [Girish Nair](https://github.com/garynair).
