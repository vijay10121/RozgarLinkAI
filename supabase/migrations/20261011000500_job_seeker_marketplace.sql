create type public.job_publication_status as enum (
  'draft',
  'published',
  'closed'
);

create type public.course_publication_status as enum (
  'draft',
  'published',
  'closed'
);

create type public.application_status as enum (
  'submitted',
  'under_review',
  'shortlisted',
  'rejected',
  'withdrawn'
);

create type public.course_interaction_type as enum (
  'link_click',
  'inquiry'
);

alter table public.profiles
  add column education text,
  add column qualifications text[] not null default '{}',
  add column skills text[] not null default '{}',
  add column experience_years numeric(5, 2),
  add column preferred_roles text[] not null default '{}',
  add column preferred_locations text[] not null default '{}',
  add column resume_path text,
  add constraint profiles_education_length_check
    check (education is null or char_length(education) <= 2000),
  add constraint profiles_experience_years_check
    check (experience_years is null or experience_years between 0 and 80);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  title text not null,
  description text not null,
  requirements text not null default '',
  location text not null,
  employment_type text not null,
  required_skills text[] not null default '{}',
  preferred_skills text[] not null default '{}',
  required_qualifications text[] not null default '{}',
  min_experience_years numeric(5, 2) not null default 0,
  application_deadline date,
  status public.job_publication_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_title_length_check check (char_length(btrim(title)) between 1 and 200),
  constraint jobs_description_length_check check (char_length(btrim(description)) between 1 and 20000),
  constraint jobs_location_length_check check (char_length(btrim(location)) between 1 and 200),
  constraint jobs_employment_type_check check (
    employment_type in ('full_time', 'part_time', 'contract', 'internship', 'temporary')
  ),
  constraint jobs_min_experience_check check (min_experience_years between 0 and 80)
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  title text not null,
  description text not null,
  skills_taught text[] not null default '{}',
  delivery_mode text not null,
  duration text,
  course_url text not null,
  status public.course_publication_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_title_length_check check (char_length(btrim(title)) between 1 and 200),
  constraint courses_description_length_check check (char_length(btrim(description)) between 1 and 20000),
  constraint courses_delivery_mode_check check (delivery_mode in ('online', 'in_person', 'hybrid')),
  constraint courses_url_check check (course_url ~ '^https?://')
);

create table public.saved_jobs (
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (candidate_id, job_id)
);

create table public.saved_courses (
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (candidate_id, course_id)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  status public.application_status not null default 'submitted',
  status_changed_at timestamptz not null default now(),
  unique (candidate_id, job_id)
);

create table public.course_interactions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  interaction_type public.course_interaction_type not null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_title_length_check check (char_length(btrim(title)) between 1 and 200),
  constraint notifications_body_length_check check (char_length(btrim(body)) between 1 and 4000),
  constraint notifications_internal_href_check check (
    href is null or (href like '/%' and href not like '//%')
  )
);

create index jobs_published_search_idx on public.jobs(status, published_at desc);
create index jobs_location_idx on public.jobs(location);
create index courses_published_idx on public.courses(status, published_at desc);
create index saved_jobs_candidate_idx on public.saved_jobs(candidate_id, created_at desc);
create index saved_courses_candidate_idx on public.saved_courses(candidate_id, created_at desc);
create index applications_candidate_idx on public.applications(candidate_id, submitted_at desc);
create index notifications_user_idx on public.notifications(user_id, created_at desc);
create index course_interactions_candidate_idx on public.course_interactions(candidate_id, created_at desc);

create trigger jobs_set_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();
create trigger courses_set_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.courses enable row level security;
alter table public.saved_jobs enable row level security;
alter table public.saved_courses enable row level security;
alter table public.applications enable row level security;
alter table public.course_interactions enable row level security;
alter table public.notifications enable row level security;

grant select on public.jobs, public.courses to authenticated;
grant select, insert, delete on public.saved_jobs, public.saved_courses to authenticated;
grant select on public.applications to authenticated;
grant select on public.course_interactions to authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant update (
  display_name,
  location,
  education,
  qualifications,
  skills,
  experience_years,
  preferred_roles,
  preferred_locations,
  resume_path
) on public.profiles to authenticated;

create policy "Active candidates can update their own candidate profile"
on public.profiles for update to authenticated
using (
  id = (select auth.uid())
  and role = 'job_seeker'::public.application_role
  and account_status = 'active'::public.account_status
)
with check (
  id = (select auth.uid())
  and role = 'job_seeker'::public.application_role
  and account_status = 'active'::public.account_status
);

create policy "Active users can read published jobs"
on public.jobs for select to authenticated
using (
  status = 'published'::public.job_publication_status
  and (application_deadline is null or application_deadline >= current_date)
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.account_status = 'active'::public.account_status
  )
);

create policy "Active users can read published courses"
on public.courses for select to authenticated
using (
  status = 'published'::public.course_publication_status
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.account_status = 'active'::public.account_status
  )
);

create policy "Candidates manage their own saved jobs"
on public.saved_jobs for all to authenticated
using (
  candidate_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'job_seeker'::public.application_role
      and p.account_status = 'active'::public.account_status
  )
)
with check (
  candidate_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'job_seeker'::public.application_role
      and p.account_status = 'active'::public.account_status
  )
  and exists (
    select 1 from public.jobs j
    where j.id = job_id
      and j.status = 'published'::public.job_publication_status
      and (j.application_deadline is null or j.application_deadline >= current_date)
  )
);

