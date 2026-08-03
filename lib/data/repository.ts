/**
 * The storage contract for ApplyPilot.
 *
 * Every method takes `userId` as its first argument and every implementation
 * must scope reads *and* writes to it. Passing another user's record id must
 * return null / throw NotFound rather than leaking the row — the demo adapter
 * enforces this in code and the Supabase adapter enforces it in row-level
 * security as well as in the query.
 *
 * UI and domain code depend only on this interface, never on Supabase.
 */

import type {
  Activity,
  Application,
  ApplicationRecommender,
  College,
  CoachMessage,
  CoachSession,
  Essay,
  EssayVersion,
  Recommender,
  Requirement,
  Scholarship,
  Task,
  UserDataBundle,
  UserProfile,
} from '@/lib/domain/types';

/** Fields the repository owns and callers never supply. */
export type Owned = 'id' | 'userId' | 'createdAt' | 'updatedAt';

export type NewCollege = Omit<College, Owned>;
export type NewApplication = Omit<Application, Owned>;
/** `sortOrder` is optional on create: the repository appends to the end. */
export type NewRequirement = Omit<Requirement, Owned | 'sortOrder'> & { sortOrder?: number };
export type NewEssay = Omit<Essay, Owned>;
export type NewActivity = Omit<Activity, Owned | 'sortOrder'> & { sortOrder?: number };
export type NewRecommender = Omit<Recommender, Owned>;
export type NewScholarship = Omit<Scholarship, Owned>;
export type NewTask = Omit<Task, Owned>;
export type NewCoachSession = Omit<CoachSession, Owned>;
export type NewCoachMessage = Omit<CoachMessage, 'id' | 'userId' | 'createdAt'>;
export type NewEssayVersion = Omit<EssayVersion, 'id' | 'userId' | 'createdAt'>;

export type ProfileUpsert = Omit<UserProfile, Owned>;

/** Predictable, typed failures. Callers map these to user-facing copy. */
export type RepositoryErrorCode = 'not-found' | 'conflict' | 'unavailable' | 'invalid';

export class RepositoryError extends Error {
  readonly code: RepositoryErrorCode;

  constructor(code: RepositoryErrorCode, message: string) {
    super(message);
    this.name = 'RepositoryError';
    this.code = code;
  }
}

export function notFound(what: string): RepositoryError {
  return new RepositoryError('not-found', `${what} could not be found.`);
}

export interface ApplyPilotRepository {
  /** Identifies the adapter in diagnostics and in the settings page. */
  readonly kind: 'demo' | 'supabase';

  // Profile
  getProfile(userId: string): Promise<UserProfile | null>;
  upsertProfile(userId: string, input: ProfileUpsert): Promise<UserProfile>;

  // Colleges
  listColleges(userId: string): Promise<College[]>;
  getCollege(userId: string, collegeId: string): Promise<College | null>;
  createCollege(userId: string, input: NewCollege): Promise<College>;
  updateCollege(userId: string, collegeId: string, input: Partial<NewCollege>): Promise<College>;
  deleteCollege(userId: string, collegeId: string): Promise<void>;

  // Applications
  listApplications(userId: string): Promise<Application[]>;
  getApplication(userId: string, applicationId: string): Promise<Application | null>;
  createApplication(userId: string, input: NewApplication): Promise<Application>;
  updateApplication(
    userId: string,
    applicationId: string,
    input: Partial<NewApplication>,
  ): Promise<Application>;
  deleteApplication(userId: string, applicationId: string): Promise<void>;

  // Requirements
  listRequirements(userId: string, applicationId?: string): Promise<Requirement[]>;
  getRequirement(userId: string, requirementId: string): Promise<Requirement | null>;
  createRequirement(userId: string, input: NewRequirement): Promise<Requirement>;
  updateRequirement(
    userId: string,
    requirementId: string,
    input: Partial<NewRequirement>,
  ): Promise<Requirement>;
  deleteRequirement(userId: string, requirementId: string): Promise<void>;

  // Essays
  listEssays(userId: string): Promise<Essay[]>;
  getEssay(userId: string, essayId: string): Promise<Essay | null>;
  createEssay(userId: string, input: NewEssay): Promise<Essay>;
  updateEssay(userId: string, essayId: string, input: Partial<NewEssay>): Promise<Essay>;
  deleteEssay(userId: string, essayId: string): Promise<void>;

  // Essay versions
  listEssayVersions(userId: string, essayId: string): Promise<EssayVersion[]>;
  getEssayVersion(userId: string, versionId: string): Promise<EssayVersion | null>;
  createEssayVersion(userId: string, input: NewEssayVersion): Promise<EssayVersion>;

  // Activities
  listActivities(userId: string): Promise<Activity[]>;
  getActivity(userId: string, activityId: string): Promise<Activity | null>;
  createActivity(userId: string, input: NewActivity): Promise<Activity>;
  updateActivity(userId: string, activityId: string, input: Partial<NewActivity>): Promise<Activity>;
  deleteActivity(userId: string, activityId: string): Promise<void>;
  /** Persists a whole reordered list in one call so ordering stays consistent. */
  saveActivityOrder(userId: string, orderedIds: string[]): Promise<void>;

  // Recommenders
  listRecommenders(userId: string): Promise<Recommender[]>;
  getRecommender(userId: string, recommenderId: string): Promise<Recommender | null>;
  createRecommender(userId: string, input: NewRecommender): Promise<Recommender>;
  updateRecommender(
    userId: string,
    recommenderId: string,
    input: Partial<NewRecommender>,
  ): Promise<Recommender>;
  deleteRecommender(userId: string, recommenderId: string): Promise<void>;

  // Application <-> recommender links
  listApplicationRecommenders(userId: string): Promise<ApplicationRecommender[]>;
  linkRecommender(
    userId: string,
    applicationId: string,
    recommenderId: string,
  ): Promise<ApplicationRecommender>;
  unlinkRecommender(userId: string, applicationId: string, recommenderId: string): Promise<void>;

  // Scholarships
  listScholarships(userId: string): Promise<Scholarship[]>;
  getScholarship(userId: string, scholarshipId: string): Promise<Scholarship | null>;
  createScholarship(userId: string, input: NewScholarship): Promise<Scholarship>;
  updateScholarship(
    userId: string,
    scholarshipId: string,
    input: Partial<NewScholarship>,
  ): Promise<Scholarship>;
  deleteScholarship(userId: string, scholarshipId: string): Promise<void>;

  // Tasks
  listTasks(userId: string): Promise<Task[]>;
  getTask(userId: string, taskId: string): Promise<Task | null>;
  createTask(userId: string, input: NewTask): Promise<Task>;
  updateTask(userId: string, taskId: string, input: Partial<NewTask>): Promise<Task>;
  deleteTask(userId: string, taskId: string): Promise<void>;

  // Coach history (user-visible messages only)
  listCoachSessions(userId: string): Promise<CoachSession[]>;
  getCoachSession(userId: string, sessionId: string): Promise<CoachSession | null>;
  createCoachSession(userId: string, input: NewCoachSession): Promise<CoachSession>;
  deleteCoachSession(userId: string, sessionId: string): Promise<void>;
  listCoachMessages(userId: string, sessionId: string): Promise<CoachMessage[]>;
  createCoachMessage(userId: string, input: NewCoachMessage): Promise<CoachMessage>;

  // Whole-account operations
  exportUserData(userId: string): Promise<UserDataBundle>;
  deleteAllUserData(userId: string): Promise<void>;
  /** Demo adapter only: re-seeds the sample workspace. No-op elsewhere. */
  resetDemoData(userId: string): Promise<void>;
}
