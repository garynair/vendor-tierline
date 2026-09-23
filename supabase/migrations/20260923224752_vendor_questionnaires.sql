-- Vendor Tierline: two-stage vendor questionnaire schema.
-- See docs/architecture.md. Additive only: Phase 1 tables (scenarios,
-- submissions, scores) are dropped in a later migration once the app no
-- longer reads them.
--
-- Cross-org safety: every child table carries organization_id and references
-- its parent through a composite (id, organization_id) foreign key, so a row
-- can never point at another org's vendor, template, tier, etc. RLS on every
-- table is then a flat current_user_role(organization_id) check.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.questionnaire_type as enum ('tiering', 'followup');

create type public.question_category as enum (
  'data_sensitivity',
  'regulatory_exposure',
  'cloud_infrastructure',
  'fourth_party',
  'breach_history',
  'service_criticality',
  'access_level',
  'other'
);

create type public.assessment_status as enum (
  'draft',        -- created, not yet sent or started
  'sent',         -- vendor invite issued
  'in_progress',  -- at least one answer saved
  'submitted',    -- answers locked and snapshotted (tiering: score computed)
  'reviewed'      -- tiering only: reviewer confirmed or overrode the tier
);

create type public.filled_by_type as enum ('vendor', 'internal');

-- ---------------------------------------------------------------------------
-- Vendors and engagements
-- ---------------------------------------------------------------------------

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  website text,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, name)
);

create table public.vendor_engagements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  vendor_id uuid not null,
  name text not null check (length(trim(name)) > 0),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (vendor_id, organization_id)
    references public.vendors (id, organization_id) on delete cascade
);
create index vendor_engagements_vendor_id_org_idx
  on public.vendor_engagements (vendor_id, organization_id);
create index vendor_engagements_organization_id_idx
  on public.vendor_engagements (organization_id);

-- ---------------------------------------------------------------------------
-- Risk tiers (org-configurable)
-- ---------------------------------------------------------------------------

-- rank 1 is the most severe tier. A score maps to the tier with the highest
-- min_score that is <= the score, so each org needs a tier at min_score 0.
create table public.risk_tiers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  rank smallint not null check (rank > 0),
  min_score numeric(5, 4) not null check (min_score between 0 and 1),
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, rank),
  unique (organization_id, name),
  unique (organization_id, min_score)
);

-- ---------------------------------------------------------------------------
-- Questionnaire templates
-- ---------------------------------------------------------------------------

create table public.questionnaire_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  type public.questionnaire_type not null,
  name text not null check (length(trim(name)) > 0),
  description text,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (id, organization_id, type)
);
-- One org-wide tiering template.
create unique index questionnaire_templates_one_tiering_per_org
  on public.questionnaire_templates (organization_id) where type = 'tiering';

create table public.questionnaire_questions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  template_id uuid not null,
  category public.question_category not null,
  prompt text not null check (length(trim(prompt)) > 0),
  weight numeric(6, 2) not null default 1 check (weight > 0),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (id, organization_id, template_id),
  foreign key (template_id, organization_id)
    references public.questionnaire_templates (id, organization_id) on delete cascade
);
create index questionnaire_questions_template_id_org_idx
  on public.questionnaire_questions (template_id, organization_id);
create index questionnaire_questions_organization_id_idx
  on public.questionnaire_questions (organization_id);

-- N/A is an ordinary option with its own points.
create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  question_id uuid not null,
  label text not null check (length(trim(label)) > 0),
  points numeric(6, 2) not null check (points >= 0),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (id, question_id),
  foreign key (question_id, organization_id)
    references public.questionnaire_questions (id, organization_id) on delete cascade
);
create index question_options_question_id_org_idx
  on public.question_options (question_id, organization_id);
create index question_options_organization_id_idx
  on public.question_options (organization_id);

-- Which follow-up template each tier gets. template_type pins the target to a
-- follow-up template through the composite FK.
create table public.template_tier_mappings (
  tier_id uuid primary key,
  organization_id uuid not null,
  template_id uuid not null,
  template_type public.questionnaire_type not null default 'followup'
    check (template_type = 'followup'),
  created_at timestamptz not null default now(),
  foreign key (tier_id, organization_id)
    references public.risk_tiers (id, organization_id) on delete cascade,
  foreign key (template_id, organization_id, template_type)
    references public.questionnaire_templates (id, organization_id, type) on delete cascade
);
create index template_tier_mappings_organization_id_idx
  on public.template_tier_mappings (organization_id);
