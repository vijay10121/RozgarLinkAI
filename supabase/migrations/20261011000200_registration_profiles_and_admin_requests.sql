alter table public.profiles
  add column location text,
  add column designation text,
  add column specialization text,
  add column terms_accepted_at timestamptz;

alter table public.profiles
  add constraint profiles_location_length_check check (
    location is null or char_length(location) between 1 and 160
  ),
  add constraint profiles_designation_length_check check (
    designation is null or char_length(designation) between 1 and 120
  ),
  add constraint profiles_specialization_length_check check (
    specialization is null or char_length(specialization) between 1 and 160
  );

create type public.admin_access_request_status as enum (
  'pending',
  'approved',
  'rejected'
);

create table public.admin_access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  requested_sector public.organization_sector not null,
  organization_name text not null,
  designation text not null,
  status public.admin_access_request_status not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint admin_access_requests_user_id_key unique (user_id),
  constraint admin_access_requests_organization_name_length_check check (
    char_length(btrim(organization_name)) between 1 and 200
  ),
  constraint admin_access_requests_designation_length_check check (
    char_length(btrim(designation)) between 1 and 120
  ),
  constraint admin_access_requests_review_check check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null)
    or (status <> 'pending' and reviewed_by is not null and reviewed_at is not null)
  )
);

create index admin_access_requests_status_created_at_idx
  on public.admin_access_requests (status, created_at);

drop trigger on_auth_user_created_create_profile on auth.users;

create or replace function public.provision_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text;
  requested_sector public.organization_sector;
  requested_display_name text;
  requested_location text;
  requested_designation text;
  requested_specialization text;
  accepted_terms boolean;
  requested_organization_name text;
  provisioned_role public.application_role := 'job_seeker';
begin
  requested_role := new.raw_user_meta_data ->> 'account_type';
  accepted_terms :=
    coalesce(new.raw_user_meta_data ->> 'terms_accepted', 'false') = 'true';
  requested_display_name := nullif(
    left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 120),
    ''
  );

  if not accepted_terms then
    raise exception 'Terms acceptance is required to create an account'
      using errcode = '23514';
  end if;

  if requested_display_name is null then
    raise exception 'A full name is required to create an account'
      using errcode = '23514';
  end if;

  if requested_role in ('job_seeker', 'training_provider', 'admin') then
    if new.raw_user_meta_data ->> 'sector' in ('government', 'private') then
      requested_sector :=
        (new.raw_user_meta_data ->> 'sector')::public.organization_sector;
    end if;
  end if;

  if requested_role = 'job_seeker' then
    requested_location := nullif(
      left(btrim(coalesce(new.raw_user_meta_data ->> 'location', '')), 160),
      ''
    );
  elsif requested_role = 'training_provider' then
    requested_organization_name := nullif(
      left(btrim(coalesce(new.raw_user_meta_data ->> 'organization_name', '')), 200),
      ''
    );
    requested_specialization := nullif(
      left(btrim(coalesce(new.raw_user_meta_data ->> 'specialization', '')), 160),
      ''
    );

    if requested_sector is not null
      and requested_organization_name is not null
      and requested_specialization is not null
    then
      provisioned_role := 'training_provider';
    else
      requested_sector := null;
    end if;
  elsif requested_role = 'admin' then
    requested_organization_name := nullif(
      left(btrim(coalesce(new.raw_user_meta_data ->> 'organization_name', '')), 200),
      ''
    );
    requested_designation := nullif(
      left(btrim(coalesce(new.raw_user_meta_data ->> 'designation', '')), 120),
      ''
    );
  end if;

  insert into public.profiles (
    id,
    role,
    sector,
    display_name,
    location,
    designation,
    specialization,
    terms_accepted_at
  )
  values (
    new.id,
    provisioned_role,
    case when provisioned_role = 'training_provider' then requested_sector end,
    requested_display_name,
    requested_location,
    null,
    requested_specialization,
    case when accepted_terms then now() end
  )
  on conflict (id) do nothing;

  if provisioned_role = 'training_provider' then
    insert into public.organizations (name, sector, created_by, is_verified)
    values (
      requested_organization_name,
      requested_sector,
      new.id,
      false
    );
  elsif requested_role = 'admin'
    and requested_sector is not null
    and requested_organization_name is not null
    and requested_designation is not null
  then
    insert into public.admin_access_requests (
      user_id,
      requested_sector,
      organization_name,
      designation
    )
    values (
      new.id,
      requested_sector,
      requested_organization_name,
      requested_designation
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.provision_profile_for_auth_user();

create function public.admin_review_access_request(
  target_request_id uuid,
  approve boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  access_request public.admin_access_requests%rowtype;
begin
  if not public.is_active_admin() then
    raise exception 'Active administrator access required'
      using errcode = '42501';
  end if;

  select *
  into access_request
  from public.admin_access_requests
  where id = target_request_id
    and status = 'pending'::public.admin_access_request_status
  for update;

  if not found then
    raise exception 'Pending admin access request not found'
      using errcode = 'P0002';
  end if;

  update public.admin_access_requests
  set status = case
        when approve then 'approved'::public.admin_access_request_status
        else 'rejected'::public.admin_access_request_status
      end,
      reviewed_by = (select auth.uid()),
      reviewed_at = now()
  where id = target_request_id;

  if approve then
    update public.profiles
    set role = 'admin'::public.application_role,
        sector = access_request.requested_sector,
        designation = access_request.designation
    where id = access_request.user_id
      and role = 'job_seeker'::public.application_role
      and account_status = 'active'::public.account_status;

    if not found then
      raise exception 'Eligible profile for admin approval not found'
        using errcode = 'P0002';
    end if;

    insert into public.organizations (name, sector, created_by, is_verified)
    values (
      access_request.organization_name,
      access_request.requested_sector,
      access_request.user_id,
      false
    );
  end if;
end;
$$;

revoke all on table public.admin_access_requests from public, anon, authenticated;
grant select on table public.admin_access_requests to authenticated;

revoke all on function public.provision_profile_for_auth_user()
  from public, anon, authenticated;
revoke all on function public.admin_review_access_request(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.admin_review_access_request(uuid, boolean)
  to authenticated;

alter table public.admin_access_requests enable row level security;

create policy "Users can read their own admin access request"
on public.admin_access_requests
for select
to authenticated
using (
  (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles as profile
      where profile.id = (select auth.uid())
        and profile.account_status = 'active'::public.account_status
    )
  )
  or (select public.is_active_admin())
);
