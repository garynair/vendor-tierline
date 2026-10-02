-- Sandbox workspaces: each new signup gets a private copy of the sample data
-- (the "template" organization) and is its admin. Sandboxes inactive for 30
-- days are removed by the maintenance job (separate migration).

alter table public.organizations
  add column is_sandbox boolean not null default false,
  add column is_template boolean not null default false,
  add column reminder_sent_at timestamptz;

comment on column public.organizations.is_sandbox is
  'Self-service trial workspace; eligible for inactivity cleanup.';
comment on column public.organizations.is_template is
  'Source of the sample data copied into new sandboxes. Never cleaned up.';
comment on column public.organizations.reminder_sent_at is
  'When the inactivity reminder was emailed; cleared when a member signs in again.';

-- The public demo organization ("Sample Co") is the template.
update public.organizations set is_template = true where slug = 'sample-co-2c546d71';

create or replace function public.create_sandbox_workspace(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user  uuid := auth.uid();
  v_name  text := nullif(trim(p_name), '');
  v_org   uuid := gen_random_uuid();
  v_src   uuid;
  v_shift interval;
  v_slug  text;
begin
  if v_user is null then
    raise exception 'You must be logged in.' using errcode = '42501';
  end if;
  if v_name is null then
    raise exception 'Workspace name is required.' using errcode = '22023';
  end if;
  if length(v_name) > 80 then
    raise exception 'Workspace name is too long.' using errcode = '22023';
  end if;
  -- One workspace per account keeps sandboxes from being mass-created.
  if exists (select 1 from public.memberships where user_id = v_user) then
    raise exception 'You already belong to a workspace.' using errcode = '23505';
  end if;

  v_slug := coalesce(nullif(regexp_replace(regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'), ''), 'workspace');
  v_slug := left(v_slug, 40) || '-' || left(replace(v_org::text, '-', ''), 8);

  -- The insert trigger seeds default risk tiers; replaced below by the template's.
  insert into public.organizations (id, name, slug, is_sandbox)
  values (v_org, v_name, v_slug, true);
  insert into public.memberships (organization_id, user_id, role)
  values (v_org, v_user, 'admin');

  select id into v_src from public.organizations where is_template order by created_at limit 1;
  if v_src is null then
    return v_org;
  end if;

  -- Shift dates so the copied history ends "now" and aging metrics look current.
  select now() - max(coalesce(submitted_at, created_at)) into v_shift
  from public.assessments where organization_id = v_src;
  v_shift := coalesce(v_shift, interval '0');

  create temp table if not exists _sbx_map (kind text, old_id uuid, new_id uuid) on commit drop;
  truncate pg_temp._sbx_map;

  -- Risk tiers
  delete from public.risk_tiers where organization_id = v_org;
  insert into pg_temp._sbx_map
    select 'tier', id, gen_random_uuid() from public.risk_tiers where organization_id = v_src;
  insert into public.risk_tiers (id, organization_id, name, rank, min_score)
    select m.new_id, v_org, t.name, t.rank, t.min_score
    from public.risk_tiers t join pg_temp._sbx_map m on m.kind = 'tier' and m.old_id = t.id;

  -- Questionnaires
  insert into pg_temp._sbx_map
    select 'tmpl', id, gen_random_uuid() from public.questionnaire_templates where organization_id = v_src;
  insert into public.questionnaire_templates (id, organization_id, type, name, description)
    select m.new_id, v_org, t.type, t.name, t.description
    from public.questionnaire_templates t join pg_temp._sbx_map m on m.kind = 'tmpl' and m.old_id = t.id;

  insert into pg_temp._sbx_map
    select 'q', id, gen_random_uuid() from public.questionnaire_questions where organization_id = v_src;
  insert into public.questionnaire_questions (id, organization_id, template_id, category, prompt, weight, position)
    select mq.new_id, v_org, mt.new_id, q.category, q.prompt, q.weight, q.position
    from public.questionnaire_questions q
    join pg_temp._sbx_map mq on mq.kind = 'q' and mq.old_id = q.id
    join pg_temp._sbx_map mt on mt.kind = 'tmpl' and mt.old_id = q.template_id;

  insert into pg_temp._sbx_map
    select 'opt', id, gen_random_uuid() from public.question_options where organization_id = v_src;
  insert into public.question_options (id, organization_id, question_id, label, points, position)
    select mo.new_id, v_org, mq.new_id, o.label, o.points, o.position
    from public.question_options o
    join pg_temp._sbx_map mo on mo.kind = 'opt' and mo.old_id = o.id
    join pg_temp._sbx_map mq on mq.kind = 'q' and mq.old_id = o.question_id;

  insert into public.template_tier_mappings (tier_id, organization_id, template_id, template_type)
    select mr.new_id, v_org, mt.new_id, x.template_type
    from public.template_tier_mappings x
    join pg_temp._sbx_map mr on mr.kind = 'tier' and mr.old_id = x.tier_id
    join pg_temp._sbx_map mt on mt.kind = 'tmpl' and mt.old_id = x.template_id
    where x.organization_id = v_src;

  -- Vendors: only the fictional sample vendors (.example domains).
  insert into pg_temp._sbx_map
    select 'vendor', id, gen_random_uuid() from public.vendors
    where organization_id = v_src and website like '%.example';
  insert into public.vendors (id, organization_id, name, website, created_at)
    select m.new_id, v_org, v.name, v.website, v.created_at + v_shift
    from public.vendors v join pg_temp._sbx_map m on m.kind = 'vendor' and m.old_id = v.id;

  insert into pg_temp._sbx_map
    select 'eng', e.id, gen_random_uuid()
    from public.vendor_engagements e
    join pg_temp._sbx_map mv on mv.kind = 'vendor' and mv.old_id = e.vendor_id;
  insert into public.vendor_engagements (id, organization_id, vendor_id, name, description, is_active, created_at)
    select me.new_id, v_org, mv.new_id, e.name, e.description, e.is_active, e.created_at + v_shift
    from public.vendor_engagements e
    join pg_temp._sbx_map me on me.kind = 'eng' and me.old_id = e.id
    join pg_temp._sbx_map mv on mv.kind = 'vendor' and mv.old_id = e.vendor_id;

  -- Assessments (vendor invite tokens are never copied).
  insert into pg_temp._sbx_map
    select 'asmt', a.id, gen_random_uuid()
    from public.assessments a
    join pg_temp._sbx_map me on me.kind = 'eng' and me.old_id = a.engagement_id;
  insert into public.assessments (id, organization_id, engagement_id, template_id, type, parent_assessment_id,
                                  status, invite_token_hash, expires_at, filled_by_type, submitted_by,
                                  submitted_at, created_by, created_at)
    select ma.new_id, v_org, me.new_id, mt.new_id, a.type, mp.new_id,
           a.status, null, a.expires_at + v_shift, a.filled_by_type,
           case when a.submitted_by is not null then v_user end,
           a.submitted_at + v_shift, v_user, a.created_at + v_shift
    from public.assessments a
    join pg_temp._sbx_map ma on ma.kind = 'asmt' and ma.old_id = a.id
    join pg_temp._sbx_map me on me.kind = 'eng' and me.old_id = a.engagement_id
    join pg_temp._sbx_map mt on mt.kind = 'tmpl' and mt.old_id = a.template_id
    left join pg_temp._sbx_map mp on mp.kind = 'asmt' and mp.old_id = a.parent_assessment_id;

  -- Answers: the insert trigger fills keys and blanks snapshots, so restore
  -- the scoring snapshots and original answer metadata afterwards.
  insert into public.assessment_answers (assessment_id, question_id, option_id)
    select ma.new_id, mq.new_id, mo.new_id
    from public.assessment_answers x
    join pg_temp._sbx_map ma on ma.kind = 'asmt' and ma.old_id = x.assessment_id
    join pg_temp._sbx_map mq on mq.kind = 'q' and mq.old_id = x.question_id
    left join pg_temp._sbx_map mo on mo.kind = 'opt' and mo.old_id = x.option_id;
  update public.assessment_answers n
     set points_snapshot = x.points_snapshot,
         weight_snapshot = x.weight_snapshot,
         answered_by = case when x.answered_by is not null then v_user end,
         answered_at = x.answered_at + v_shift
    from public.assessment_answers x
    join pg_temp._sbx_map ma on ma.kind = 'asmt' and ma.old_id = x.assessment_id
    join pg_temp._sbx_map mq on mq.kind = 'q' and mq.old_id = x.question_id
   where n.assessment_id = ma.new_id and n.question_id = mq.new_id;

  insert into public.assessment_scores (assessment_id, organization_id, raw_score, max_possible, score,
                                        computed_tier_id, final_tier_id, overridden_by, override_reason,
                                        reviewed_by, reviewed_at, created_at)
    select ma.new_id, v_org, s.raw_score, s.max_possible, s.score,
           mc.new_id, mf.new_id,
           case when s.overridden_by is not null then v_user end, s.override_reason,
           case when s.reviewed_by is not null then v_user end,
           s.reviewed_at + v_shift, s.created_at + v_shift
    from public.assessment_scores s
    join pg_temp._sbx_map ma on ma.kind = 'asmt' and ma.old_id = s.assessment_id
    left join pg_temp._sbx_map mc on mc.kind = 'tier' and mc.old_id = s.computed_tier_id
    left join pg_temp._sbx_map mf on mf.kind = 'tier' and mf.old_id = s.final_tier_id;

  return v_org;
end;
$$;

revoke all on function public.create_sandbox_workspace(text) from public, anon;
grant execute on function public.create_sandbox_workspace(text) to authenticated;