create index template_tier_mappings_template_idx
  on public.template_tier_mappings (template_id, organization_id, template_type);

-- ---------------------------------------------------------------------------
-- Assessments
-- ---------------------------------------------------------------------------

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  engagement_id uuid not null,
  template_id uuid not null,
  type public.questionnaire_type not null,
  parent_assessment_id uuid,
  status public.assessment_status not null default 'draft',
  -- Only a SHA-256 of the invite token is stored; the raw token exists only
  -- in the link handed to the vendor.
  invite_token_hash bytea unique,
  expires_at timestamptz,
  filled_by_type public.filled_by_type,
  submitted_by uuid references auth.users (id),
  submitted_at timestamptz,
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (id, organization_id, template_id),
  unique (id, organization_id, engagement_id),
  foreign key (engagement_id, organization_id)
    references public.vendor_engagements (id, organization_id) on delete cascade,
  foreign key (template_id, organization_id, type)
    references public.questionnaire_templates (id, organization_id, type) on delete restrict,
  -- A follow-up's parent must be in the same org and the same engagement.
  foreign key (parent_assessment_id, organization_id, engagement_id)
    references public.assessments (id, organization_id, engagement_id) on delete cascade,
  check ((type = 'tiering') = (parent_assessment_id is null)),
  check (type = 'tiering' or status <> 'reviewed'),
  check (invite_token_hash is null or expires_at is not null),
  check ((status in ('submitted', 'reviewed')) = (submitted_at is not null))
);
create index assessments_organization_id_idx on public.assessments (organization_id);
create index assessments_engagement_id_org_idx on public.assessments (engagement_id, organization_id);
create index assessments_template_idx on public.assessments (template_id, organization_id, type);
create index assessments_parent_idx
  on public.assessments (parent_assessment_id, organization_id, engagement_id)
  where parent_assessment_id is not null;

-- organization_id and template_id are filled from the assessment by trigger;
-- the composite FKs then guarantee the question belongs to the assessment's
-- template and the option belongs to the question.
create table public.assessment_answers (
  assessment_id uuid not null,
  question_id uuid not null,
  organization_id uuid not null,
  template_id uuid not null,
  option_id uuid not null,
  -- Copied from the template at submit so later template edits never change
  -- a past score.
  points_snapshot numeric(6, 2),
  weight_snapshot numeric(6, 2),
  answered_by uuid references auth.users (id),
  answered_at timestamptz not null default now(),
  primary key (assessment_id, question_id),
  foreign key (assessment_id, organization_id, template_id)
    references public.assessments (id, organization_id, template_id) on delete cascade,
  foreign key (question_id, organization_id, template_id)
    references public.questionnaire_questions (id, organization_id, template_id) on delete restrict,
  foreign key (option_id, question_id)
    references public.question_options (id, question_id) on delete restrict
);
create index assessment_answers_assessment_fk_idx
  on public.assessment_answers (assessment_id, organization_id, template_id);
create index assessment_answers_question_fk_idx
  on public.assessment_answers (question_id, organization_id, template_id);
create index assessment_answers_option_fk_idx
  on public.assessment_answers (option_id, question_id);
create index assessment_answers_organization_id_idx
  on public.assessment_answers (organization_id);

