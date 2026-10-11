create or replace function public.admin_review_access_request(
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

  if approve and not exists (
    select 1
    from auth.users u
    where u.id = access_request.user_id
      and u.email_confirmed_at is not null
  ) then
    raise exception 'Applicant email must be confirmed before approval'
      using errcode = '22023';
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

  insert into public.notifications (user_id, title, body, href)
  values (
    access_request.user_id,
    case when approve then 'Admin access approved' else 'Admin access request update' end,
    case
      when approve then
        'Your email is confirmed and your administrator access request has been approved. Log in again to open the admin workspace.'
      else
        'Your administrator access request was not approved. Your account remains available as a job seeker.'
    end,
    case when approve then '/login' else '/seeker/dashboard' end
  );
end;
$$;

revoke all on function public.admin_review_access_request(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.admin_review_access_request(uuid, boolean)
  to authenticated;
