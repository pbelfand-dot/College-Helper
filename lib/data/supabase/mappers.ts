/**
 * snake_case row <-> camelCase domain object mapping.
 *
 * Kept separate from the repository so the translation is easy to read and to
 * test, and so a schema rename touches exactly one file.
 */

import type {
  Activity,
  Application,
  ApplicationRecommender,
  CoachMessage,
  CoachSession,
  College,
  Essay,
  EssayVersion,
  Recommender,
  Requirement,
  Scholarship,
  Task,
  UserProfile,
} from '@/lib/domain/types';
import type {
  ActivityRow,
  ApplicationRecommenderRow,
  ApplicationRow,
  CoachMessageRow,
  CoachSessionRow,
  CollegeRow,
  EssayRow,
  EssayVersionRow,
  RecommenderRow,
  RequirementRow,
  ScholarshipRow,
  TaskRow,
  UserProfileRow,
} from './database.types';

const iso = (value: string | null): string | null => value;

export const toProfile = (row: UserProfileRow): UserProfile => ({
  id: row.id,
  userId: row.user_id,
  displayName: row.display_name,
  graduationYear: row.graduation_year,
  currentGrade: row.current_grade,
  region: row.region,
  intendedMajors: row.intended_majors ?? [],
  interests: row.interests ?? [],
  applicationSeason: row.application_season,
  timeZone: row.time_zone,
  writingVoiceNotes: row.writing_voice_notes,
  onboardingCompleted: row.onboarding_completed,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const fromProfile = (
  userId: string,
  value: Omit<UserProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
) => ({
  user_id: userId,
  display_name: value.displayName,
  graduation_year: value.graduationYear,
  current_grade: value.currentGrade,
  region: value.region,
  intended_majors: value.intendedMajors,
  interests: value.interests,
  application_season: value.applicationSeason,
  time_zone: value.timeZone,
  writing_voice_notes: value.writingVoiceNotes,
  onboarding_completed: value.onboardingCompleted,
});

export const toCollege = (row: CollegeRow): College => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  city: row.city,
  stateOrRegion: row.state_or_region,
  country: row.country,
  institutionType: row.institution_type,
  websiteUrl: row.website_url,
  admissionsUrl: row.admissions_url,
  financialAidUrl: row.financial_aid_url,
  majors: row.majors ?? [],
  tags: row.tags ?? [],
  listStatus: row.list_status,
  fitNotes: row.fit_notes,
  academicNotes: row.academic_notes,
  campusNotes: row.campus_notes,
  costNotes: row.cost_notes,
  sourceNotes: row.source_notes,
  lastVerifiedAt: iso(row.last_verified_at),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const fromCollege = (
  value: Partial<Omit<College, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>,
) =>
  stripUndefined({
    name: value.name,
    city: value.city,
    state_or_region: value.stateOrRegion,
    country: value.country,
    institution_type: value.institutionType,
    website_url: value.websiteUrl,
    admissions_url: value.admissionsUrl,
    financial_aid_url: value.financialAidUrl,
    majors: value.majors,
    tags: value.tags,
    list_status: value.listStatus,
    fit_notes: value.fitNotes,
    academic_notes: value.academicNotes,
    campus_notes: value.campusNotes,
    cost_notes: value.costNotes,
    source_notes: value.sourceNotes,
    last_verified_at: value.lastVerifiedAt,
  });

export const toApplication = (row: ApplicationRow): Application => ({
  id: row.id,
  userId: row.user_id,
  collegeId: row.college_id,
  applicationRound: row.application_round,
  deadlineAt: iso(row.deadline_at),
  deadlineTimeZone: row.deadline_time_zone,
  status: row.status,
  submittedAt: iso(row.submitted_at),
  decisionResult: row.decision_result,
  decisionAt: iso(row.decision_at),
  feeAmount: row.fee_amount === null ? null : Number(row.fee_amount),
  feeWaiverStatus: row.fee_waiver_status,
  testingPlan: row.testing_plan,
  transcriptStatus: row.transcript_status,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const fromApplication = (
  value: Partial<Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>,
) =>
  stripUndefined({
    college_id: value.collegeId,
    application_round: value.applicationRound,
    deadline_at: value.deadlineAt,
    deadline_time_zone: value.deadlineTimeZone,
    status: value.status,
    submitted_at: value.submittedAt,
    decision_result: value.decisionResult,
    decision_at: value.decisionAt,
    fee_amount: value.feeAmount,
    fee_waiver_status: value.feeWaiverStatus,
    testing_plan: value.testingPlan,
    transcript_status: value.transcriptStatus,
    notes: value.notes,
  });

export const toRequirement = (row: RequirementRow): Requirement => ({
  id: row.id,
  userId: row.user_id,
  applicationId: row.application_id,
  type: row.type,
  title: row.title,
  description: row.description,
  required: row.required,
  status: row.status,
  dueAt: iso(row.due_at),
  sourceUrl: row.source_url,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const fromRequirement = (
  value: Partial<Omit<Requirement, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>,
) =>
  stripUndefined({
    application_id: value.applicationId,
    type: value.type,
    title: value.title,
    description: value.description,
    required: value.required,
    status: value.status,
    due_at: value.dueAt,
    source_url: value.sourceUrl,
    sort_order: value.sortOrder,
  });

export const toEssay = (row: EssayRow): Essay => ({
  id: row.id,
  userId: row.user_id,
  applicationId: row.application_id,
  collegeId: row.college_id,
  title: row.title,
  prompt: row.prompt,
  limitType: row.limit_type,
  limitValue: row.limit_value,
  brainstormNotes: row.brainstorm_notes,
  outline: row.outline,
  currentDraft: row.current_draft ?? '',
  status: row.status,
  dueAt: iso(row.due_at),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const fromEssay = (
  value: Partial<Omit<Essay, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>,
) =>
  stripUndefined({
    application_id: value.applicationId,
    college_id: value.collegeId,
    title: value.title,
    prompt: value.prompt,
    limit_type: value.limitType,
    limit_value: value.limitValue,
    brainstorm_notes: value.brainstormNotes,
    outline: value.outline,
    current_draft: value.currentDraft,
    status: value.status,
    due_at: value.dueAt,
  });

export const toEssayVersion = (row: EssayVersionRow): EssayVersion => ({
  id: row.id,
  userId: row.user_id,
  essayId: row.essay_id,
  content: row.content,
  source: row.source,
  note: row.note,
  createdAt: row.created_at,
});

export const toActivity = (row: ActivityRow): Activity => ({
  id: row.id,
  userId: row.user_id,
  category: row.category,
  organization: row.organization,
  role: row.role,
  startDate: row.start_date,
  endDate: row.end_date,
  continues: row.continues,
  hoursPerWeek: row.hours_per_week,
  weeksPerYear: row.weeks_per_year,
  gradeLevels: row.grade_levels ?? [],
  description: row.description ?? '',
  descriptionLimit: row.description_limit,
  impactEvidence: row.impact_evidence,
  reflectionNotes: row.reflection_notes,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const fromActivity = (
  value: Partial<Omit<Activity, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>,
) =>
  stripUndefined({
    category: value.category,
    organization: value.organization,
    role: value.role,
    start_date: value.startDate ? value.startDate.slice(0, 10) : value.startDate,
    end_date: value.endDate ? value.endDate.slice(0, 10) : value.endDate,
    continues: value.continues,
    hours_per_week: value.hoursPerWeek,
    weeks_per_year: value.weeksPerYear,
    grade_levels: value.gradeLevels,
    description: value.description,
    description_limit: value.descriptionLimit,
    impact_evidence: value.impactEvidence,
    reflection_notes: value.reflectionNotes,
    sort_order: value.sortOrder,
  });

export const toRecommender = (row: RecommenderRow): Recommender => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  role: row.role,
  organizationOrSubject: row.organization_or_subject,
  email: row.email,
  dateRequested: iso(row.date_requested),
  dueAt: iso(row.due_at),
  status: row.status,
  followUpAt: iso(row.follow_up_at),
  thankYouStatus: row.thank_you_status,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const fromRecommender = (
  value: Partial<Omit<Recommender, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>,
) =>
  stripUndefined({
    name: value.name,
    role: value.role,
    organization_or_subject: value.organizationOrSubject,
    email: value.email,
    date_requested: value.dateRequested,
    due_at: value.dueAt,
    status: value.status,
    follow_up_at: value.followUpAt,
    thank_you_status: value.thankYouStatus,
    notes: value.notes,
  });

export const toApplicationRecommender = (
  row: ApplicationRecommenderRow,
): ApplicationRecommender => ({
  userId: row.user_id,
  applicationId: row.application_id,
  recommenderId: row.recommender_id,
  status: row.status,
});

export const toScholarship = (row: ScholarshipRow): Scholarship => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  organization: row.organization,
  sourceUrl: row.source_url,
  amount: row.amount === null ? null : Number(row.amount),
  deadlineAt: iso(row.deadline_at),
  deadlineTimeZone: row.deadline_time_zone,
  status: row.status,
  requirements: row.requirements,
  essayIds: row.essay_ids ?? [],
  lastVerifiedAt: iso(row.last_verified_at),
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const fromScholarship = (
  value: Partial<Omit<Scholarship, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>,
) =>
  stripUndefined({
    title: value.title,
    organization: value.organization,
    source_url: value.sourceUrl,
    amount: value.amount,
    deadline_at: value.deadlineAt,
    deadline_time_zone: value.deadlineTimeZone,
    status: value.status,
    requirements: value.requirements,
    essay_ids: value.essayIds,
    last_verified_at: value.lastVerifiedAt,
    notes: value.notes,
  });

export const toTask = (row: TaskRow): Task => ({
  id: row.id,
  userId: row.user_id,
  applicationId: row.application_id,
  essayId: row.essay_id,
  scholarshipId: row.scholarship_id,
  recommenderId: row.recommender_id,
  title: row.title,
  description: row.description,
  category: row.category,
  dueAt: iso(row.due_at),
  timeZone: row.time_zone,
  completedAt: iso(row.completed_at),
  priority: row.priority,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const fromTask = (value: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) =>
  stripUndefined({
    application_id: value.applicationId,
    essay_id: value.essayId,
    scholarship_id: value.scholarshipId,
    recommender_id: value.recommenderId,
    title: value.title,
    description: value.description,
    category: value.category,
    due_at: value.dueAt,
    time_zone: value.timeZone,
    completed_at: value.completedAt,
    priority: value.priority,
  });

export const toCoachSession = (row: CoachSessionRow): CoachSession => ({
  id: row.id,
  userId: row.user_id,
  mode: row.mode,
  title: row.title,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const toCoachMessage = (row: CoachMessageRow): CoachMessage => ({
  id: row.id,
  userId: row.user_id,
  sessionId: row.session_id,
  role: row.role,
  content: row.content,
  metadata: row.metadata,
  createdAt: row.created_at,
});

/**
 * Drops `undefined` keys so a partial update never blanks a column the caller
 * did not mention. `null` is preserved — that is an explicit "clear this".
 */
function stripUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) result[key] = entry;
  }
  return result as Partial<T>;
}