create table public.assessment_scores (
  assessment_id uuid primary key,
  organization_id uuid not null,
  raw_score numeric(12, 4) not null,
  max_possible numeric(12, 4) not null,
  score numeric(5, 4) not null check (score between 0 and 1),
  computed_tier_id uuid not null,
  final_tier_id uuid,
  overridden_by uuid references auth.users (id),
  override_reason text,
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (assessment_id, organization_id)
    references public.assessments (id, organization_id) on delete cascade,
  foreign key (computed_tier_id, organization_id)
    references public.risk_tiers (id, organization_id) on delete restrict,
  foreign key (final_tier_id, organization_id)
    references public.risk_tiers (id, organization_id) on delete restrict,
  check ((final_tier_id is null) = (reviewed_at is null)),
  check ((reviewed_at is null) = (reviewed_by is null)),
  check (
    final_tier_id is null
    or final_tier_id = computed_tier_id
    or (overridden_by is not null and length(trim(coalesce(override_reason, ''))) > 0)
  )
);
create index assessment_scores_organization_id_idx on public.assessment_scores (organization_id);
create index assessment_scores_computed_tier_idx on public.assessment_scores (computed_tier_id, organization_id);
create index assessment_scores_final_tier_idx
  on public.assessment_scores (final_tier_id, organization_id) where final_tier_id is not null;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create function private.fill_answer_keys()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select a.organization_id, a.template_id
    into new.organization_id, new.template_id
  from public.assessments a
  where a.id = new.assessment_id;
  -- Snapshots are written only by private.finalize_assessment.
  if tg_op = 'INSERT' then
    new.points_snapshot := null;
    new.weight_snapshot := null;
  end if;
  -- answered_by is null when the vendor answers through a token link.
  if tg_op = 'INSERT' or new.option_id is distinct from old.option_id then
    new.answered_by := auth.uid();
    new.answered_at := now();
  end if;
  return new;
end;
$$;

create trigger assessment_answers_fill_keys
  before insert or update on public.assessment_answers
  for each row execute function private.fill_answer_keys();

-- Seed Critical / High / Medium / Low for every new org.
create function private.seed_default_risk_tiers()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.risk_tiers (organization_id, name, rank, min_score) values
    (new.id, 'Critical', 1, 0.75),
    (new.id, 'High',     2, 0.50),
    (new.id, 'Medium',   3, 0.25),
    (new.id, 'Low',      4, 0.00);
  return new;
end;
$$;

create trigger organizations_seed_risk_tiers
  after insert on public.organizations
  for each row execute function private.seed_default_risk_tiers();

insert into public.risk_tiers (organization_id, name, rank, min_score)
select o.id, t.name, t.rank, t.min_score
from public.organizations o
cross join (values
  ('Critical', 1, 0.75),
  ('High',     2, 0.50),
  ('Medium',   3, 0.25),
  ('Low',      4, 0.00)
) as t (name, rank, min_score)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Row-level security (org side)
-- ---------------------------------------------------------------------------

alter table public.vendors                 enable row level security;
alter table public.vendor_engagements      enable row level security;
alter table public.risk_tiers              enable row level security;
alter table public.questionnaire_templates enable row level security;
alter table public.questionnaire_questions enable row level security;
alter table public.question_options        enable row level security;
alter table public.template_tier_mappings  enable row level security;
alter table public.assessments             enable row level security;
alter table public.assessment_answers      enable row level security;
alter table public.assessment_scores       enable row level security;

-- Every member reads everything in their org.
create policy "members read vendors" on public.vendors
  for select to authenticated using (public.current_user_role(organization_id) is not null);
create policy "members read engagements" on public.vendor_engagements
  for select to authenticated using (public.current_user_role(organization_id) is not null);
create policy "members read risk tiers" on public.risk_tiers
  for select to authenticated using (public.current_user_role(organization_id) is not null);
create policy "members read templates" on public.questionnaire_templates
  for select to authenticated using (public.current_user_role(organization_id) is not null);
create policy "members read questions" on public.questionnaire_questions
  for select to authenticated using (public.current_user_role(organization_id) is not null);
create policy "members read options" on public.question_options
  for select to authenticated using (public.current_user_role(organization_id) is not null);
create policy "members read tier mappings" on public.template_tier_mappings
  for select to authenticated using (public.current_user_role(organization_id) is not null);
create policy "members read assessments" on public.assessments
  for select to authenticated using (public.current_user_role(organization_id) is not null);
create policy "members read answers" on public.assessment_answers
  for select to authenticated using (public.current_user_role(organization_id) is not null);
create policy "members read scores" on public.assessment_scores
  for select to authenticated using (public.current_user_role(organization_id) is not null);

-- Admins own org configuration: tiers, templates, questions, options, mappings.
create policy "admins manage risk tiers" on public.risk_tiers
  for all to authenticated
  using (public.current_user_role(organization_id) = 'admin')
  with check (public.current_user_role(organization_id) = 'admin');
create policy "admins manage templates" on public.questionnaire_templates
  for all to authenticated
  using (public.current_user_role(organization_id) = 'admin')
  with check (public.current_user_role(organization_id) = 'admin');
