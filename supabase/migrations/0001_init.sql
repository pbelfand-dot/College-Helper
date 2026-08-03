-- ApplyPilot initial schema.
--
-- Every table stores a user_id that references auth.users, and every table has
-- row-level security enabled with policies that compare user_id to auth.uid().
-- A student can only ever see and modify their own rows, even if they guess
-- another record's id.
--
-- Deliberately absent: any column for Social Security numbers, government id
-- numbers, bank or payment details, or recommendation letter contents.

create extension if not exists "pgcrypto";

-- --- Enums -------------------------------------------------------------------

create type list_status as enum (
  'exploring', 'considering', 'applying', 'submitted', 'decision-received'
);

create type institution_type as enum (
  'public', 'private-nonprofit', 'private-forprofit', 'community', 'other'
);

create type application_round as enum (
  'early-decision', 'early-decision-2', 'early-action', 'restrictive-early-action',
  'regular-decision', 'rolling', 'priority', 'transfer', 'other'
);

create type application_status as enum (
  'planning', 'in-progress', 'ready-to-submit', 'submitted', 'decision-received', 'withdrawn'
);

create type decision_result as enum (
  'pending', 'accepted', 'waitlisted', 'deferred', 'denied', 'withdrawn'
);

create type fee_waiver_status as enum ('not-applicable', 'considering', 'requested', 'approved');

create type testing_plan as enum (
  'not-decided', 'not-submitting', 'submitting-sat', 'submitting-act',
  'submitting-both', 'test-required'
);

create type transcript_status as enum ('not-started', 'requested', 'sent', 'confirmed');

create type requirement_type as enum (
  'application-form', 'essay', 'recommendation', 'transcript', 'test-scores',
  'portfolio', 'interview', 'fee', 'financial-aid', 'other'
);

create type requirement_status as enum ('not-started', 'in-progress', 'complete', 'not-needed');

create type essay_status as enum (
  'not-started', 'brainstorming', 'outlining', 'drafting', 'revising', 'final'
);

create type limit_type as enum ('words', 'characters', 'none');

create type version_source as enum ('autosave', 'manual', 'ai-assisted', 'restored');

create type activity_category as enum (
  'academic', 'art', 'athletics', 'career-oriented', 'community-service',
  'computer-technology', 'cultural', 'debate-speech', 'environmental',
  'family-responsibilities', 'foreign-language', 'journalism-publication',
  'junior-rotc', 'music', 'religious', 'research', 'robotics', 'school-spirit',
  'science-math', 'student-government', 'theater-drama', 'work', 'other'
);

create type recommender_status as enum (
  'not-asked', 'asked', 'agreed', 'materials-sent', 'submitted', 'declined'
);

create type thank_you_status as enum ('not-sent', 'planned', 'sent');

create type scholarship_status as enum (
  'researching', 'planning-to-apply', 'in-progress', 'submitted', 'awarded',
  'not-selected', 'skipped'
);

create type task_category as enum (
  'application', 'essay', 'recommendation', 'testing', 'financial-aid',
  'scholarship', 'visit', 'personal', 'other'
);

create type task_priority as enum ('low', 'medium', 'high');

create type current_grade as enum ('9', '10', '11', '12', 'gap-year', 'transfer', 'other');

create type coach_mode as enum (
  'profile', 'college-research', 'essay-brainstorm', 'essay-feedback',
  'activity-description', 'deadline-planning'
);

create type coach_role as enum ('student', 'coach');

-- --- Shared updated_at trigger ------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- --- Tables ------------------------------------------------------------------

create table user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  graduation_year integer check (graduation_year between 2000 and 2100),
  current_grade current_grade,
  region text check (char_length(region) <= 120),
  intended_majors text[] not null default '{}',
  interests text[] not null default '{}',
  application_season text check (char_length(application_season) <= 60),
  time_zone text not null default 'America/New_York',
  writing_voice_notes text check (char_length(writing_voice_notes) <= 5000),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table colleges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  city text,
  state_or_region text,
  country text,
  institution_type institution_type,
  website_url text,
  admissions_url text,
  financial_aid_url text,
  majors text[] not null default '{}',
  tags text[] not null default '{}',
  list_status list_status not null default 'exploring',
  fit_notes text,
  academic_notes text,
  campus_notes text,
  cost_notes text,
  source_notes text,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index colleges_user_id_idx on colleges (user_id);

create table applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  college_id uuid not null references colleges (id) on delete cascade,
  application_round application_round not null default 'regular-decision',
  deadline_at timestamptz,
  deadline_time_zone text not null default 'America/New_York',
  status application_status not null default 'planning',
  submitted_at timestamptz,
  decision_result decision_result not null default 'pending',
  decision_at timestamptz,
  fee_amount numeric(10, 2) check (fee_amount >= 0),
  fee_waiver_status fee_waiver_status not null default 'not-applicable',
  testing_plan testing_plan not null default 'not-decided',
  transcript_status transcript_status not null default 'not-started',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index applications_user_id_idx on applications (user_id);
