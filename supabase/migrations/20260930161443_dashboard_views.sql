-- Dashboard views. security_invoker = true so each view respects the caller's RLS (org membership).

create or replace view public.dash_vendor_register with (security_invoker = true) as
select
  e.organization_id,
  v.id as vendor_id, v.name as vendor_name,
  e.id as engagement_id, e.name as engagement_name, e.is_active,
  (e.description like '[demo]%') as is_demo,
  a.id as tiering_assessment_id, a.status as tiering_status, a.filled_by_type,
  a.created_at as assessment_created_at, a.submitted_at,
  s.score, tc.name as computed_tier, tc.rank as computed_tier_rank,
  tf.name as final_tier, tf.rank as final_tier_rank,
  (s.final_tier_id is not null and s.final_tier_id <> s.computed_tier_id) as was_overridden,
  s.reviewed_at,
  fu.status as followup_status, fq.name as followup_template
from public.vendor_engagements e
join public.vendors v on v.id = e.vendor_id and v.organization_id = e.organization_id
left join lateral (
  select * from public.assessments a0
  where a0.engagement_id = e.id and a0.type = 'tiering'
  order by a0.created_at desc limit 1) a on true
left join public.assessment_scores s on s.assessment_id = a.id
left join public.risk_tiers tc on tc.id = s.computed_tier_id
left join public.risk_tiers tf on tf.id = s.final_tier_id
left join lateral (
  select * from public.assessments f0
  where f0.parent_assessment_id = a.id and f0.type = 'followup'
  order by f0.created_at desc limit 1) fu on true
left join public.questionnaire_templates fq on fq.id = fu.template_id;

create or replace view public.dash_tier_distribution with (security_invoker = true) as
select
  s.organization_id,
  tc.name as computed_tier, tc.rank as computed_rank,
  coalesce(tf.name, 'Awaiting review') as final_tier, coalesce(tf.rank, 99) as final_rank,
  count(*) as assessments
from public.assessment_scores s
join public.risk_tiers tc on tc.id = s.computed_tier_id
left join public.risk_tiers tf on tf.id = s.final_tier_id
group by 1,2,3,4,5;

create or replace view public.dash_pipeline with (security_invoker = true) as
select organization_id, type as questionnaire_type, status,
  case status when 'draft' then 1 when 'sent' then 2 when 'in_progress' then 3
              when 'submitted' then 4 when 'reviewed' then 5 end as stage_order,
  count(*) as assessments
from public.assessments
group by 1,2,3,4;

create or replace view public.dash_risk_factor_heatmap with (security_invoker = true) as
select
  ans.organization_id,
  coalesce(tf.name, tc.name) as tier, coalesce(tf.rank, tc.rank) as tier_rank,
  q.category,
  round(avg(ans.points_snapshot / nullif(qmax.max_points,0)), 3) as avg_risk_0_to_1,
  count(*) as answers
from public.assessment_answers ans
join public.assessments a on a.id = ans.assessment_id and a.type = 'tiering'
join public.assessment_scores s on s.assessment_id = a.id
join public.risk_tiers tc on tc.id = s.computed_tier_id
left join public.risk_tiers tf on tf.id = s.final_tier_id
join public.questionnaire_questions q on q.id = ans.question_id
join lateral (select max(o.points) as max_points from public.question_options o where o.question_id = q.id) qmax on true
where ans.points_snapshot is not null
group by 1,2,3,4;

create or replace view public.dash_override_log with (security_invoker = true) as
select
  s.organization_id, v.name as vendor_name, e.name as engagement_name,
  s.score, tc.name as computed_tier, tf.name as final_tier,
  case when tf.rank < tc.rank then 'raised' else 'lowered' end as direction,
  s.override_reason, s.overridden_by, s.reviewed_at
from public.assessment_scores s
join public.assessments a on a.id = s.assessment_id
join public.vendor_engagements e on e.id = a.engagement_id
join public.vendors v on v.id = e.vendor_id
join public.risk_tiers tc on tc.id = s.computed_tier_id
join public.risk_tiers tf on tf.id = s.final_tier_id
where s.final_tier_id <> s.computed_tier_id;

create or replace view public.dash_followup_aging with (security_invoker = true) as
select
  f.organization_id, v.name as vendor_name, e.name as engagement_name,
  tf.name as tier, tf.rank as tier_rank, qt.name as followup_template,
  f.status, f.created_at as sent_at, f.submitted_at, f.expires_at,
  case when f.submitted_at is null
       then floor(extract(epoch from now() - f.created_at)/86400)::int end as days_open,
  case when f.submitted_at is not null
       then floor(extract(epoch from f.submitted_at - f.created_at)/86400)::int end as days_to_complete,
  case when f.submitted_at is null and f.expires_at is not null and f.expires_at < now() then true else false end as is_overdue
from public.assessments f
join public.vendor_engagements e on e.id = f.engagement_id
join public.vendors v on v.id = e.vendor_id
join public.questionnaire_templates qt on qt.id = f.template_id
left join public.assessment_scores s on s.assessment_id = f.parent_assessment_id
left join public.risk_tiers tf on tf.id = coalesce(s.final_tier_id, s.computed_tier_id)
where f.type = 'followup';

create or replace view public.dash_monthly_intake with (security_invoker = true) as
select
  e.organization_id,
  date_trunc('month', e.created_at)::date as month,
  count(*) as new_engagements,
  count(*) filter (where coalesce(tf.name, tc.name) = 'Critical') as critical,
  count(*) filter (where coalesce(tf.name, tc.name) = 'High') as high,
  count(*) filter (where coalesce(tf.name, tc.name) = 'Medium') as medium,
  count(*) filter (where coalesce(tf.name, tc.name) = 'Low') as low,
  count(*) filter (where s.assessment_id is null) as not_yet_scored
from public.vendor_engagements e
left join lateral (
  select * from public.assessments a0 where a0.engagement_id = e.id and a0.type = 'tiering'
  order by a0.created_at desc limit 1) a on true
left join public.assessment_scores s on s.assessment_id = a.id
left join public.risk_tiers tc on tc.id = s.computed_tier_id
left join public.risk_tiers tf on tf.id = s.final_tier_id
group by 1,2;

-- Only signed-in users (subject to RLS) can read the views.
revoke all on public.dash_vendor_register, public.dash_tier_distribution, public.dash_pipeline,
  public.dash_risk_factor_heatmap, public.dash_override_log, public.dash_followup_aging,
  public.dash_monthly_intake from anon;
grant select on public.dash_vendor_register, public.dash_tier_distribution, public.dash_pipeline,
  public.dash_risk_factor_heatmap, public.dash_override_log, public.dash_followup_aging,
  public.dash_monthly_intake to authenticated;