create policy "Candidates manage their own saved courses"
on public.saved_courses for all to authenticated
using (
  candidate_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'job_seeker'::public.application_role
      and p.account_status = 'active'::public.account_status
  )
)
with check (
  candidate_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'job_seeker'::public.application_role
      and p.account_status = 'active'::public.account_status
  )
  and exists (
    select 1 from public.courses c
    where c.id = course_id
      and c.status = 'published'::public.course_publication_status
  )
);

create policy "Candidates read their own applications"
on public.applications for select to authenticated
using (
  candidate_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'job_seeker'::public.application_role
      and p.account_status = 'active'::public.account_status
  )
);

create policy "Candidates read their own course interactions"
on public.course_interactions for select to authenticated
using (
  candidate_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'job_seeker'::public.application_role
      and p.account_status = 'active'::public.account_status
  )
);

create policy "Users read their own notifications"
on public.notifications for select to authenticated
using (user_id = (select auth.uid()));

create policy "Users mark their own notifications read"
on public.notifications for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create function public.check_job_eligibility(target_job_id uuid)
returns table (eligible boolean, reasons text[])
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  candidate public.profiles%rowtype;
  target_job public.jobs%rowtype;
  missing_skills text[];
  missing_qualifications text[];
  eligibility_reasons text[] := '{}';
begin
  select * into candidate
  from public.profiles
  where id = (select auth.uid())
    and role = 'job_seeker'::public.application_role
    and account_status = 'active'::public.account_status;

  if not found then
    raise exception 'Active job seeker account required' using errcode = '42501';
  end if;

  select * into target_job
  from public.jobs
  where id = target_job_id
    and status = 'published'::public.job_publication_status
    and (application_deadline is null or application_deadline >= current_date);

  if not found then
    raise exception 'Job is not available' using errcode = 'P0002';
  end if;

  select coalesce(array_agg(required_skill.value), '{}')
  into missing_skills
  from unnest(target_job.required_skills) as required_skill(value)
  where not exists (
    select 1
    from unnest(candidate.skills) as candidate_skill(value)
    where lower(btrim(candidate_skill.value)) = lower(btrim(required_skill.value))
  );

  select coalesce(array_agg(required_qualification.value), '{}')
  into missing_qualifications
  from unnest(target_job.required_qualifications) as required_qualification(value)
  where not exists (
    select 1
    from unnest(candidate.qualifications) as candidate_qualification(value)
    where lower(btrim(candidate_qualification.value)) = lower(btrim(required_qualification.value))
  );

  if cardinality(missing_skills) > 0 then
    eligibility_reasons := array_append(eligibility_reasons, 'missing_required_skills');
  end if;
  if cardinality(missing_qualifications) > 0 then
    eligibility_reasons := array_append(eligibility_reasons, 'missing_required_qualifications');
  end if;
  if coalesce(candidate.experience_years, 0) < target_job.min_experience_years then
    eligibility_reasons := array_append(eligibility_reasons, 'insufficient_experience');
  end if;

  return query select cardinality(eligibility_reasons) = 0, eligibility_reasons;
end;
$$;

create function public.apply_to_job(target_job_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  eligibility record;
  inserted_application_id uuid;
begin
  select * into eligibility
  from public.check_job_eligibility(target_job_id);

  if not eligibility.eligible then
    raise exception 'Candidate is not eligible: %', array_to_string(eligibility.reasons, ', ')
      using errcode = '42501';
  end if;

  insert into public.applications (candidate_id, job_id)
  values ((select auth.uid()), target_job_id)
  returning id into inserted_application_id;

  return inserted_application_id;
exception
  when unique_violation then
    raise exception 'Application already submitted' using errcode = '23505';
end;
$$;

create function public.record_course_interaction(
  target_course_id uuid,
  interaction public.course_interaction_type
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  interaction_id uuid;
begin
  if not exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role = 'job_seeker'::public.application_role
      and account_status = 'active'::public.account_status
  ) then
    raise exception 'Active job seeker account required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.courses
    where id = target_course_id
      and status = 'published'::public.course_publication_status
  ) then
    raise exception 'Course is not available' using errcode = 'P0002';
  end if;

  insert into public.course_interactions (candidate_id, course_id, interaction_type)
  values ((select auth.uid()), target_course_id, interaction)
  returning id into interaction_id;

  return interaction_id;
end;
$$;

revoke all on function public.check_job_eligibility(uuid) from public, anon;
revoke all on function public.apply_to_job(uuid) from public, anon;
revoke all on function public.record_course_interaction(
  uuid,
  public.course_interaction_type
) from public, anon;
grant execute on function public.check_job_eligibility(uuid) to authenticated;
grant execute on function public.apply_to_job(uuid) to authenticated;
grant usage on type public.job_publication_status to authenticated;
grant usage on type public.course_publication_status to authenticated;
grant usage on type public.application_status to authenticated;
grant usage on type public.course_interaction_type to authenticated;
grant execute on function public.record_course_interaction(
  uuid,
  public.course_interaction_type
) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'private-resumes',
  'private-resumes',
  false,
  5242880,
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Candidates upload resumes to their own private folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'private-resumes'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'job_seeker'::public.application_role
      and p.account_status = 'active'::public.account_status
  )
);

create policy "Candidates read their own private resumes"
on storage.objects for select to authenticated
using (
  bucket_id = 'private-resumes'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Candidates delete their own private resumes"
on storage.objects for delete to authenticated
using (
  bucket_id = 'private-resumes'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