create index applications_college_id_idx on applications (college_id);

create table requirements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  application_id uuid not null references applications (id) on delete cascade,
  type requirement_type not null default 'other',
  title text not null check (char_length(title) between 1 and 160),
  description text,
  required boolean not null default true,
  status requirement_status not null default 'not-started',
  due_at timestamptz,
  source_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index requirements_user_id_idx on requirements (user_id);
create index requirements_application_id_idx on requirements (application_id);

create table essays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  application_id uuid references applications (id) on delete set null,
  college_id uuid references colleges (id) on delete set null,
  title text not null check (char_length(title) between 1 and 160),
  prompt text,
  limit_type limit_type not null default 'words',
  limit_value integer check (limit_value >= 0),
  brainstorm_notes text,
  outline text,
  current_draft text not null default '',
  status essay_status not null default 'not-started',
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index essays_user_id_idx on essays (user_id);

create table essay_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  essay_id uuid not null references essays (id) on delete cascade,
  content text not null default '',
  source version_source not null default 'autosave',
  note text,
  created_at timestamptz not null default now()
);
create index essay_versions_user_id_idx on essay_versions (user_id);
create index essay_versions_essay_id_idx on essay_versions (essay_id, created_at desc);

create table activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category activity_category not null default 'other',
  organization text not null check (char_length(organization) between 1 and 160),
  role text,
  start_date date,
  end_date date,
  continues boolean not null default false,
  hours_per_week integer check (hours_per_week between 0 and 168),
  weeks_per_year integer check (weeks_per_year between 0 and 52),
  grade_levels text[] not null default '{}',
  description text not null default '',
  description_limit integer not null default 150 check (description_limit between 20 and 5000),
  impact_evidence text,
  reflection_notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index activities_user_id_idx on activities (user_id, sort_order);

create table recommenders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  role text,
  organization_or_subject text,
  email text,
  date_requested timestamptz,
  due_at timestamptz,
  status recommender_status not null default 'not-asked',
  follow_up_at timestamptz,
  thank_you_status thank_you_status not null default 'not-sent',
  -- Notes only. Letter contents are confidential and are never stored here.
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index recommenders_user_id_idx on recommenders (user_id);

create table application_recommenders (
  user_id uuid not null references auth.users (id) on delete cascade,
  application_id uuid not null references applications (id) on delete cascade,
  recommender_id uuid not null references recommenders (id) on delete cascade,
  status recommender_status not null default 'not-asked',
  primary key (application_id, recommender_id)
);
create index application_recommenders_user_id_idx on application_recommenders (user_id);

create table scholarships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  organization text,
  source_url text,
  amount numeric(12, 2) check (amount >= 0),
  deadline_at timestamptz,
  deadline_time_zone text not null default 'America/New_York',
  status scholarship_status not null default 'researching',
  requirements text,
  essay_ids uuid[] not null default '{}',
  last_verified_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index scholarships_user_id_idx on scholarships (user_id);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  application_id uuid references applications (id) on delete set null,
  essay_id uuid references essays (id) on delete set null,
  scholarship_id uuid references scholarships (id) on delete set null,
  recommender_id uuid references recommenders (id) on delete set null,
  title text not null check (char_length(title) between 1 and 160),
  description text,
  category task_category not null default 'other',
  due_at timestamptz,
  time_zone text not null default 'America/New_York',
  completed_at timestamptz,
  priority task_priority not null default 'medium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_user_id_idx on tasks (user_id, due_at);

create table coach_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode coach_mode not null,
  title text not null default 'Coaching session',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index coach_sessions_user_id_idx on coach_sessions (user_id, updated_at desc);

-- Only user-visible messages are stored. No model reasoning, no raw provider
-- payloads, no hidden chain-of-thought.
create table coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references coach_sessions (id) on delete cascade,
  role coach_role not null,
  content text not null default '',
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index coach_messages_session_idx on coach_messages (session_id, created_at);

-- --- updated_at triggers -----------------------------------------------------

create trigger user_profiles_updated_at before update on user_profiles
  for each row execute function set_updated_at();
create trigger colleges_updated_at before update on colleges
  for each row execute function set_updated_at();
create trigger applications_updated_at before update on applications
  for each row execute function set_updated_at();
create trigger requirements_updated_at before update on requirements
  for each row execute function set_updated_at();
create trigger essays_updated_at before update on essays
  for each row execute function set_updated_at();
create trigger activities_updated_at before update on activities
  for each row execute function set_updated_at();
create trigger recommenders_updated_at before update on recommenders
  for each row execute function set_updated_at();
create trigger scholarships_updated_at before update on scholarships
  for each row execute function set_updated_at();
create trigger tasks_updated_at before update on tasks
  for each row execute function set_updated_at();
create trigger coach_sessions_updated_at before update on coach_sessions
  for each row execute function set_updated_at();
