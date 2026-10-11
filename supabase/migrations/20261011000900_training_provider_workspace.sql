alter table public.courses
  add column owner_provider_id uuid references public.profiles(id) on delete restrict,
  add column specialization text not null default '',
  add column difficulty_level text not null default 'beginner',
  add column image_path text,
  add constraint courses_skills_taught_count_check
    check (cardinality(skills_taught) <= 50),
  add constraint courses_duration_length_check
    check (duration is null or char_length(duration) <= 120),
  add constraint courses_specialization_length_check
    check (char_length(specialization) <= 160),
  add constraint courses_difficulty_level_check
    check (difficulty_level in ('beginner', 'intermediate', 'advanced')),
  add constraint courses_image_path_check
    check (
      image_path is null
      or image_path like owner_provider_id::text || '/%'
    );

update public.courses c
set owner_provider_id = o.created_by
from public.organizations o
join public.profiles p on p.id = o.created_by
where c.organization_id = o.id
  and p.role = 'training_provider'::public.application_role
  and c.owner_provider_id is null;

create index courses_owner_provider_idx
  on public.courses(owner_provider_id, status, created_at desc);

alter table public.organizations
  add column description text not null default '',
  add constraint organizations_description_length_check
    check (char_length(description) <= 4000);

grant update (specialization) on public.profiles to authenticated;
grant update (name, description, contact_email, contact_phone)
  on public.organizations to authenticated;

create policy "Training providers read their own courses"
on public.courses for select to authenticated
using (
  owner_provider_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'training_provider'::public.application_role
      and p.account_status = 'active'::public.account_status
  )
);

grant insert (
  organization_id,
  title,
  description,
  skills_taught,
  delivery_mode,
  duration,
  course_url,
  status,
  specialization,
  difficulty_level,
  image_path,
  owner_provider_id
) on public.courses to authenticated;

grant update (
  title,
  description,
  skills_taught,
  delivery_mode,
  duration,
  course_url,
  status,
  specialization,
  difficulty_level,
  image_path
) on public.courses to authenticated;

create policy "Training providers create courses for their own organizations"
on public.courses for insert to authenticated
with check (
  owner_provider_id = (select auth.uid())
  and status in (
    'draft'::public.course_publication_status,
    'published'::public.course_publication_status
  )
  and exists (
    select 1
    from public.profiles p
    join public.organizations o
      on o.created_by = p.id
      and o.id = organization_id
      and o.sector = p.sector
    where p.id = (select auth.uid())
      and p.role = 'training_provider'::public.application_role
      and p.account_status = 'active'::public.account_status
  )
);

create policy "Training providers update their own courses"
on public.courses for update to authenticated
using (
  owner_provider_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    join public.organizations o
      on o.created_by = p.id
      and o.id = organization_id
      and o.sector = p.sector
    where p.id = (select auth.uid())
      and p.role = 'training_provider'::public.application_role
      and p.account_status = 'active'::public.account_status
  )
)
with check (
  owner_provider_id = (select auth.uid())
  and status in (
    'draft'::public.course_publication_status,
    'published'::public.course_publication_status,
    'closed'::public.course_publication_status
  )
  and exists (
    select 1
    from public.profiles p
    join public.organizations o
      on o.created_by = p.id
      and o.id = organization_id
      and o.sector = p.sector
    where p.id = (select auth.uid())
      and p.role = 'training_provider'::public.application_role
      and p.account_status = 'active'::public.account_status
  )
);

create function public.guard_provider_course_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if old.status = 'closed'::public.course_publication_status then
      raise exception 'Archived courses cannot be changed'
        using errcode = '22023';
    end if;
    if old.status = 'published'::public.course_publication_status
      and new.status = 'draft'::public.course_publication_status
    then
      raise exception 'Published courses cannot be reverted to drafts'
        using errcode = '22023';
    end if;
  end if;

  if new.status = 'published'::public.course_publication_status then
    if tg_op = 'INSERT' then
      new.published_at := now();
    elsif old.status = 'published'::public.course_publication_status then
      new.published_at := old.published_at;
    elsif old.status <> 'published'::public.course_publication_status then
      new.published_at := now();
    end if;
  end if;

  if new.status = 'published'::public.course_publication_status
    and (
      tg_op = 'INSERT'
      or old.status <> 'published'::public.course_publication_status
    )
  then
    insert into public.notifications (user_id, title, body, href)
    values (
      new.owner_provider_id,
      'Course published',
      'Your course "' || new.title || '" is now published and visible to job seekers.',
      '/trainer/courses/' || new.id::text
    );
  end if;

  return new;
