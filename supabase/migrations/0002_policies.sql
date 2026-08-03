-- Row-level security for ApplyPilot.
--
-- Every table is owner-only: a row is visible and writable only to the user
-- whose id is in user_id. There is no shared or public read path, so guessing a
-- record id gets you nothing.
--
-- `with check` is set on insert and update as well as `using` on select and
-- delete, so a user cannot create or re-assign a row to somebody else.

alter table user_profiles enable row level security;
alter table colleges enable row level security;
alter table applications enable row level security;
alter table requirements enable row level security;
alter table essays enable row level security;
alter table essay_versions enable row level security;
alter table activities enable row level security;
alter table recommenders enable row level security;
alter table application_recommenders enable row level security;
alter table scholarships enable row level security;
alter table tasks enable row level security;
alter table coach_sessions enable row level security;
alter table coach_messages enable row level security;

-- Force RLS so even a table owner connection is subject to the policies.
alter table user_profiles force row level security;
alter table colleges force row level security;
alter table applications force row level security;
alter table requirements force row level security;
alter table essays force row level security;
alter table essay_versions force row level security;
alter table activities force row level security;
alter table recommenders force row level security;
alter table application_recommenders force row level security;
alter table scholarships force row level security;
alter table tasks force row level security;
alter table coach_sessions force row level security;
alter table coach_messages force row level security;

do $$
declare
  target text;
begin
  foreach target in array array[
    'user_profiles', 'colleges', 'applications', 'requirements', 'essays',
    'essay_versions', 'activities', 'recommenders', 'application_recommenders',
    'scholarships', 'tasks', 'coach_sessions', 'coach_messages'
  ]
  loop
    execute format(
      'create policy %I on %I for select to authenticated using (user_id = (select auth.uid()))',
      target || '_select_own', target
    );
    execute format(
      'create policy %I on %I for insert to authenticated with check (user_id = (select auth.uid()))',
      target || '_insert_own', target
    );
    execute format(
      'create policy %I on %I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      target || '_update_own', target
    );
    execute format(
      'create policy %I on %I for delete to authenticated using (user_id = (select auth.uid()))',
      target || '_delete_own', target
    );
  end loop;
end;
$$;

-- Referenced records must also belong to the caller, so a crafted insert cannot
-- attach one of your rows to another user's parent record.
create or replace function owns_application(target uuid)
returns boolean
language sql
security invoker
stable
as $$
  select exists (
    select 1 from applications
    where id = target and user_id = (select auth.uid())
  );
$$;

create or replace function owns_essay(target uuid)
returns boolean
language sql
security invoker
stable
as $$
  select exists (
    select 1 from essays
    where id = target and user_id = (select auth.uid())
  );
$$;

create or replace function owns_college(target uuid)
returns boolean
language sql
security invoker
stable
as $$
  select exists (
    select 1 from colleges
    where id = target and user_id = (select auth.uid())
  );
$$;

create or replace function owns_recommender(target uuid)
returns boolean
language sql
security invoker
stable
as $$
  select exists (
    select 1 from recommenders
    where id = target and user_id = (select auth.uid())
  );
$$;

alter table applications
  add constraint applications_college_owned check (owns_college(college_id)) not valid;

alter table requirements
  add constraint requirements_application_owned check (owns_application(application_id)) not valid;

alter table essay_versions
  add constraint essay_versions_essay_owned check (owns_essay(essay_id)) not valid;

alter table application_recommenders
  add constraint application_recommenders_owned
  check (owns_application(application_id) and owns_recommender(recommender_id)) not valid;

-- Create the profile row automatically when a user signs up, so the app never
-- has to run an unscoped insert.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (user_id, display_name, onboarding_completed)
  values (new.id, coalesce(split_part(new.email, '@', 1), 'Student'), false)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
