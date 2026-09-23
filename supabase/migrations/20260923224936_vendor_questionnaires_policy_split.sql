-- Advisor follow-up to vendor_questionnaires:
-- 1. "manage" policies were FOR ALL, overlapping the "read" SELECT policies
--    (two permissive policies evaluated per SELECT). Split them into
--    insert / update / delete so SELECT has exactly one policy.
-- 2. Cover the remaining foreign keys with indexes.

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('risk_tiers',              'admins manage risk tiers',    'admin'),
      ('questionnaire_templates', 'admins manage templates',     'admin'),
      ('questionnaire_questions', 'admins manage questions',     'admin'),
      ('question_options',        'admins manage options',       'admin'),
      ('template_tier_mappings',  'admins manage tier mappings', 'admin'),
      ('vendors',                 'staff manage vendors',        'staff'),
      ('vendor_engagements',      'staff manage engagements',    'staff')
    ) as t (tbl, old_name, who)
  loop
    execute format('drop policy %I on public.%I', r.old_name, r.tbl);
    execute format(
      $p$create policy %I on public.%I for insert to authenticated
           with check (public.current_user_role(organization_id) %s)$p$,
      r.who || ' insert ' || r.tbl, r.tbl,
      case r.who when 'admin' then $c$= 'admin'$c$ else $c$in ('admin', 'practitioner')$c$ end);
    execute format(
      $p$create policy %I on public.%I for update to authenticated
           using (public.current_user_role(organization_id) %3$s)
           with check (public.current_user_role(organization_id) %3$s)$p$,
      r.who || ' update ' || r.tbl, r.tbl,
      case r.who when 'admin' then $c$= 'admin'$c$ else $c$in ('admin', 'practitioner')$c$ end);
    execute format(
      $p$create policy %I on public.%I for delete to authenticated
           using (public.current_user_role(organization_id) %s)$p$,
      r.who || ' delete ' || r.tbl, r.tbl,
      case r.who when 'admin' then $c$= 'admin'$c$ else $c$in ('admin', 'practitioner')$c$ end);
  end loop;
end;
$$;

create index assessment_scores_assessment_org_idx
  on public.assessment_scores (assessment_id, organization_id);
create index template_tier_mappings_tier_org_idx
  on public.template_tier_mappings (tier_id, organization_id);
create index assessments_created_by_idx on public.assessments (created_by);
create index assessments_submitted_by_idx on public.assessments (submitted_by);
create index assessment_answers_answered_by_idx on public.assessment_answers (answered_by);
create index assessment_scores_overridden_by_idx on public.assessment_scores (overridden_by);
create index assessment_scores_reviewed_by_idx on public.assessment_scores (reviewed_by);
