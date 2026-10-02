-- Sandbox inactivity cleanup. A daily Vercel Cron job calls these functions
-- with CRON_SECRET; only its SHA-256 hash is stored here (inserted outside the
-- repo). Flow: a sandbox idle for 23 days gets a reminder email; if it is
-- still idle 7 days after the reminder (30 days total), it is deleted.
-- A sandbox is never deleted unless a reminder was recorded as sent.

create table private.job_secrets (
  name        text primary key,
  secret_hash bytea not null,
  updated_at  timestamptz not null default now()
);
revoke all on private.job_secrets from public, anon, authenticated;

create or replace function private.check_job_secret(p_secret text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_secret is null or not exists (
    select 1 from private.job_secrets
    where name = 'cron' and secret_hash = private.token_hash(p_secret)
  ) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
end;
$$;

-- Last sign-in by any member, or creation time if nobody has signed in since.
create or replace function private.sandbox_last_active(p_org uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(o.created_at, max(u.last_sign_in_at))
  from public.organizations o
  left join public.memberships m on m.organization_id = o.id
  left join auth.users u on u.id = m.user_id
  where o.id = p_org
  group by o.created_at;
$$;

-- Runs the cleanup and returns the sandboxes that now need a reminder email.
create or replace function public.sandbox_maintenance(p_secret text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted int := 0;
  v_org record;
  v_due jsonb;
begin
  perform private.check_job_secret(p_secret);

  -- Activity after a reminder cancels it.
  update public.organizations o set reminder_sent_at = null
  where o.is_sandbox and o.reminder_sent_at is not null
    and private.sandbox_last_active(o.id) > o.reminder_sent_at;

  -- Delete sandboxes reminded at least 7 days ago and idle for 30 days.
  for v_org in
    select o.id from public.organizations o
    where o.is_sandbox and not o.is_template
      and o.reminder_sent_at <= now() - interval '7 days'
      and private.sandbox_last_active(o.id) <= now() - interval '30 days'
  loop
    -- Vendors first: their assessments reference templates and tiers.
    delete from public.vendors where organization_id = v_org.id;
    delete from public.organizations where id = v_org.id;
    v_deleted := v_deleted + 1;
  end loop;

  select coalesce(jsonb_agg(jsonb_build_object(
           'org_id', o.id,
           'org_name', o.name,
           'emails', (select jsonb_agg(u.email) from public.memberships m
                      join auth.users u on u.id = m.user_id
                      where m.organization_id = o.id and m.role = 'admin'),
           'delete_after', (now() + interval '7 days')::date)), '[]'::jsonb)
    into v_due
  from public.organizations o
  where o.is_sandbox and not o.is_template and o.reminder_sent_at is null
    and private.sandbox_last_active(o.id) <= now() - interval '23 days';

  return jsonb_build_object('deleted', v_deleted, 'reminders_due', v_due);
end;
$$;

-- Called after the reminder emails were sent successfully.
create or replace function public.sandbox_mark_reminded(p_secret text, p_orgs uuid[])
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  perform private.check_job_secret(p_secret);
  update public.organizations set reminder_sent_at = now()
  where id = any(p_orgs) and is_sandbox and reminder_sent_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function private.check_job_secret(text) from public, anon, authenticated;
revoke all on function private.sandbox_last_active(uuid) from public, anon, authenticated;
revoke all on function public.sandbox_maintenance(text) from public;
revoke all on function public.sandbox_mark_reminded(text, uuid[]) from public;
-- Callable with the public key, but useless without the cron secret.
grant execute on function public.sandbox_maintenance(text) to anon;
grant execute on function public.sandbox_mark_reminded(text, uuid[]) to anon;
