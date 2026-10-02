-- Sample data becomes optional: a new workspace can start empty (risk tiers
-- and questionnaires only) and load the sample vendors later. Both paths use
-- the same copy routine, which maps the template's tiers, questionnaires,
-- questions and options onto the workspace's own by rank, type+name and
-- position. Sample vendors are recognisable by their fictional .example sites.

-- Risk tiers and questionnaires from the template organization.
create or replace function private.copy_sample_config(p_src uuid, p_dst uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- The organizations insert trigger seeds default tiers; use the template's.
  delete from public.risk_tiers where organization_id = p_dst;
  insert into public.risk_tiers (organization_id, name, rank, min_score)
    select p_dst, name, rank, min_score from public.risk_tiers where organization_id = p_src;

  create temp table if not exists _cfg_map (kind text, old_id uuid, new_id uuid) on commit drop;
  truncate pg_temp._cfg_map;

  insert into pg_temp._cfg_map
    select 'tmpl', id, gen_random_uuid() from public.questionnaire_templates where organization_id = p_src;
  insert into public.questionnaire_templates (id, organization_id, type, name, description)
    select m.new_id, p_dst, t.type, t.name, t.description
    from public.questionnaire_templates t join pg_temp._cfg_map m on m.kind = 'tmpl' and m.old_id = t.id;

  insert into pg_temp._cfg_map
    select 'q', id, gen_random_uuid() from public.questionnaire_questions where organization_id = p_src;
  insert into public.questionnaire_questions (id, organization_id, template_id, category, prompt, weight, position)
    select mq.new_id, p_dst, mt.new_id, q.category, q.prompt, q.weight, q.position
    from public.questionnaire_questions q
    join pg_temp._cfg_map mq on mq.kind = 'q' and mq.old_id = q.id
    join pg_temp._cfg_map mt on mt.kind = 'tmpl' and mt.old_id = q.template_id;

  insert into public.question_options (organization_id, question_id, label, points, position)
    select p_dst, mq.new_id, o.label, o.points, o.position
    from public.question_options o
    join pg_temp._cfg_map mq on mq.kind = 'q' and mq.old_id = o.question_id;

  insert into public.template_tier_mappings (tier_id, organization_id, template_id, template_type)
    select dt.id, p_dst, mt.new_id, x.template_type
    from public.template_tier_mappings x
    join public.risk_tiers st on st.id = x.tier_id
    join public.risk_tiers dt on dt.organization_id = p_dst and dt.rank = st.rank
    join pg_temp._cfg_map mt on mt.kind = 'tmpl' and mt.old_id = x.template_id
    where x.organization_id = p_src;
end;
$$;

-- Sample vendors with their engagements, assessments, answers and scores.
create or replace function private.copy_sample_records(p_src uuid, p_dst uuid, p_user uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shift interval;
  v_missing int;
  v_vendors int;
begin
  create temp table if not exists _rec_map (kind text, old_id uuid, new_id uuid) on commit drop;
  truncate pg_temp._rec_map;

  -- Map the template's configuration onto the workspace's own.
  insert into pg_temp._rec_map
    select 'tier', s.id, d.id
    from public.risk_tiers s
    join public.risk_tiers d on d.organization_id = p_dst and d.rank = s.rank
    where s.organization_id = p_src;
  insert into pg_temp._rec_map
    select 'tmpl', s.id, d.id
    from public.questionnaire_templates s
    join public.questionnaire_templates d on d.organization_id = p_dst and d.type = s.type and d.name = s.name
    where s.organization_id = p_src;
  insert into pg_temp._rec_map
    select 'q', sq.id, dq.id
    from public.questionnaire_questions sq
    join pg_temp._rec_map mt on mt.kind = 'tmpl' and mt.old_id = sq.template_id
    join public.questionnaire_questions dq on dq.template_id = mt.new_id and dq.position = sq.position
    where sq.organization_id = p_src;
  insert into pg_temp._rec_map
    select 'opt', so.id, dopt.id
    from public.question_options so
    join pg_temp._rec_map mq on mq.kind = 'q' and mq.old_id = so.question_id
    join public.question_options dopt on dopt.question_id = mq.new_id and dopt.position = so.position
    where so.organization_id = p_src;

  -- The sample answers must all land on a matching question and option.
  select count(*) into v_missing
  from public.assessment_answers x
  join public.assessments a on a.id = x.assessment_id
  join public.vendor_engagements e on e.id = a.engagement_id
  join public.vendors v on v.id = e.vendor_id and v.website like '%.example'
  where x.organization_id = p_src
    and (not exists (select 1 from pg_temp._rec_map m where m.kind = 'q' and m.old_id = x.question_id)
         or (x.option_id is not null
             and not exists (select 1 from pg_temp._rec_map m where m.kind = 'opt' and m.old_id = x.option_id)));
  if v_missing > 0 then
    raise exception 'Sample data needs the default questionnaires, and yours have been changed.'
      using errcode = 'P0001';
  end if;

  select now() - max(coalesce(submitted_at, created_at)) into v_shift
  from public.assessments where organization_id = p_src;
  v_shift := coalesce(v_shift, interval '0');

  insert into pg_temp._rec_map
    select 'vendor', id, gen_random_uuid() from public.vendors
    where organization_id = p_src and website like '%.example';
  insert into public.vendors (id, organization_id, name, website, created_at)
    select m.new_id, p_dst, v.name, v.website, v.created_at + v_shift
    from public.vendors v join pg_temp._rec_map m on m.kind = 'vendor' and m.old_id = v.id;
  get diagnostics v_vendors = row_count;

  insert into pg_temp._rec_map
    select 'eng', e.id, gen_random_uuid()
    from public.vendor_engagements e
    join pg_temp._rec_map mv on mv.kind = 'vendor' and mv.old_id = e.vendor_id;
  insert into public.vendor_engagements (id, organization_id, vendor_id, name, description, is_active, created_at)
    select me.new_id, p_dst, mv.new_id, e.name, e.description, e.is_active, e.created_at + v_shift
    from public.vendor_engagements e
    join pg_temp._rec_map me on me.kind = 'eng' and me.old_id = e.id
    join pg_temp._rec_map mv on mv.kind = 'vendor' and mv.old_id = e.vendor_id;

  -- Vendor invite tokens are never copied.
  insert into pg_temp._rec_map
    select 'asmt', a.id, gen_random_uuid()
    from public.assessments a
    join pg_temp._rec_map me on me.kind = 'eng' and me.old_id = a.engagement_id;
  insert into public.assessments (id, organization_id, engagement_id, template_id, type, parent_assessment_id,
                                  status, invite_token_hash, expires_at, filled_by_type, submitted_by,
                                  submitted_at, created_by, created_at)
    select ma.new_id, p_dst, me.new_id, mt.new_id, a.type, mp.new_id,
           a.status, null, a.expires_at + v_shift, a.filled_by_type,
           case when a.submitted_by is not null then p_user end,
           a.submitted_at + v_shift, p_user, a.created_at + v_shift
    from public.assessments a
    join pg_temp._rec_map ma on ma.kind = 'asmt' and ma.old_id = a.id
    join pg_temp._rec_map me on me.kind = 'eng' and me.old_id = a.engagement_id
    join pg_temp._rec_map mt on mt.kind = 'tmpl' and mt.old_id = a.template_id
    left join pg_temp._rec_map mp on mp.kind = 'asmt' and mp.old_id = a.parent_assessment_id;

  -- The insert trigger fills keys and blanks snapshots; restore them after.
  insert into public.assessment_answers (assessment_id, question_id, option_id)
    select ma.new_id, mq.new_id, mo.new_id
    from public.assessment_answers x
    join pg_temp._rec_map ma on ma.kind = 'asmt' and ma.old_id = x.assessment_id
    join pg_temp._rec_map mq on mq.kind = 'q' and mq.old_id = x.question_id
    left join pg_temp._rec_map mo on mo.kind = 'opt' and mo.old_id = x.option_id;
  update public.assessment_answers n
     set points_snapshot = x.points_snapshot,
         weight_snapshot = x.weight_snapshot,
         answered_by = case when x.answered_by is not null then p_user end,
         answered_at = x.answered_at + v_shift
    from public.assessment_answers x
    join pg_temp._rec_map ma on ma.kind = 'asmt' and ma.old_id = x.assessment_id
    join pg_temp._rec_map mq on mq.kind = 'q' and mq.old_id = x.question_id
   where n.assessment_id = ma.new_id and n.question_id = mq.new_id;

  insert into public.assessment_scores (assessment_id, organization_id, raw_score, max_possible, score,
                                        computed_tier_id, final_tier_id, overridden_by, override_reason,
                                        reviewed_by, reviewed_at, created_at)
    select ma.new_id, p_dst, s.raw_score, s.max_possible, s.score,
           mc.new_id, mf.new_id,
           case when s.overridden_by is not null then p_user end, s.override_reason,
           case when s.reviewed_by is not null then p_user end,
           s.reviewed_at + v_shift, s.created_at + v_shift
    from public.assessment_scores s
    join pg_temp._rec_map ma on ma.kind = 'asmt' and ma.old_id = s.assessment_id
    left join pg_temp._rec_map mc on mc.kind = 'tier' and mc.old_id = s.computed_tier_id
    left join pg_temp._rec_map mf on mf.kind = 'tier' and mf.old_id = s.final_tier_id;

  return v_vendors;
end;
$$;

drop function if exists public.create_sandbox_workspace(text);

create or replace function public.create_sandbox_workspace(p_name text, p_with_samples boolean default true)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_name text := nullif(trim(p_name), '');
  v_org  uuid := gen_random_uuid();
  v_src  uuid;
  v_slug text;
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

  insert into public.organizations (id, name, slug, is_sandbox) values (v_org, v_name, v_slug, true);
  insert into public.memberships (organization_id, user_id, role) values (v_org, v_user, 'admin');

  select id into v_src from public.organizations where is_template order by created_at limit 1;
  if v_src is null then
    return v_org;
  end if;

  perform private.copy_sample_config(v_src, v_org);
  if p_with_samples then
    perform private.copy_sample_records(v_src, v_org, v_user);
  end if;
  return v_org;
end;
$$;

-- Admins of a workspace that started empty can add the sample vendors later.
create or replace function public.load_sample_data(p_org uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_src uuid;
begin
  if public.current_user_role(p_org) is distinct from 'admin' then
    raise exception 'Only admins can load sample data.' using errcode = '42501';
  end if;
  if exists (select 1 from public.organizations where id = p_org and is_template) then
    raise exception 'This workspace is the sample source.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.vendors where organization_id = p_org and website like '%.example') then
    raise exception 'Sample data is already loaded.' using errcode = 'P0001';
  end if;
  select id into v_src from public.organizations where is_template order by created_at limit 1;
  if v_src is null then
    raise exception 'No sample data is available.' using errcode = 'P0002';
  end if;
  return private.copy_sample_records(v_src, p_org, auth.uid());
end;
$$;

revoke all on function private.copy_sample_config(uuid, uuid) from public, anon, authenticated;
revoke all on function private.copy_sample_records(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.create_sandbox_workspace(text, boolean) from public, anon;
revoke all on function public.load_sample_data(uuid) from public, anon;
grant execute on function public.create_sandbox_workspace(text, boolean) to authenticated;
grant execute on function public.load_sample_data(uuid) to authenticated;