create policy "admins manage questions" on public.questionnaire_questions
  for all to authenticated
  using (public.current_user_role(organization_id) = 'admin')
  with check (public.current_user_role(organization_id) = 'admin');
create policy "admins manage options" on public.question_options
  for all to authenticated
  using (public.current_user_role(organization_id) = 'admin')
  with check (public.current_user_role(organization_id) = 'admin');
create policy "admins manage tier mappings" on public.template_tier_mappings
  for all to authenticated
  using (public.current_user_role(organization_id) = 'admin')
  with check (public.current_user_role(organization_id) = 'admin');

-- Admins and practitioners manage vendors and engagements.
create policy "staff manage vendors" on public.vendors
  for all to authenticated
  using (public.current_user_role(organization_id) in ('admin', 'practitioner'))
  with check (public.current_user_role(organization_id) in ('admin', 'practitioner'));
create policy "staff manage engagements" on public.vendor_engagements
  for all to authenticated
  using (public.current_user_role(organization_id) in ('admin', 'practitioner'))
  with check (public.current_user_role(organization_id) in ('admin', 'practitioner'));

-- Staff create tiering assessments directly (as drafts). Follow-ups, invites,
-- submission and review go through the RPCs below.
create policy "staff create tiering assessments" on public.assessments
  for insert to authenticated
  with check (
    public.current_user_role(organization_id) in ('admin', 'practitioner')
    and type = 'tiering'
    and status = 'draft'
  );
create policy "admins delete unsubmitted assessments" on public.assessments
  for delete to authenticated
  using (
    public.current_user_role(organization_id) = 'admin'
    and status in ('draft', 'sent', 'in_progress')
  );

-- Internal fill mode: staff answer on the vendor's behalf until submit.
create policy "staff answer open assessments" on public.assessment_answers
  for insert to authenticated
  with check (
    public.current_user_role(organization_id) in ('admin', 'practitioner')
    and exists (
      select 1 from public.assessments a
      where a.id = assessment_answers.assessment_id and a.status in ('draft', 'sent', 'in_progress')
    )
  );
create policy "staff change answers on open assessments" on public.assessment_answers
  for update to authenticated
  using (
    public.current_user_role(organization_id) in ('admin', 'practitioner')
    and exists (
      select 1 from public.assessments a
      where a.id = assessment_answers.assessment_id and a.status in ('draft', 'sent', 'in_progress')
    )
  )
  with check (public.current_user_role(organization_id) in ('admin', 'practitioner'));

-- ---------------------------------------------------------------------------
-- Table privileges
-- ---------------------------------------------------------------------------

-- anon never touches these tables; vendors use the token RPCs only.
revoke all on
  public.vendors, public.vendor_engagements, public.risk_tiers,
  public.questionnaire_templates, public.questionnaire_questions,
  public.question_options, public.template_tier_mappings,
  public.assessments, public.assessment_answers, public.assessment_scores
from anon, authenticated;

grant select, insert, update, delete on
  public.vendors, public.vendor_engagements, public.risk_tiers,
  public.questionnaire_templates, public.questionnaire_questions,
  public.question_options, public.template_tier_mappings
to authenticated;

-- Workflow columns (status, token, submission, snapshots) are writable only
-- through the security definer functions.
grant select, delete on public.assessments to authenticated;
grant insert (organization_id, engagement_id, template_id, type) on public.assessments to authenticated;

grant select on public.assessment_answers to authenticated;
grant insert (assessment_id, question_id, option_id) on public.assessment_answers to authenticated;
grant update (option_id) on public.assessment_answers to authenticated;

grant select on public.assessment_scores to authenticated;

-- ---------------------------------------------------------------------------
-- Internal helpers (private schema, not exposed through the API)
-- ---------------------------------------------------------------------------

create function private.token_hash(p_token text)
returns bytea
language sql
immutable
set search_path = ''
as $$
  select extensions.digest(p_token, 'sha256');
$$;

