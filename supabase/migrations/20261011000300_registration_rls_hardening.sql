drop policy "Users can read their profile and admins can read all profiles"
  on public.profiles;

create policy "Active users can read their profile and admins can read all"
on public.profiles
for select
to authenticated
using (
  (
    id = (select auth.uid())
    and account_status = 'active'::public.account_status
  )
  or (select public.is_active_admin())
);

drop policy "Users can read authorized organizations"
  on public.organizations;

create policy "Active users can read authorized organizations"
on public.organizations
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles as profile
    where profile.id = (select auth.uid())
      and profile.account_status = 'active'::public.account_status
      and (
        profile.role = 'admin'::public.application_role
        or is_verified
        or created_by = (select auth.uid())
      )
  )
);
