create function public.notify_job_owner_of_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, title, body, href)
  select owner.id,
         'New job application',
         'A candidate applied for "' || job.title || '".',
         '/admin/applications'
  from public.jobs job
  join public.organizations organization
    on organization.id = job.organization_id
   and organization.created_by = job.owner_admin_id
  join public.profiles owner
    on owner.id = job.owner_admin_id
   and owner.role = 'admin'::public.application_role
   and owner.account_status = 'active'::public.account_status
  where job.id = new.job_id;

  return new;
end;
$$;

revoke all on function public.notify_job_owner_of_application()
  from public, anon, authenticated;

create trigger applications_notify_job_owner
after insert on public.applications
for each row execute function public.notify_job_owner_of_application();
