/**
 * Database row shapes matching `supabase/migrations/0001_init.sql`.
 *
 * Hand-written rather than generated so the repo type-checks without a live
 * Supabase project. If you later run `supabase gen types typescript`, replace
 * this file — the rest of the code only depends on the exported `Database` type.
 */

import type {
  ActivityCategory,
  ApplicationRound,
  ApplicationStatus,
  CoachMode,
  CurrentGrade,
  DecisionResult,
  EssayStatus,
  FeeWaiverStatus,
  InstitutionType,
  LimitType,
  ListStatus,
  RecommenderStatus,
  RequirementStatus,
  RequirementType,
  ScholarshipStatus,
  TaskCategory,
  TaskPriority,
  TestingPlan,
  ThankYouStatus,
  TranscriptStatus,
  VersionSource,
} from '@/lib/domain/types';

export type UserProfileRow = {
  id: string;
  user_id: string;
  display_name: string;
  graduation_year: number | null;
  current_grade: CurrentGrade | null;
  region: string | null;
  intended_majors: string[];
  interests: string[];
  application_season: string | null;
  time_zone: string;
  writing_voice_notes: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type CollegeRow = {
  id: string;
  user_id: string;
  name: string;
  city: string | null;
  state_or_region: string | null;
  country: string | null;
  institution_type: InstitutionType | null;
  website_url: string | null;
  admissions_url: string | null;
  financial_aid_url: string | null;
  majors: string[];
  tags: string[];
  list_status: ListStatus;
  fit_notes: string | null;
  academic_notes: string | null;
  campus_notes: string | null;
  cost_notes: string | null;
  source_notes: string | null;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ApplicationRow = {
  id: string;
  user_id: string;
  college_id: string;
  application_round: ApplicationRound;
  deadline_at: string | null;
  deadline_time_zone: string;
  status: ApplicationStatus;
  submitted_at: string | null;
  decision_result: DecisionResult;
  decision_at: string | null;
  fee_amount: number | null;
  fee_waiver_status: FeeWaiverStatus;
  testing_plan: TestingPlan;
  transcript_status: TranscriptStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type RequirementRow = {
  id: string;
  user_id: string;
  application_id: string;
  type: RequirementType;
  title: string;
  description: string | null;
  required: boolean;
  status: RequirementStatus;
  due_at: string | null;
  source_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type EssayRow = {
  id: string;
  user_id: string;
  application_id: string | null;
  college_id: string | null;
  title: string;
  prompt: string | null;
  limit_type: LimitType;
  limit_value: number | null;
  brainstorm_notes: string | null;
  outline: string | null;
  current_draft: string;
  status: EssayStatus;
  due_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EssayVersionRow = {
  id: string;
  user_id: string;
  essay_id: string;
  content: string;
  source: VersionSource;
  note: string | null;
  created_at: string;
};

export type ActivityRow = {
  id: string;
  user_id: string;
  category: ActivityCategory;
  organization: string;
  role: string | null;
  start_date: string | null;
  end_date: string | null;
  continues: boolean;
  hours_per_week: number | null;
  weeks_per_year: number | null;
  grade_levels: string[];
  description: string;
  description_limit: number;
  impact_evidence: string | null;
  reflection_notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type RecommenderRow = {
  id: string;
  user_id: string;
  name: string;
  role: string | null;
  organization_or_subject: string | null;
  email: string | null;
  date_requested: string | null;
  due_at: string | null;
  status: RecommenderStatus;
  follow_up_at: string | null;
  thank_you_status: ThankYouStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ApplicationRecommenderRow = {
  user_id: string;
  application_id: string;
  recommender_id: string;
  status: RecommenderStatus;
};

export type ScholarshipRow = {
  id: string;
  user_id: string;
  title: string;
  organization: string | null;
  source_url: string | null;
  amount: number | null;
  deadline_at: string | null;
  deadline_time_zone: string;
  status: ScholarshipStatus;
  requirements: string | null;
  essay_ids: string[];
  last_verified_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskRow = {
  id: string;
  user_id: string;
  application_id: string | null;
  essay_id: string | null;
  scholarship_id: string | null;
  recommender_id: string | null;
  title: string;
  description: string | null;
  category: TaskCategory;
  due_at: string | null;
  time_zone: string;
  completed_at: string | null;
  priority: TaskPriority;
  created_at: string;
  updated_at: string;
};

export type CoachSessionRow = {
  id: string;
  user_id: string;
  mode: CoachMode;
  title: string;
  created_at: string;
  updated_at: string;
};

export type CoachMessageRow = {
  id: string;
  user_id: string;
  session_id: string;
  role: 'student' | 'coach';
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

/** Columns the database fills in itself. */
type Generated = 'id' | 'created_at' | 'updated_at';

/**
 * Flattens an intersection back into a single mapped type. Supabase's
 * `GenericSchema` requires each shape to be assignable to
 * `Record<string, unknown>`, which only mapped types satisfy implicitly.
 */
type Flatten<T> = { [K in keyof T]: T[K] };

/**
 * Nearly every column has a database default, so an insert only has to supply
 * what it wants to set — with one exception that is type-enforced here:
 * `user_id` is always required, because a row without an owner is exactly the
 * bug row-level security exists to catch. NOT NULL columns without defaults
 * (names, titles) are still enforced by Postgres.
 */
type TableDefinition<Row extends { user_id: string }> = {
  Row: Flatten<Row>;
  Insert: Flatten<
    Partial<Omit<Row, 'user_id' | Extract<Generated, keyof Row>>> & { user_id: string }
  >;
  Update: Partial<Omit<Row, 'user_id'>>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      user_profiles: TableDefinition<UserProfileRow>;
      colleges: TableDefinition<CollegeRow>;
      applications: TableDefinition<ApplicationRow>;
      requirements: TableDefinition<RequirementRow>;
      essays: TableDefinition<EssayRow>;
      essay_versions: TableDefinition<EssayVersionRow>;
      activities: TableDefinition<ActivityRow>;
      recommenders: TableDefinition<RecommenderRow>;
      application_recommenders: TableDefinition<ApplicationRecommenderRow>;
      scholarships: TableDefinition<ScholarshipRow>;
      tasks: TableDefinition<TaskRow>;
      coach_sessions: TableDefinition<CoachSessionRow>;
      coach_messages: TableDefinition<CoachMessageRow>;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
