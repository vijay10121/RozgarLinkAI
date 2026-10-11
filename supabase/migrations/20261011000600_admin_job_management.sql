alter type public.application_status add value if not exists 'selected';

alter table public.profiles
  add column phone text,
  add constraint profiles_phone_length_check
    check (phone is null or char_length(phone) <= 40);

alter table public.organizations
  add column contact_email text,
  add column contact_phone text,
  add constraint organizations_contact_email_length_check
    check (contact_email is null or char_length(contact_email) <= 254),
  add constraint organizations_contact_phone_length_check
    check (contact_phone is null or char_length(contact_phone) <= 40);

alter table public.jobs
  add column owner_admin_id uuid references public.profiles(id) on delete restrict,
  add column application_instructions text not null default '',
  add column mandatory_education text,
  add column location_restrictions text[] not null default '{}',
  add constraint jobs_application_instructions_length_check
    check (char_length(application_instructions) <= 4000),
  add constraint jobs_mandatory_education_length_check
    check (mandatory_education is null or char_length(mandatory_education) <= 200),
  add constraint jobs_location_restrictions_count_check
    check (cardinality(location_restrictions) <= 50);

update public.jobs j
set owner_admin_id = o.created_by
from public.organizations o
join public.profiles p on p.id = o.created_by
where j.organization_id = o.id
  and p.role = 'admin'::public.application_role
  and j.owner_admin_id is null;

create index jobs_owner_admin_idx
  on public.jobs(owner_admin_id, status, created_at desc);

create table public.application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  changed_by uuid not null references public.profiles(id) on delete restrict,
  previous_status public.application_status not null,
  new_status public.application_status not null,
  changed_at timestamptz not null default now(),
  constraint application_status_history_change_check
    check (previous_status <> new_status)
);

create index application_status_history_application_idx
  on public.application_status_history(application_id, changed_at desc);

alter table public.application_status_history enable row level security;

drop policy if exists "Active admins can update organization details"
  on public.organizations;
drop policy if exists "Owners can update their unverified organizations"
  on public.organizations;

revoke update (name, sector) on public.organizations from authenticated;
grant update (name) on public.organizations to authenticated;
grant update (name, contact_email, contact_phone)
  on public.organizations to authenticated;
grant update (display_name, designation, phone)
  on public.profiles to authenticated;

create policy "Admins update only their own organization details"
on public.organizations for update to authenticated
using (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'::public.application_role
      and p.account_status = 'active'::public.account_status
  )
)
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'::public.application_role
      and p.account_status = 'active'::public.account_status
  )
);

create policy "Training providers update their own unverified organization details"
on public.organizations for update to authenticated
using (
  created_by = (select auth.uid())
  and not is_verified
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'training_provider'::public.application_role
      and p.sector = public.organizations.sector
      and p.account_status = 'active'::public.account_status
  )
)
with check (
  created_by = (select auth.uid())
  and not is_verified
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'training_provider'::public.application_role
      and p.sector = public.organizations.sector
      and p.account_status = 'active'::public.account_status
  )
);

drop policy if exists "Users can read their profile and admins can read all profiles"
  on public.profiles;
drop policy if exists "Users can read their own profile and admins can read all"
  on public.profiles;
create policy "Users read own profiles and admins read their applicants"
on public.profiles for select to authenticated
using (
  profiles.id = (select auth.uid())
  or (
    public.is_active_admin()
    and exists (
      select 1
      from public.applications a
      join public.jobs j on j.id = a.job_id
      join public.organizations o on o.id = j.organization_id
      where a.candidate_id = profiles.id
        and j.owner_admin_id = (select auth.uid())
        and o.created_by = (select auth.uid())
    )
  )
);

