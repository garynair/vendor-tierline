-- Users & roles: member list, join links, role changes with guardrails and an
-- audit log. Membership writes now go only through these functions, so the
-- "last admin" and "no self-removal" rules can't be bypassed through the API.

create table public.org_invites (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role            public.member_role not null,
  token_hash      bytea not null unique,
  email           text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null,
  accepted_by     uuid references auth.users(id) on delete set null,
  accepted_at     timestamptz,
  revoked_at      timestamptz,
  check ((accepted_at is null) = (accepted_by is null))
);
create index on public.org_invites (organization_id);
alter table public.org_invites enable row level security;
create policy "admins read invites" on public.org_invites
  for select to authenticated
  using (public.current_user_role(organization_id) = 'admin');

create table public.membership_events (
  id              bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete set null,
  action          text not null check (action in ('joined', 'role_changed', 'removed')),
  old_role        public.member_role,
  new_role        public.member_role,
  changed_by      uuid references auth.users(id) on delete set null,
  changed_at      timestamptz not null default now()
);
create index on public.membership_events (organization_id, changed_at desc);
alter table public.membership_events enable row level security;
create policy "admins read membership events" on public.membership_events
  for select to authenticated
  using (public.current_user_role(organization_id) = 'admin');

-- Direct membership writes by admins are replaced by the functions below.
drop policy if exists "admins manage memberships" on public.memberships;

