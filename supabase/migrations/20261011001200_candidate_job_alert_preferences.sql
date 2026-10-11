alter table public.profiles
  add column job_alerts_enabled boolean not null default false;

grant update (job_alerts_enabled) on public.profiles to authenticated;

create function public.notify_candidates_of_matching_job()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (tg_op = 'UPDATE'
      and old.status = 'published'::public.job_publication_status)
    or new.status <> 'published'::public.job_publication_status
  then
    return new;
  end if;

  insert into public.notifications (user_id, title, body, href)
  select candidate.id,
         'A new job matches your preferences',
         'A newly published opportunity may match your saved role, location, or skills.',
         '/seeker/jobs/' || new.id::text
  from public.profiles candidate
  where candidate.role = 'job_seeker'::public.application_role
    and candidate.account_status = 'active'::public.account_status
    and candidate.job_alerts_enabled
    and (
      exists (
        select 1
        from unnest(candidate.preferred_roles) as role_preference(value)
        where position(
          lower(btrim(role_preference.value)) in lower(new.title)
        ) > 0
      )
      or exists (
        select 1
        from unnest(candidate.preferred_locations) as location_preference(value)
        where lower(btrim(location_preference.value)) = lower(btrim(new.location))
      )
      or lower(btrim(coalesce(candidate.location, ''))) = lower(btrim(new.location))
      or exists (
        select 1
        from unnest(candidate.skills) as candidate_skill(value)
        cross join unnest(
          coalesce(new.required_skills, '{}') ||
          coalesce(new.preferred_skills, '{}')
        ) as job_skill(value)
        where public.normalize_matching_skill(candidate_skill.value) =
          public.normalize_matching_skill(job_skill.value)
      )
    );

  return new;
end;
$$;

revoke all on function public.notify_candidates_of_matching_job()
  from public, anon, authenticated;

create trigger jobs_notify_candidates_on_insert
after insert on public.jobs
for each row execute function public.notify_candidates_of_matching_job();

create trigger jobs_notify_candidates_on_publish
after update of status on public.jobs
for each row execute function public.notify_candidates_of_matching_job();