-- Resolves a live token to its assessment, validating the whole ownership
-- chain (assessment -> engagement -> vendor -> org, template -> org). The
-- composite FKs already guarantee this; the explicit joins keep the RPCs safe
-- even if a constraint is ever relaxed.
create function private.assessment_for_token(p_token text)
returns public.assessments
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_assessment public.assessments;
begin
  if p_token is null or length(p_token) < 32 then
    raise exception 'invalid or expired link' using errcode = 'P0002';
  end if;

  select a.* into v_assessment
  from public.assessments a
  join public.vendor_engagements e
    on e.id = a.engagement_id and e.organization_id = a.organization_id
  join public.vendors v
    on v.id = e.vendor_id and v.organization_id = a.organization_id
  join public.questionnaire_templates t
    on t.id = a.template_id and t.organization_id = a.organization_id
  where a.invite_token_hash = private.token_hash(p_token)
    and a.expires_at > now();

  if not found then
    raise exception 'invalid or expired link' using errcode = 'P0002';
  end if;
  return v_assessment;
end;
$$;

-- Locks answers, snapshots points and weights, scores tiering assessments,
-- and invalidates the invite token. Shared by vendor and internal submit.
create function private.finalize_assessment(
  p_assessment_id uuid,
  p_filled_by public.filled_by_type,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assessment public.assessments;
  v_missing integer;
  v_raw numeric;
  v_max numeric;
  v_score numeric;
  v_tier_id uuid;
begin
  select * into v_assessment
  from public.assessments
  where id = p_assessment_id
  for update;

  if not found then
    raise exception 'assessment not found' using errcode = 'P0002';
  end if;
  if v_assessment.status not in ('draft', 'sent', 'in_progress') then
    raise exception 'assessment is already submitted' using errcode = 'P0001';
  end if;

  select count(*) into v_missing
  from public.questionnaire_questions q
  where q.template_id = v_assessment.template_id
    and not exists (
      select 1 from public.assessment_answers ans
      where ans.assessment_id = p_assessment_id and ans.question_id = q.id
    );
  if v_missing > 0 then
    raise exception '% question(s) still need an answer', v_missing using errcode = 'P0001';
  end if;

  update public.assessment_answers ans
  set points_snapshot = o.points,
      weight_snapshot = q.weight
  from public.question_options o, public.questionnaire_questions q
  where ans.assessment_id = p_assessment_id
    and o.id = ans.option_id
    and q.id = ans.question_id;

  if v_assessment.type = 'tiering' then
    select coalesce(sum(ans.points_snapshot * ans.weight_snapshot), 0)
      into v_raw
    from public.assessment_answers ans
    where ans.assessment_id = p_assessment_id;

    select coalesce(sum(qmax.max_points * q.weight), 0)
      into v_max
    from public.questionnaire_questions q
    join lateral (
      select max(o.points) as max_points
      from public.question_options o
      where o.question_id = q.id
    ) qmax on true
    where q.template_id = v_assessment.template_id;

    v_score := case when v_max > 0 then round(v_raw / v_max, 4) else 0 end;

    select t.id into v_tier_id
    from public.risk_tiers t
    where t.organization_id = v_assessment.organization_id
      and t.min_score <= v_score
    order by t.min_score desc
    limit 1;

    if v_tier_id is null then
      raise exception 'no risk tier covers score %; add a tier with min_score 0', v_score
        using errcode = 'P0001';
    end if;

    insert into public.assessment_scores
      (assessment_id, organization_id, raw_score, max_possible, score, computed_tier_id)
    values
      (p_assessment_id, v_assessment.organization_id, v_raw, v_max, v_score, v_tier_id);
  end if;

  update public.assessments
  set status = 'submitted',
      submitted_at = now(),
      submitted_by = p_user_id,
      filled_by_type = p_filled_by,
      invite_token_hash = null,
      expires_at = null
  where id = p_assessment_id;
end;
$$;

revoke all on function private.fill_answer_keys() from public, anon, authenticated;
revoke all on function private.seed_default_risk_tiers() from public, anon, authenticated;
revoke all on function private.token_hash(text) from public, anon, authenticated;
revoke all on function private.assessment_for_token(text) from public, anon, authenticated;
revoke all on function private.finalize_assessment(uuid, public.filled_by_type, uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Vendor RPCs (anon, token-authenticated)
-- ---------------------------------------------------------------------------

-- Returns the questionnaire and saved answers for a vendor link. Points and
-- weights are deliberately left out so vendors can't tune answers to a tier.
create function public.get_assessment_for_token(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_assessment public.assessments;
begin
  v_assessment := private.assessment_for_token(p_token);

  return (
    select jsonb_build_object(
      'assessment', jsonb_build_object(
        'id', v_assessment.id,
        'type', v_assessment.type,
        'status', v_assessment.status,
        'expires_at', v_assessment.expires_at
      ),
      'vendor', jsonb_build_object('name', v.name),
      'engagement', jsonb_build_object('name', e.name, 'description', e.description),
      'template', jsonb_build_object('name', t.name, 'description', t.description),
      'questions', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', q.id,
            'category', q.category,
            'prompt', q.prompt,
            'options', coalesce((
              select jsonb_agg(jsonb_build_object('id', o.id, 'label', o.label)
                               order by o.position, o.created_at)
              from public.question_options o
              where o.question_id = q.id
            ), '[]'::jsonb)
          )
          order by q.position, q.created_at
        )
        from public.questionnaire_questions q
        where q.template_id = v_assessment.template_id
      ), '[]'::jsonb),
      'answers', coalesce((
        select jsonb_object_agg(ans.question_id, ans.option_id)
        from public.assessment_answers ans
        where ans.assessment_id = v_assessment.id
      ), '{}'::jsonb)
    )
    from public.vendor_engagements e
    join public.vendors v on v.id = e.vendor_id
    join public.questionnaire_templates t on t.id = v_assessment.template_id
    where e.id = v_assessment.engagement_id
  );
