/**
 * ApplyPilot domain entities.
 *
 * These types are the contract between the storage adapters, the server
 * actions, and the UI. Dates are stored as ISO-8601 strings so that every
 * adapter (in-memory demo, Supabase/Postgres, JSON export) round-trips the
 * same value without timezone drift.
 */

export type IsoDateTime = string;

export const LIST_STATUSES = [
  'exploring',
  'considering',
  'applying',
  'submitted',
  'decision-received',
] as const;
export type ListStatus = (typeof LIST_STATUSES)[number];

export const INSTITUTION_TYPES = [
  'public',
  'private-nonprofit',
  'private-forprofit',
  'community',
  'other',
] as const;
export type InstitutionType = (typeof INSTITUTION_TYPES)[number];

export const APPLICATION_ROUNDS = [
  'early-decision',
  'early-decision-2',
  'early-action',
  'restrictive-early-action',
  'regular-decision',
  'rolling',
  'priority',
  'transfer',
  'other',
] as const;
export type ApplicationRound = (typeof APPLICATION_ROUNDS)[number];

export const APPLICATION_STATUSES = [
  'planning',
  'in-progress',
  'ready-to-submit',
  'submitted',
  'decision-received',
  'withdrawn',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const DECISION_RESULTS = [
  'pending',
  'accepted',
  'waitlisted',
  'deferred',
  'denied',
  'withdrawn',
] as const;
export type DecisionResult = (typeof DECISION_RESULTS)[number];

export const FEE_WAIVER_STATUSES = ['not-applicable', 'considering', 'requested', 'approved'] as const;
export type FeeWaiverStatus = (typeof FEE_WAIVER_STATUSES)[number];

export const TESTING_PLANS = [
  'not-decided',
  'not-submitting',
  'submitting-sat',
  'submitting-act',
  'submitting-both',
  'test-required',
] as const;
export type TestingPlan = (typeof TESTING_PLANS)[number];

export const TRANSCRIPT_STATUSES = ['not-started', 'requested', 'sent', 'confirmed'] as const;
export type TranscriptStatus = (typeof TRANSCRIPT_STATUSES)[number];

export const REQUIREMENT_TYPES = [
  'application-form',
  'essay',
  'recommendation',
  'transcript',
  'test-scores',
  'portfolio',
  'interview',
  'fee',
  'financial-aid',
  'other',
] as const;
export type RequirementType = (typeof REQUIREMENT_TYPES)[number];

export const REQUIREMENT_STATUSES = ['not-started', 'in-progress', 'complete', 'not-needed'] as const;
export type RequirementStatus = (typeof REQUIREMENT_STATUSES)[number];

export const ESSAY_STATUSES = [
  'not-started',
  'brainstorming',
  'outlining',
  'drafting',
  'revising',
  'final',
] as const;
export type EssayStatus = (typeof ESSAY_STATUSES)[number];

export const LIMIT_TYPES = ['words', 'characters', 'none'] as const;
export type LimitType = (typeof LIMIT_TYPES)[number];

export const VERSION_SOURCES = ['autosave', 'manual', 'ai-assisted', 'restored'] as const;
export type VersionSource = (typeof VERSION_SOURCES)[number];

export const ACTIVITY_CATEGORIES = [
  'academic',
  'art',
  'athletics',
  'career-oriented',
  'community-service',
  'computer-technology',
  'cultural',
  'debate-speech',
  'environmental',
  'family-responsibilities',
  'foreign-language',
  'journalism-publication',
  'junior-rotc',
  'music',
  'religious',
  'research',
  'robotics',
  'school-spirit',
  'science-math',
  'student-government',
  'theater-drama',
  'work',
  'other',
] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export const RECOMMENDER_STATUSES = [
  'not-asked',
  'asked',
  'agreed',
  'materials-sent',
  'submitted',
  'declined',
] as const;
export type RecommenderStatus = (typeof RECOMMENDER_STATUSES)[number];

export const THANK_YOU_STATUSES = ['not-sent', 'planned', 'sent'] as const;
export type ThankYouStatus = (typeof THANK_YOU_STATUSES)[number];

export const SCHOLARSHIP_STATUSES = [
  'researching',
  'planning-to-apply',
  'in-progress',
  'submitted',
  'awarded',
  'not-selected',
  'skipped',
] as const;
export type ScholarshipStatus = (typeof SCHOLARSHIP_STATUSES)[number];

export const TASK_CATEGORIES = [
  'application',
  'essay',
  'recommendation',
  'testing',
  'financial-aid',
  'scholarship',
  'visit',
  'personal',
  'other',
] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const COACH_MODES = [
  'profile',
  'college-research',
  'essay-brainstorm',
  'essay-feedback',
  'activity-description',
  'deadline-planning',
] as const;
export type CoachMode = (typeof COACH_MODES)[number];

export const CURRENT_GRADES = ['9', '10', '11', '12', 'gap-year', 'transfer', 'other'] as const;
export type CurrentGrade = (typeof CURRENT_GRADES)[number];

// --- Entities ---------------------------------------------------------------

export interface UserProfile {
  id: string;
  userId: string;
  displayName: string;
  graduationYear: number | null;
  currentGrade: CurrentGrade | null;
  region: string | null;
  intendedMajors: string[];
  interests: string[];
  applicationSeason: string | null;
  timeZone: string;
  writingVoiceNotes: string | null;
  onboardingCompleted: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface College {
  id: string;
  userId: string;
  name: string;
  city: string | null;
  stateOrRegion: string | null;
  country: string | null;
  institutionType: InstitutionType | null;
  websiteUrl: string | null;
  admissionsUrl: string | null;
  financialAidUrl: string | null;
  majors: string[];
  tags: string[];
  listStatus: ListStatus;
  fitNotes: string | null;
  academicNotes: string | null;
  campusNotes: string | null;
  costNotes: string | null;
  sourceNotes: string | null;
  lastVerifiedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface Application {
  id: string;
  userId: string;
  collegeId: string;
  applicationRound: ApplicationRound;
  deadlineAt: IsoDateTime | null;
  deadlineTimeZone: string;
  status: ApplicationStatus;
  submittedAt: IsoDateTime | null;
  decisionResult: DecisionResult;
  decisionAt: IsoDateTime | null;
  feeAmount: number | null;
  feeWaiverStatus: FeeWaiverStatus;
  testingPlan: TestingPlan;
  transcriptStatus: TranscriptStatus;
  notes: string | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface Requirement {
  id: string;
  userId: string;
  applicationId: string;
  type: RequirementType;
  title: string;
  description: string | null;
  required: boolean;
  status: RequirementStatus;
  dueAt: IsoDateTime | null;
  sourceUrl: string | null;
  sortOrder: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface Essay {
  id: string;
  userId: string;
  applicationId: string | null;
  collegeId: string | null;
  title: string;
  prompt: string | null;
  limitType: LimitType;
  limitValue: number | null;
  brainstormNotes: string | null;
  outline: string | null;
  currentDraft: string;
  status: EssayStatus;
  dueAt: IsoDateTime | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface EssayVersion {
  id: string;
  userId: string;
  essayId: string;
  content: string;
  source: VersionSource;
  note: string | null;
  createdAt: IsoDateTime;
}

export interface Activity {
  id: string;
  userId: string;
  category: ActivityCategory;
  organization: string;
  role: string | null;
  startDate: string | null;
  endDate: string | null;
  continues: boolean;
  hoursPerWeek: number | null;
  weeksPerYear: number | null;
  gradeLevels: string[];
  description: string;
  descriptionLimit: number;
  impactEvidence: string | null;
  reflectionNotes: string | null;
  sortOrder: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface Recommender {
  id: string;
  userId: string;
  name: string;
  role: string | null;
  organizationOrSubject: string | null;
  email: string | null;
  dateRequested: IsoDateTime | null;
  dueAt: IsoDateTime | null;
  status: RecommenderStatus;
  followUpAt: IsoDateTime | null;
  thankYouStatus: ThankYouStatus;
  notes: string | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface ApplicationRecommender {
  applicationId: string;
  recommenderId: string;
  userId: string;
  status: RecommenderStatus;
}

export interface Scholarship {
  id: string;
  userId: string;
  title: string;
  organization: string | null;
  sourceUrl: string | null;
  amount: number | null;
  deadlineAt: IsoDateTime | null;
  deadlineTimeZone: string;
  status: ScholarshipStatus;
  requirements: string | null;
  essayIds: string[];
  lastVerifiedAt: IsoDateTime | null;
  notes: string | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface Task {
  id: string;
  userId: string;
  applicationId: string | null;
  essayId: string | null;
  scholarshipId: string | null;
  recommenderId: string | null;
  title: string;
  description: string | null;
  category: TaskCategory;
  dueAt: IsoDateTime | null;
  timeZone: string;
  completedAt: IsoDateTime | null;
  priority: TaskPriority;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface CoachSession {
  id: string;
  userId: string;
  mode: CoachMode;
  title: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/**
 * Only user-visible content is persisted. No model reasoning, no hidden
 * chain-of-thought, no raw provider payloads.
 */
export interface CoachMessage {
  id: string;
  userId: string;
  sessionId: string;
  role: 'student' | 'coach';
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: IsoDateTime;
}

/** Everything a single user owns. Used by the export and delete flows. */
export interface UserDataBundle {
  profile: UserProfile | null;
  colleges: College[];
  applications: Application[];
  requirements: Requirement[];
  essays: Essay[];
  essayVersions: EssayVersion[];
  activities: Activity[];
  recommenders: Recommender[];
  applicationRecommenders: ApplicationRecommender[];
  scholarships: Scholarship[];
  tasks: Task[];
  coachSessions: CoachSession[];
  coachMessages: CoachMessage[];
}
