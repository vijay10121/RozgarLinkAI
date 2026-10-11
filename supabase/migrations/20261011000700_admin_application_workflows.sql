create or replace function public.check_job_eligibility(target_job_id uuid)
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
  if target_job.mandatory_education is not null
    and lower(btrim(coalesce(candidate.education, ''))) <>
      lower(btrim(target_job.mandatory_education))
  then
    eligibility_reasons := array_append(eligibility_reasons, 'mandatory_education');
  end if;
  if cardinality(target_job.location_restrictions) > 0
    and not exists (
      select 1
      from unnest(target_job.location_restrictions) as restriction(value)
      where lower(btrim(restriction.value)) =
        lower(btrim(coalesce(candidate.location, '')))
        or exists (
          select 1
          from unnest(candidate.preferred_locations) as preferred(value)
          where lower(btrim(preferred.value)) = lower(btrim(restriction.value))
        )
    )
  then
    eligibility_reasons := array_append(eligibility_reasons, 'location_restriction');
  end if;

  return query select cardinality(eligibility_reasons) = 0, eligibility_reasons;
end;
$$;

create or replace function public.admin_update_application_status(
  target_application_id uuid,
  new_status public.application_status
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_application public.applications%rowtype;
  target_job public.jobs%rowtype;
begin
  if not exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'::public.application_role
      and p.account_status = 'active'::public.account_status
  ) then
    raise exception 'Active administrator access required'
      using errcode = '42501';
  end if;

  select a.* into current_application
  from public.applications a
  join public.jobs j on j.id = a.job_id
  join public.organizations o on o.id = j.organization_id
  where a.id = target_application_id
    and j.owner_admin_id = (select auth.uid())
    and o.created_by = (select auth.uid())
  for update of a;

  if not found then
    raise exception 'Application not found for your organization'
      using errcode = 'P0002';
  end if;

  if new_status not in (
    'submitted'::public.application_status,
    'under_review'::public.application_status,
    'shortlisted'::public.application_status,
    'rejected'::public.application_status,
    'selected'::public.application_status
  ) then
    raise exception 'Invalid application status' using errcode = '22023';
  end if;

  if current_application.status = new_status then
    raise exception 'Application already has this status' using errcode = '22023';
  end if;

  if not (
    (current_application.status = 'submitted'::public.application_status
      and new_status in (
        'under_review'::public.application_status,
        'rejected'::public.application_status
      ))
    or (current_application.status = 'under_review'::public.application_status
      and new_status in (
        'shortlisted'::public.application_status,
        'rejected'::public.application_status,
        'selected'::public.application_status
      ))
    or (current_application.status = 'shortlisted'::public.application_status
      and new_status in (
        'under_review'::public.application_status,
        'rejected'::public.application_status,
        'selected'::public.application_status
      ))
  ) then
    raise exception 'Application status transition is not allowed'
      using errcode = '22023';
  end if;

  select * into target_job
  from public.jobs
  where id = current_application.job_id;

  update public.applications
  set status = new_status,
      status_changed_at = now()
  where id = target_application_id;

  insert into public.application_status_history (
    application_id,
    changed_by,
    previous_status,
    new_status
  )
  values (
    target_application_id,
    (select auth.uid()),
    current_application.status,
    new_status
  );

  insert into public.notifications (user_id, title, body, href)
  values (
    current_application.candidate_id,
    'Application status updated',
    'Your application for ' || target_job.title || ' is now ' ||
      replace(new_status::text, '_', ' ') || '.',
    '/seeker/applied'
  );
end;
$$;

revoke all on function public.admin_update_application_status(
  uuid,
  public.application_status
) from public, anon, authenticated;
grant execute on function public.admin_update_application_status(
  uuid,
  public.application_status
) to authenticated;