-- Members of an org. Emails are masked for everyone except admins, because
-- the public demo account can read its org's member list.
create or replace function public.org_members(p_org uuid)
returns table (user_id uuid, email text, role public.member_role, joined_at timestamptz,
               last_sign_in_at timestamptz, is_you boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role public.member_role := public.current_user_role(p_org);
begin
  if v_role is null then
    raise exception 'not a member' using errcode = '42501';
  end if;
  return query
    select m.user_id,
           case when v_role = 'admin' or m.user_id = auth.uid() then u.email::text
                else left(u.email, 1) || '***@' || split_part(u.email, '@', 2) end,
           m.role, m.created_at,
           case when v_role = 'admin' or m.user_id = auth.uid() then u.last_sign_in_at end,
           m.user_id = auth.uid()
    from public.memberships m
    join auth.users u on u.id = m.user_id
    where m.organization_id = p_org
    order by m.role, m.created_at;
end;
$$;

create or replace function private.assert_admin(p_org uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if public.current_user_role(p_org) is distinct from 'admin' then
    raise exception 'Only admins can manage users.' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.create_org_invite(p_org uuid, p_role public.member_role,
                                                    p_email text default null,
                                                    p_valid_for interval default '7 days')
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  perform private.assert_admin(p_org);
  if p_valid_for <= interval '0' or p_valid_for > interval '30 days' then
    raise exception 'Link validity must be between 1 and 30 days.' using errcode = '22023';
  end if;
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.org_invites (organization_id, role, token_hash, email, created_by, expires_at)
  values (p_org, p_role, private.token_hash(v_token), nullif(trim(lower(p_email)), ''), auth.uid(), now() + p_valid_for);
  return v_token;
end;
$$;

create or replace function public.revoke_org_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select organization_id into v_org from public.org_invites where id = p_invite_id;
  if v_org is null then
    raise exception 'Invite not found.' using errcode = 'P0002';
  end if;
  perform private.assert_admin(v_org);
  update public.org_invites set revoked_at = now()
  where id = p_invite_id and accepted_at is null and revoked_at is null;
end;
$$;

-- What a join link points to, so the page can say "Join X as Y" before accepting.
create or replace function public.get_org_invite(p_token text)
returns table (organization_name text, role public.member_role, expires_at timestamptz, status text)
language sql
stable
security definer
set search_path = ''
as $$
  select o.name, i.role, i.expires_at,
         case when i.revoked_at is not null then 'revoked'
              when i.accepted_at is not null then 'used'
              when i.expires_at <= now() then 'expired'
              else 'valid' end
  from public.org_invites i
  join public.organizations o on o.id = i.organization_id
  where i.token_hash = private.token_hash(p_token);
$$;

create or replace function public.accept_org_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user   uuid := auth.uid();
  v_invite public.org_invites;
begin
  if v_user is null then
    raise exception 'You must be logged in.' using errcode = '42501';
  end if;
  select * into v_invite from public.org_invites
  where token_hash = private.token_hash(p_token) for update;
  if not found or v_invite.revoked_at is not null or v_invite.accepted_at is not null
     or v_invite.expires_at <= now() then
    raise exception 'This invite link is invalid or has expired.' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.memberships where user_id = v_user and organization_id = v_invite.organization_id) then
    return v_invite.organization_id;
  end if;
  -- v1 supports one workspace per account.
  if exists (select 1 from public.memberships where user_id = v_user) then
    raise exception 'Your account already belongs to a workspace. Sign up with a different email to accept this invite.'
      using errcode = '23505';
  end if;

  insert into public.memberships (organization_id, user_id, role)
  values (v_invite.organization_id, v_user, v_invite.role);
  update public.org_invites set accepted_by = v_user, accepted_at = now() where id = v_invite.id;
  insert into public.membership_events (organization_id, user_id, action, new_role, changed_by)
  values (v_invite.organization_id, v_user, 'joined', v_invite.role, v_invite.created_by);
  return v_invite.organization_id;
end;
$$;

create or replace function public.set_member_role(p_org uuid, p_user uuid, p_role public.member_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.member_role;
begin
  perform private.assert_admin(p_org);
  select role into v_old from public.memberships
  where organization_id = p_org and user_id = p_user for update;
  if v_old is null then
    raise exception 'Member not found.' using errcode = 'P0002';
  end if;
  if v_old = p_role then
    return;
  end if;
  if v_old = 'admin' and (select count(*) from public.memberships
                          where organization_id = p_org and role = 'admin') <= 1 then
    raise exception 'A workspace needs at least one admin. Promote someone else first.' using errcode = 'P0001';
  end if;
  update public.memberships set role = p_role where organization_id = p_org and user_id = p_user;
  insert into public.membership_events (organization_id, user_id, action, old_role, new_role, changed_by)
  values (p_org, p_user, 'role_changed', v_old, p_role, auth.uid());
end;
$$;

create or replace function public.remove_member(p_org uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.member_role;
begin
  perform private.assert_admin(p_org);
  if p_user = auth.uid() then
    raise exception 'You can''t remove yourself.' using errcode = 'P0001';
  end if;
  select role into v_old from public.memberships
  where organization_id = p_org and user_id = p_user for update;
  if v_old is null then
    raise exception 'Member not found.' using errcode = 'P0002';
  end if;
  if v_old = 'admin' and (select count(*) from public.memberships
                          where organization_id = p_org and role = 'admin') <= 1 then
    raise exception 'A workspace needs at least one admin.' using errcode = 'P0001';
  end if;
  delete from public.memberships where organization_id = p_org and user_id = p_user;
  insert into public.membership_events (organization_id, user_id, action, old_role, changed_by)
  values (p_org, p_user, 'removed', v_old, auth.uid());
end;
$$;

revoke all on function public.org_members(uuid) from public, anon;
revoke all on function private.assert_admin(uuid) from public, anon, authenticated;
revoke all on function public.create_org_invite(uuid, public.member_role, text, interval) from public, anon;
revoke all on function public.revoke_org_invite(uuid) from public, anon;
revoke all on function public.get_org_invite(text) from public;
revoke all on function public.accept_org_invite(text) from public, anon;
revoke all on function public.set_member_role(uuid, uuid, public.member_role) from public, anon;
revoke all on function public.remove_member(uuid, uuid) from public, anon;

grant execute on function public.org_members(uuid) to authenticated;
grant execute on function public.create_org_invite(uuid, public.member_role, text, interval) to authenticated;
grant execute on function public.revoke_org_invite(uuid) to authenticated;
grant execute on function public.get_org_invite(text) to anon, authenticated;
grant execute on function public.accept_org_invite(text) to authenticated;
grant execute on function public.set_member_role(uuid, uuid, public.member_role) to authenticated;
grant execute on function public.remove_member(uuid, uuid) to authenticated;
