create or replace function public.normalize_matching_skill(skill text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  normalized text;
  compact text;
begin
  normalized := pg_catalog.regexp_replace(
    pg_catalog.lower(pg_catalog.btrim(skill)),
    '\s+',
    ' ',
    'g'
  );
  compact := pg_catalog.regexp_replace(normalized, '[^a-z0-9]+', '', 'g');

  return case
    when compact in ('javascript', 'js', 'ecmascript') then 'javascript'
    when compact in ('typescript', 'ts') then 'typescript'
    when compact in ('python', 'py') then 'python'
    when compact in ('postgresql', 'postgres', 'pgsql') then 'postgresql'
    when compact in ('microsoftexcel', 'excel', 'msexcel') then 'microsoft excel'
    when compact in ('react', 'reactjs') then 'react'
    when compact = 'reactnative' then 'react native'
    when compact in ('nodejs', 'node') then 'node.js'
    when compact = 'fastapi' then 'fastapi'
    when compact in ('machinelearning', 'ml') then 'machine learning'
    when compact in ('artificialintelligence', 'ai') then 'artificial intelligence'
    when compact in ('amazonwebservices', 'aws') then 'amazon web services'
    when compact in ('customerservice', 'customersupport', 'clientservice')
      then 'customer service'
    else normalized
  end;
end;
$$;

revoke all on function public.normalize_matching_skill(text) from public, anon;
grant execute on function public.normalize_matching_skill(text) to authenticated;

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
    where public.normalize_matching_skill(candidate_skill.value) =
      public.normalize_matching_skill(required_skill.value)
  );

  select coalesce(array_agg(required_qualification.value), '{}')
  into missing_qualifications
  from unnest(target_job.required_qualifications) as required_qualification(value)
  where not exists (
    select 1
    from unnest(candidate.qualifications) as candidate_qualification(value)
    where lower(btrim(candidate_qualification.value)) =
      lower(btrim(required_qualification.value))
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