grant select on public.jobs to authenticated;
grant insert (
  organization_id,
  owner_admin_id,
  title,
  description,
  requirements,
  location,
  employment_type,
  required_skills,
  preferred_skills,
  required_qualifications,
  min_experience_years,
  application_deadline,
  application_instructions,
  mandatory_education,
  location_restrictions,
  status,
  published_at
) on public.jobs to authenticated;
grant update (
  title,
  description,
  requirements,
  location,
  employment_type,
  required_skills,
  preferred_skills,
  required_qualifications,
  min_experience_years,
  application_deadline,
  application_instructions,
  mandatory_education,
  location_restrictions,
  status
) on public.jobs to authenticated;
grant delete on public.jobs to authenticated;

create policy "Admins read jobs for their own organizations"
on public.jobs for select to authenticated
using (
  owner_admin_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'::public.application_role
      and p.account_status = 'active'::public.account_status
  )
  and exists (
    select 1 from public.organizations o
    where o.id = organization_id and o.created_by = (select auth.uid())
  )
);

create policy "Admins create jobs for their own organizations"
on public.jobs for insert to authenticated
with check (
  owner_admin_id = (select auth.uid())
  and status in (
    'draft'::public.job_publication_status,
    'published'::public.job_publication_status
  )
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'::public.application_role
      and p.account_status = 'active'::public.account_status
  )
  and exists (
    select 1 from public.organizations o
    where o.id = organization_id and o.created_by = (select auth.uid())
  )
);

create policy "Admins update jobs for their own organizations"
on public.jobs for update to authenticated
using (
  owner_admin_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'::public.application_role
      and p.account_status = 'active'::public.account_status
  )
  and exists (
    select 1 from public.organizations o
    where o.id = organization_id and o.created_by = (select auth.uid())
  )
)
with check (
  owner_admin_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'::public.application_role
      and p.account_status = 'active'::public.account_status
  )
  and exists (
    select 1 from public.organizations o
    where o.id = organization_id and o.created_by = (select auth.uid())
  )
);

create policy "Admins delete drafts for their own organizations"
on public.jobs for delete to authenticated
using (
  owner_admin_id = (select auth.uid())
  and status = 'draft'::public.job_publication_status
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'::public.application_role
      and p.account_status = 'active'::public.account_status
  )
  and exists (
    select 1 from public.organizations o
    where o.id = organization_id and o.created_by = (select auth.uid())
  )
);

create function public.guard_admin_job_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if old.status = 'closed'::public.job_publication_status then
      raise exception 'Closed jobs cannot be changed'
        using errcode = '22023';
    end if;
    if old.status = 'published'::public.job_publication_status
      and new.status = 'draft'::public.job_publication_status
    then
      raise exception 'Published jobs cannot be reverted to drafts'
        using errcode = '22023';
    end if;
  end if;

  if new.status = 'published'::public.job_publication_status then
    if new.application_deadline is not null
      and new.application_deadline < current_date
    then
      raise exception 'Published job deadline must not be in the past'
        using errcode = '22023';
    end if;
    if tg_op = 'INSERT' then
      new.published_at := now();
    elsif old.status = 'published'::public.job_publication_status then
      new.published_at := old.published_at;
    elsif old.status <> 'published'::public.job_publication_status then
      new.published_at := now();
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.guard_admin_job_mutation()
  from public, anon, authenticated;
create trigger jobs_guard_admin_mutation
before insert or update on public.jobs
for each row execute function public.guard_admin_job_mutation();

grant select on public.application_status_history to authenticated;
create policy "Admins read status history for their organization's applications"
on public.application_status_history for select to authenticated
using (
  public.is_active_admin()
  and exists (
    select 1
    from public.applications a
    join public.jobs j on j.id = a.job_id
    where a.id = application_id
      and j.owner_admin_id = (select auth.uid())
      and j.organization_id in (
        select o.id from public.organizations o
        where o.created_by = (select auth.uid())
      )
  )
);

create policy "Admins read applications for their own organization's jobs"
on public.applications for select to authenticated
using (
  exists (
    select 1
    from public.jobs j
    join public.organizations o on o.id = j.organization_id
    where j.id = job_id
      and j.owner_admin_id = (select auth.uid())
      and o.created_by = (select auth.uid())
  )
  and public.is_active_admin()
);