end;
$$;

-- Autosave a single answer so vendors can leave and resume.
create function public.save_assessment_answer(
  p_token text,
  p_question_id uuid,
  p_option_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assessment public.assessments;
begin
  v_assessment := private.assessment_for_token(p_token);

  if v_assessment.status not in ('sent', 'in_progress') then
    raise exception 'this questionnaire can no longer be edited' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.questionnaire_questions q
    join public.question_options o on o.question_id = q.id
    where q.id = p_question_id
      and q.template_id = v_assessment.template_id
      and o.id = p_option_id
  ) then
    raise exception 'invalid question or option' using errcode = 'P0001';
  end if;

  insert into public.assessment_answers (assessment_id, question_id, option_id)
  values (v_assessment.id, p_question_id, p_option_id)
  on conflict (assessment_id, question_id)
  do update set option_id = excluded.option_id;

  if v_assessment.status = 'sent' then
    update public.assessments set status = 'in_progress' where id = v_assessment.id;
  end if;
end;
$$;

create function public.submit_assessment(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assessment public.assessments;
begin
  v_assessment := private.assessment_for_token(p_token);
  perform private.finalize_assessment(v_assessment.id, 'vendor', null);
end;
$$;

-- ---------------------------------------------------------------------------
-- Staff RPCs (authenticated)
-- ---------------------------------------------------------------------------

-- Issues (or reissues) a vendor link. Returns the raw token once; only its
-- hash is stored. Reissuing invalidates the previous link.
create function public.issue_assessment_invite(
  p_assessment_id uuid,
  p_valid_for interval default interval '14 days'
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assessment public.assessments;
  v_token text;
begin
  select * into v_assessment from public.assessments where id = p_assessment_id for update;
  if not found
     or public.current_user_role(v_assessment.organization_id) not in ('admin', 'practitioner')
     or public.current_user_role(v_assessment.organization_id) is null then
    raise exception 'assessment not found' using errcode = 'P0002';
  end if;
  if v_assessment.status not in ('draft', 'sent', 'in_progress') then
    raise exception 'assessment is already submitted' using errcode = 'P0001';
  end if;
  if p_valid_for <= interval '0' or p_valid_for > interval '90 days' then
    raise exception 'link validity must be between 0 and 90 days' using errcode = '22023';
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  update public.assessments
  set invite_token_hash = private.token_hash(v_token),
      expires_at = now() + p_valid_for,
      status = case when status = 'draft' then 'sent'::public.assessment_status else status end
  where id = p_assessment_id;

  return v_token;
end;
$$;

-- Internal fill mode: staff submit on the vendor's behalf.
create function public.submit_assessment_internal(p_assessment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id from public.assessments where id = p_assessment_id;
  if v_org_id is null
     or public.current_user_role(v_org_id) is null
     or public.current_user_role(v_org_id) not in ('admin', 'practitioner') then
    raise exception 'assessment not found' using errcode = 'P0002';
  end if;
  perform private.finalize_assessment(p_assessment_id, 'internal', (select auth.uid()));
end;
$$;

-- Reviewer confirms (final = computed) or overrides (with a reason) the tier.
create function public.review_assessment(
  p_assessment_id uuid,
  p_final_tier_id uuid,
  p_override_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assessment public.assessments;
  v_score public.assessment_scores;
  v_uid uuid := (select auth.uid());
begin
  select * into v_assessment from public.assessments where id = p_assessment_id for update;
  if not found
     or public.current_user_role(v_assessment.organization_id) is null
     or public.current_user_role(v_assessment.organization_id) not in ('admin', 'practitioner') then
    raise exception 'assessment not found' using errcode = 'P0002';
  end if;
  if v_assessment.type <> 'tiering' or v_assessment.status <> 'submitted' then
    raise exception 'only a submitted, unreviewed tiering assessment can be reviewed'
      using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.risk_tiers
    where id = p_final_tier_id and organization_id = v_assessment.organization_id
  ) then
    raise exception 'unknown risk tier' using errcode = 'P0001';
  end if;

  select * into v_score from public.assessment_scores where assessment_id = p_assessment_id;

  if p_final_tier_id <> v_score.computed_tier_id
     and length(trim(coalesce(p_override_reason, ''))) = 0 then
    raise exception 'an override reason is required when changing the tier' using errcode = 'P0001';
  end if;

  update public.assessment_scores
  set final_tier_id = p_final_tier_id,
      overridden_by = case when p_final_tier_id <> computed_tier_id then v_uid end,
      override_reason = case when p_final_tier_id <> computed_tier_id then trim(p_override_reason) end,
      reviewed_by = v_uid,
      reviewed_at = now()
  where assessment_id = p_assessment_id;

  update public.assessments set status = 'reviewed' where id = p_assessment_id;
end;
$$;

-- Creates the Stage 2 follow-up for a reviewed tiering assessment. Uses the
-- template mapped to the final tier unless the admin picks another one.
create function public.create_followup_assessment(
  p_tiering_assessment_id uuid,
  p_template_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent public.assessments;
  v_template_id uuid;
  v_id uuid;
begin
  select * into v_parent from public.assessments where id = p_tiering_assessment_id;
  if not found or public.current_user_role(v_parent.organization_id) is distinct from 'admin' then
    raise exception 'assessment not found' using errcode = 'P0002';
  end if;
  if v_parent.type <> 'tiering' or v_parent.status <> 'reviewed' then
    raise exception 'the tier must be reviewed before sending a follow-up' using errcode = 'P0001';
  end if;

  v_template_id := p_template_id;
  if v_template_id is null then
    select m.template_id into v_template_id
    from public.assessment_scores s
    join public.template_tier_mappings m on m.tier_id = s.final_tier_id
    where s.assessment_id = p_tiering_assessment_id;

    if v_template_id is null then
      raise exception 'no follow-up template is mapped to this tier' using errcode = 'P0001';
    end if;
  end if;

  -- The composite FK rejects a template from another org or of the wrong type.
  insert into public.assessments
    (organization_id, engagement_id, template_id, type, parent_assessment_id)
  values
    (v_parent.organization_id, v_parent.engagement_id, v_template_id, 'followup', v_parent.id)
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------

revoke all on function public.get_assessment_for_token(text) from public, anon, authenticated;
revoke all on function public.save_assessment_answer(text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.submit_assessment(text) from public, anon, authenticated;
revoke all on function public.issue_assessment_invite(uuid, interval) from public, anon, authenticated;
revoke all on function public.submit_assessment_internal(uuid) from public, anon, authenticated;
revoke all on function public.review_assessment(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.create_followup_assessment(uuid, uuid) from public, anon, authenticated;

grant execute on function public.get_assessment_for_token(text) to anon, authenticated;
grant execute on function public.save_assessment_answer(text, uuid, uuid) to anon, authenticated;
grant execute on function public.submit_assessment(text) to anon, authenticated;

grant execute on function public.issue_assessment_invite(uuid, interval) to authenticated;
grant execute on function public.submit_assessment_internal(uuid) to authenticated;
grant execute on function public.review_assessment(uuid, uuid, text) to authenticated;
grant execute on function public.create_followup_assessment(uuid, uuid) to authenticated;
