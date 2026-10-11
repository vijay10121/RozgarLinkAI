create type public.application_role as enum (
  'job_seeker',
  'admin',
  'training_provider'
);

create type public.organization_sector as enum (
  'government',
  'private'
);

create type public.account_status as enum (
  'active',
  'suspended'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.application_role not null default 'job_seeker',
  sector public.organization_sector,
  display_name text,
  account_status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_sector_check check (
    (role = 'job_seeker' and sector is null)
    or (role in ('admin', 'training_provider') and sector is not null)
  ),
  constraint profiles_display_name_length_check check (
    display_name is null or char_length(display_name) between 1 and 120
  )
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sector public.organization_sector not null,
  created_by uuid default auth.uid()
    references public.profiles (id) on delete set null,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_name_length_check check (
    char_length(btrim(name)) between 1 and 200
  )
);

create index organizations_sector_idx on public.organizations (sector);
create index organizations_created_by_idx on public.organizations (created_by);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create function public.provision_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_display_name text;
begin
  requested_display_name := nullif(
    left(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 120),
    ''
  );

  insert into public.profiles (id, display_name)
  values (new.id, requested_display_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.provision_profile_for_auth_user();

insert into public.profiles (id, display_name)
select
  users.id,
  nullif(
    left(btrim(coalesce(users.raw_user_meta_data ->> 'display_name', '')), 120),
    ''
  )
from auth.users as users
on conflict (id) do nothing;

create function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = (select auth.uid())
      and profile.role = 'admin'::public.application_role
      and profile.account_status = 'active'::public.account_status
  );
$$;

create function public.can_manage_organization(
  target_sector public.organization_sector
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = (select auth.uid())
      and profile.account_status = 'active'::public.account_status
      and (
        profile.role = 'admin'::public.application_role
        or (
          profile.role = 'training_provider'::public.application_role
          and profile.sector = target_sector
        )
      )
  );
$$;

create function public.admin_update_profile(
  target_user_id uuid,
  new_role public.application_role,
  new_sector public.organization_sector,
  new_account_status public.account_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_active_admin() then
    raise exception 'Active administrator access required'
      using errcode = '42501';
  end if;

  update public.profiles
  set role = new_role,
      sector = new_sector,
      account_status = new_account_status
  where id = target_user_id;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
end;
$$;

create function public.admin_set_organization_verified(
  target_organization_id uuid,
  verified boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_active_admin() then
    raise exception 'Active administrator access required'
      using errcode = '42501';
  end if;

  update public.organizations
  set is_verified = verified
  where id = target_organization_id;

  if not found then
    raise exception 'Organization not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.provision_profile_for_auth_user()
  from public, anon, authenticated;
revoke all on function public.is_active_admin()
  from public, anon, authenticated;
revoke all on function public.can_manage_organization(
  public.organization_sector
) from public, anon, authenticated;
revoke all on function public.admin_update_profile(
  uuid,
  public.application_role,
  public.organization_sector,
  public.account_status
) from public, anon, authenticated;
revoke all on function public.admin_set_organization_verified(uuid, boolean)
  from public, anon, authenticated;

grant usage on type public.application_role to authenticated;
grant usage on type public.organization_sector to authenticated;
grant usage on type public.account_status to authenticated;

grant execute on function public.is_active_admin() to authenticated;
grant execute on function public.can_manage_organization(
  public.organization_sector
) to authenticated;
grant execute on function public.admin_update_profile(
  uuid,
  public.application_role,
  public.organization_sector,
  public.account_status
) to authenticated;
grant execute on function public.admin_set_organization_verified(
  uuid,
  boolean
) to authenticated;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;

revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.organizations from public, anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;
grant select on table public.organizations to authenticated;
grant insert (name, sector) on table public.organizations to authenticated;
grant update (name, sector) on table public.organizations to authenticated;

create policy "Users can read their profile and admins can read all profiles"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select public.is_active_admin())
);

create policy "Users can update their own display name"
on public.profiles
for update
to authenticated
using (
  id = (select auth.uid())
  and account_status = 'active'::public.account_status
)
with check (
  id = (select auth.uid())
  and account_status = 'active'::public.account_status
);

create policy "Users can read authorized organizations"
on public.organizations
for select
to authenticated
using (
  created_by = (select auth.uid())
  or is_verified
  or (select public.is_active_admin())
);

create policy "Providers and admins create unverified organizations"
on public.organizations
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and not is_verified
  and (select public.can_manage_organization(sector))
);

create policy "Owners can update their unverified organizations"
on public.organizations
for update
to authenticated
using (
  created_by = (select auth.uid())
  and not is_verified
  and (select public.can_manage_organization(sector))
)
with check (
  created_by = (select auth.uid())
  and not is_verified
  and (select public.can_manage_organization(sector))
);

create policy "Active admins can update organization details"
on public.organizations
for update
to authenticated
using ((select public.is_active_admin()))
with check ((select public.is_active_admin()));
