drop policy "Active users can read their profile and admins can read all"
  on public.profiles;

create policy "Users can read their own profile and admins can read all"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select public.is_active_admin())
);