end;
$$;

revoke all on function public.guard_provider_course_mutation()
  from public, anon, authenticated;

create trigger courses_guard_provider_mutation
before insert or update on public.courses
for each row execute function public.guard_provider_course_mutation();

alter table public.course_interactions
  add column request_id uuid;

create unique index course_interactions_candidate_request_key
  on public.course_interactions(candidate_id, request_id)
  where request_id is not null;

revoke all on function public.record_course_interaction(
  uuid,
  public.course_interaction_type
) from public, anon, authenticated;

create function public.record_course_interaction_once(
  target_course_id uuid,
  interaction public.course_interaction_type,
  request_key uuid
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  interaction_id uuid;
begin
  if request_key is null then
    raise exception 'Interaction request key is required'
      using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role = 'job_seeker'::public.application_role
      and account_status = 'active'::public.account_status
  ) then
    raise exception 'Active job seeker account required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.courses
    where id = target_course_id
      and status = 'published'::public.course_publication_status
  ) then
    raise exception 'Course is not available'
      using errcode = 'P0002';
  end if;

  insert into public.course_interactions (
    candidate_id,
    course_id,
    interaction_type,
    request_id
  )
  values (
    (select auth.uid()),
    target_course_id,
    interaction,
    request_key
  )
  on conflict (candidate_id, request_id)
    where request_id is not null
    do nothing
  returning id into interaction_id;

  if interaction_id is null then
    select id into interaction_id
    from public.course_interactions
    where candidate_id = (select auth.uid())
      and request_id = request_key
      and course_id = target_course_id
      and interaction_type = interaction;

    if interaction_id is null then
      raise exception 'Interaction request key was already used'
        using errcode = '22023';
    end if;
  end if;

  return interaction_id;
end;
$$;

revoke all on function public.record_course_interaction_once(
  uuid,
  public.course_interaction_type,
  uuid
) from public, anon;
grant execute on function public.record_course_interaction_once(
  uuid,
  public.course_interaction_type,
  uuid
) to authenticated;

create function public.provider_course_metrics()
returns table (
  course_id uuid,
  saved_count bigint,
  inquiry_count bigint,
  link_click_count bigint,
  confirmed_enrollment_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'training_provider'::public.application_role
      and p.account_status = 'active'::public.account_status
  ) then
    raise exception 'Active training provider account required'
      using errcode = '42501';
  end if;

  return query
  select
    c.id,
    (select count(*) from public.saved_courses s where s.course_id = c.id),
    (select count(*) from public.course_interactions i
      where i.course_id = c.id and i.interaction_type = 'inquiry'),
    (select count(*) from public.course_interactions i
      where i.course_id = c.id and i.interaction_type = 'link_click'),
    null::bigint
  from public.courses c
  where c.owner_provider_id = (select auth.uid());
end;
$$;

revoke all on function public.provider_course_metrics()
  from public, anon, authenticated;
grant execute on function public.provider_course_metrics()
  to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'training-course-images',
  'training-course-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Anyone can view training course images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'training-course-images');

create policy "Providers upload images to their own course folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'training-course-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'training_provider'::public.application_role
      and p.account_status = 'active'::public.account_status
  )
);

create policy "Providers update images in their own course folder"
on storage.objects for update to authenticated
using (
  bucket_id = 'training-course-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'training_provider'::public.application_role
      and p.account_status = 'active'::public.account_status
  )
)
with check (
  bucket_id = 'training-course-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'training_provider'::public.application_role
      and p.account_status = 'active'::public.account_status
  )
);

create policy "Providers delete images in their own course folder"
on storage.objects for delete to authenticated
using (
  bucket_id = 'training-course-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'training_provider'::public.application_role
      and p.account_status = 'active'::public.account_status
  )
);
