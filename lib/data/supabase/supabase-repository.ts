import 'server-only';

import { sortBySortOrder } from '@/lib/domain/ordering';
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
  UserDataBundle,
  UserProfile,
} from '@/lib/domain/types';
import {
  type ApplyPilotRepository,
  type NewActivity,
  type NewApplication,
  type NewCoachMessage,
  type NewCoachSession,
  type NewCollege,
  type NewEssay,
  type NewEssayVersion,
  type NewRecommender,
  type NewRequirement,
  type NewScholarship,
  type NewTask,
  type ProfileUpsert,
  RepositoryError,
  notFound,
} from '../repository';
import * as map from './mappers';
import type { TypedSupabaseClient } from './server-client';

/**
 * Supabase-backed repository.
 *
 * Two layers of protection, on purpose:
 *  1. every query carries an explicit `.eq('user_id', userId)`;
 *  2. row-level security rejects anything that slips past layer 1.
 *
 * Errors are converted to `RepositoryError` so nothing Postgres-specific — table
 * names, constraint names, connection details — reaches a user-facing message.
 */
export class SupabaseRepository implements ApplyPilotRepository {
  readonly kind = 'supabase' as const;

  constructor(private readonly client: TypedSupabaseClient) {}

  private fail(operation: string, error: { message: string; code?: string }): never {
    // Generic, non-identifying server log. No row contents, no user id.
    console.error(`[repository] ${operation} failed (${error.code ?? 'unknown'})`);
    if (error.code === 'PGRST116') throw notFound('That record');
    throw new RepositoryError('unavailable', 'We could not reach your saved data. Please try again.');
  }

  // --- Profile --------------------------------------------------------------

  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.client
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) this.fail('getProfile', error);
    return data ? map.toProfile(data) : null;
  }

  async upsertProfile(userId: string, input: ProfileUpsert): Promise<UserProfile> {
    const { data, error } = await this.client
      .from('user_profiles')
      .upsert(map.fromProfile(userId, input), { onConflict: 'user_id' })
      .select('*')
      .single();
    if (error) this.fail('upsertProfile', error);
    return map.toProfile(data);
  }

  // --- Colleges -------------------------------------------------------------

  async listColleges(userId: string): Promise<College[]> {
    const { data, error } = await this.client
      .from('colleges')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });
    if (error) this.fail('listColleges', error);
    return data.map(map.toCollege);
  }

  async getCollege(userId: string, collegeId: string): Promise<College | null> {
    const { data, error } = await this.client
      .from('colleges')
      .select('*')
      .eq('user_id', userId)
      .eq('id', collegeId)
      .maybeSingle();
    if (error) this.fail('getCollege', error);
    return data ? map.toCollege(data) : null;
  }

  async createCollege(userId: string, input: NewCollege): Promise<College> {
    const { data, error } = await this.client
      .from('colleges')
      .insert({ ...map.fromCollege(input), user_id: userId, name: input.name })
      .select('*')
      .single();
    if (error) this.fail('createCollege', error);
    return map.toCollege(data);
  }

  async updateCollege(
    userId: string,
    collegeId: string,
    input: Partial<NewCollege>,
  ): Promise<College> {
    const { data, error } = await this.client
      .from('colleges')
      .update(map.fromCollege(input))
      .eq('user_id', userId)
      .eq('id', collegeId)
      .select('*')
      .maybeSingle();
    if (error) this.fail('updateCollege', error);
    if (!data) throw notFound('That college');
    return map.toCollege(data);
  }

  async deleteCollege(userId: string, collegeId: string): Promise<void> {
    const { error, count } = await this.client
      .from('colleges')
      .delete({ count: 'exact' })
      .eq('user_id', userId)
      .eq('id', collegeId);
    if (error) this.fail('deleteCollege', error);
    if (count === 0) throw notFound('That college');
  }

  // --- Applications ---------------------------------------------------------

  async listApplications(userId: string): Promise<Application[]> {
    const { data, error } = await this.client
      .from('applications')
      .select('*')
      .eq('user_id', userId)
      .order('deadline_at', { ascending: true, nullsFirst: false });
    if (error) this.fail('listApplications', error);
    return data.map(map.toApplication);
  }

  async getApplication(userId: string, applicationId: string): Promise<Application | null> {
    const { data, error } = await this.client
      .from('applications')
      .select('*')
      .eq('user_id', userId)
      .eq('id', applicationId)
      .maybeSingle();
    if (error) this.fail('getApplication', error);
    return data ? map.toApplication(data) : null;
  }

  async createApplication(userId: string, input: NewApplication): Promise<Application> {
    const college = await this.getCollege(userId, input.collegeId);
    if (!college) throw notFound('That college');

    const { data, error } = await this.client
      .from('applications')
      .insert({
        ...map.fromApplication(input),
        user_id: userId,
        college_id: input.collegeId,
        deadline_time_zone: input.deadlineTimeZone,
      })
      .select('*')
      .single();
    if (error) this.fail('createApplication', error);
    return map.toApplication(data);
  }

  async updateApplication(
    userId: string,
    applicationId: string,
    input: Partial<NewApplication>,
  ): Promise<Application> {
    if (input.collegeId) {
      const college = await this.getCollege(userId, input.collegeId);
      if (!college) throw notFound('That college');
    }
    const { data, error } = await this.client
      .from('applications')
      .update(map.fromApplication(input))
      .eq('user_id', userId)
      .eq('id', applicationId)
      .select('*')
      .maybeSingle();
    if (error) this.fail('updateApplication', error);
    if (!data) throw notFound('That application');
    return map.toApplication(data);
  }

  async deleteApplication(userId: string, applicationId: string): Promise<void> {
    const { error, count } = await this.client
      .from('applications')
      .delete({ count: 'exact' })
      .eq('user_id', userId)
      .eq('id', applicationId);
    if (error) this.fail('deleteApplication', error);
    if (count === 0) throw notFound('That application');
  }

  // --- Requirements ---------------------------------------------------------

  async listRequirements(userId: string, applicationId?: string): Promise<Requirement[]> {
    let query = this.client.from('requirements').select('*').eq('user_id', userId);
    if (applicationId) query = query.eq('application_id', applicationId);

    const { data, error } = await query.order('sort_order', { ascending: true });
    if (error) this.fail('listRequirements', error);
    return data.map(map.toRequirement);
  }

  async getRequirement(userId: string, requirementId: string): Promise<Requirement | null> {
    const { data, error } = await this.client
      .from('requirements')
      .select('*')
      .eq('user_id', userId)
      .eq('id', requirementId)
      .maybeSingle();
    if (error) this.fail('getRequirement', error);
    return data ? map.toRequirement(data) : null;
  }

  async createRequirement(userId: string, input: NewRequirement): Promise<Requirement> {
    const application = await this.getApplication(userId, input.applicationId);
    if (!application) throw notFound('That application');

    const sortOrder = input.sortOrder ?? (await this.nextRequirementOrder(userId, input.applicationId));
    const { data, error } = await this.client
      .from('requirements')
      .insert({
        ...map.fromRequirement({ ...input, sortOrder }),
        user_id: userId,
        application_id: input.applicationId,
        title: input.title,
      })
      .select('*')
      .single();
    if (error) this.fail('createRequirement', error);
    return map.toRequirement(data);
  }

  private async nextRequirementOrder(userId: string, applicationId: string): Promise<number> {
    const { data, error } = await this.client
      .from('requirements')
      .select('sort_order')
      .eq('user_id', userId)
      .eq('application_id', applicationId)
      .order('sort_order', { ascending: false })
      .limit(1);
    if (error) this.fail('nextRequirementOrder', error);
    return data.length > 0 ? data[0].sort_order + 1 : 0;
  }

  async updateRequirement(
    userId: string,
    requirementId: string,
    input: Partial<NewRequirement>,
  ): Promise<Requirement> {
    const { data, error } = await this.client
      .from('requirements')
      .update(map.fromRequirement(input))
      .eq('user_id', userId)
      .eq('id', requirementId)
      .select('*')
      .maybeSingle();
    if (error) this.fail('updateRequirement', error);
    if (!data) throw notFound('That requirement');
    return map.toRequirement(data);
  }

  async deleteRequirement(userId: string, requirementId: string): Promise<void> {
    const { error, count } = await this.client
      .from('requirements')
      .delete({ count: 'exact' })
      .eq('user_id', userId)
      .eq('id', requirementId);
    if (error) this.fail('deleteRequirement', error);
    if (count === 0) throw notFound('That requirement');
  }

  // --- Essays ---------------------------------------------------------------

  async listEssays(userId: string): Promise<Essay[]> {
    const { data, error } = await this.client
      .from('essays')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) this.fail('listEssays', error);
    return data.map(map.toEssay);
  }

  async getEssay(userId: string, essayId: string): Promise<Essay | null> {
    const { data, error } = await this.client
      .from('essays')
      .select('*')
      .eq('user_id', userId)
      .eq('id', essayId)
      .maybeSingle();
    if (error) this.fail('getEssay', error);
    return data ? map.toEssay(data) : null;
  }

  async createEssay(userId: string, input: NewEssay): Promise<Essay> {
    await this.assertOptionalLinks(userId, input.applicationId, input.collegeId);
    const { data, error } = await this.client
      .from('essays')
      .insert({
        ...map.fromEssay(input),
        user_id: userId,
        title: input.title,
        current_draft: input.currentDraft ?? '',
      })
      .select('*')
      .single();
    if (error) this.fail('createEssay', error);
    return map.toEssay(data);
  }

  async updateEssay(userId: string, essayId: string, input: Partial<NewEssay>): Promise<Essay> {
    await this.assertOptionalLinks(userId, input.applicationId, input.collegeId);
    const { data, error } = await this.client
      .from('essays')
      .update(map.fromEssay(input))
      .eq('user_id', userId)
      .eq('id', essayId)
      .select('*')
      .maybeSingle();
    if (error) this.fail('updateEssay', error);
    if (!data) throw notFound('That essay');
    return map.toEssay(data);
  }

  async deleteEssay(userId: string, essayId: string): Promise<void> {
    const { error, count } = await this.client
      .from('essays')
      .delete({ count: 'exact' })
      .eq('user_id', userId)
      .eq('id', essayId);
    if (error) this.fail('deleteEssay', error);
    if (count === 0) throw notFound('That essay');
  }

  private async assertOptionalLinks(
    userId: string,
    applicationId?: string | null,
    collegeId?: string | null,
  ): Promise<void> {
    if (applicationId && !(await this.getApplication(userId, applicationId))) {
      throw notFound('That application');
    }
    if (collegeId && !(await this.getCollege(userId, collegeId))) {
      throw notFound('That college');
    }
  }

  // --- Essay versions -------------------------------------------------------

  async listEssayVersions(userId: string, essayId: string): Promise<EssayVersion[]> {
    const { data, error } = await this.client
      .from('essay_versions')
      .select('*')
      .eq('user_id', userId)
      .eq('essay_id', essayId)
      .order('created_at', { ascending: false });
    if (error) this.fail('listEssayVersions', error);
    return data.map(map.toEssayVersion);
  }

  async getEssayVersion(userId: string, versionId: string): Promise<EssayVersion | null> {
    const { data, error } = await this.client
      .from('essay_versions')
      .select('*')
      .eq('user_id', userId)
      .eq('id', versionId)
      .maybeSingle();
    if (error) this.fail('getEssayVersion', error);
    return data ? map.toEssayVersion(data) : null;
  }

  async createEssayVersion(userId: string, input: NewEssayVersion): Promise<EssayVersion> {
    if (!(await this.getEssay(userId, input.essayId))) throw notFound('That essay');
    const { data, error } = await this.client
      .from('essay_versions')
      .insert({
        user_id: userId,
        essay_id: input.essayId,
        content: input.content,
        source: input.source,
        note: input.note,
      })
      .select('*')
      .single();
    if (error) this.fail('createEssayVersion', error);
    return map.toEssayVersion(data);
  }

  // --- Activities -----------------------------------------------------------

  async listActivities(userId: string): Promise<Activity[]> {
    const { data, error } = await this.client
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true });
    if (error) this.fail('listActivities', error);
    return data.map(map.toActivity);
  }

  async getActivity(userId: string, activityId: string): Promise<Activity | null> {
    const { data, error } = await this.client
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .eq('id', activityId)
      .maybeSingle();
    if (error) this.fail('getActivity', error);
    return data ? map.toActivity(data) : null;
  }

  async createActivity(userId: string, input: NewActivity): Promise<Activity> {
    const existing = await this.listActivities(userId);
    const sortOrder =
      input.sortOrder ?? (existing.length > 0 ? Math.max(...existing.map((a) => a.sortOrder)) + 1 : 0);

    const { data, error } = await this.client
      .from('activities')
      .insert({
        ...map.fromActivity({ ...input, sortOrder }),
        user_id: userId,
        organization: input.organization,
      })
      .select('*')
      .single();
    if (error) this.fail('createActivity', error);
    return map.toActivity(data);
  }

  async updateActivity(
    userId: string,
    activityId: string,
    input: Partial<NewActivity>,
  ): Promise<Activity> {
    const { data, error } = await this.client
      .from('activities')
      .update(map.fromActivity(input))
      .eq('user_id', userId)
      .eq('id', activityId)
      .select('*')
      .maybeSingle();
    if (error) this.fail('updateActivity', error);
    if (!data) throw notFound('That activity');
    return map.toActivity(data);
  }

  async deleteActivity(userId: string, activityId: string): Promise<void> {
    const { error, count } = await this.client
      .from('activities')
      .delete({ count: 'exact' })
      .eq('user_id', userId)
      .eq('id', activityId);
    if (error) this.fail('deleteActivity', error);
    if (count === 0) throw notFound('That activity');

    const remaining = await this.listActivities(userId);
    await this.saveActivityOrder(
      userId,
      sortBySortOrder(remaining).map((a) => a.id),
    );
  }

  async saveActivityOrder(userId: string, orderedIds: string[]): Promise<void> {
    // Sequential updates keep every write scoped to one owned row. The list is
    // small (an activities list is a couple of dozen rows at most).
    for (const [index, id] of orderedIds.entries()) {
      const { error } = await this.client
        .from('activities')
        .update({ sort_order: index })
        .eq('user_id', userId)
        .eq('id', id);
      if (error) this.fail('saveActivityOrder', error);
    }
  }

  // --- Recommenders ---------------------------------------------------------

  async listRecommenders(userId: string): Promise<Recommender[]> {
    const { data, error } = await this.client
      .from('recommenders')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });
    if (error) this.fail('listRecommenders', error);
    return data.map(map.toRecommender);
  }

  async getRecommender(userId: string, recommenderId: string): Promise<Recommender | null> {
    const { data, error } = await this.client
      .from('recommenders')
      .select('*')
      .eq('user_id', userId)
      .eq('id', recommenderId)
      .maybeSingle();
    if (error) this.fail('getRecommender', error);
    return data ? map.toRecommender(data) : null;
  }

  async createRecommender(userId: string, input: NewRecommender): Promise<Recommender> {
    const { data, error } = await this.client
      .from('recommenders')
      .insert({ ...map.fromRecommender(input), user_id: userId, name: input.name })
      .select('*')
      .single();
    if (error) this.fail('createRecommender', error);
    return map.toRecommender(data);
  }

  async updateRecommender(
    userId: string,
    recommenderId: string,
    input: Partial<NewRecommender>,
  ): Promise<Recommender> {
    const { data, error } = await this.client
      .from('recommenders')
      .update(map.fromRecommender(input))
      .eq('user_id', userId)
      .eq('id', recommenderId)
      .select('*')
      .maybeSingle();
    if (error) this.fail('updateRecommender', error);
    if (!data) throw notFound('That recommender');
    return map.toRecommender(data);
  }

  async deleteRecommender(userId: string, recommenderId: string): Promise<void> {
    const { error, count } = await this.client
      .from('recommenders')
      .delete({ count: 'exact' })
      .eq('user_id', userId)
      .eq('id', recommenderId);
    if (error) this.fail('deleteRecommender', error);
    if (count === 0) throw notFound('That recommender');
  }

  // --- Application <-> recommender -----------------------------------------

  async listApplicationRecommenders(userId: string): Promise<ApplicationRecommender[]> {
    const { data, error } = await this.client
      .from('application_recommenders')
      .select('*')
      .eq('user_id', userId);
    if (error) this.fail('listApplicationRecommenders', error);
    return data.map(map.toApplicationRecommender);
  }

  async linkRecommender(
    userId: string,
    applicationId: string,
    recommenderId: string,
  ): Promise<ApplicationRecommender> {
    const [application, recommender] = await Promise.all([
      this.getApplication(userId, applicationId),
      this.getRecommender(userId, recommenderId),
    ]);
    if (!application) throw notFound('That application');
    if (!recommender) throw notFound('That recommender');

    const { data, error } = await this.client
      .from('application_recommenders')
      .upsert(
        {
          user_id: userId,
          application_id: applicationId,
          recommender_id: recommenderId,
          status: recommender.status,
        },
        { onConflict: 'application_id,recommender_id' },
      )
      .select('*')
      .single();
    if (error) this.fail('linkRecommender', error);
    return map.toApplicationRecommender(data);
  }

  async unlinkRecommender(
    userId: string,
    applicationId: string,
    recommenderId: string,
  ): Promise<void> {
    const { error } = await this.client
      .from('application_recommenders')
      .delete()
      .eq('user_id', userId)
      .eq('application_id', applicationId)
      .eq('recommender_id', recommenderId);
    if (error) this.fail('unlinkRecommender', error);
  }

  // --- Scholarships ---------------------------------------------------------

  async listScholarships(userId: string): Promise<Scholarship[]> {
    const { data, error } = await this.client
      .from('scholarships')
      .select('*')
      .eq('user_id', userId)
      .order('deadline_at', { ascending: true, nullsFirst: false });
    if (error) this.fail('listScholarships', error);
    return data.map(map.toScholarship);
  }

  async getScholarship(userId: string, scholarshipId: string): Promise<Scholarship | null> {
    const { data, error } = await this.client
      .from('scholarships')
      .select('*')
      .eq('user_id', userId)
      .eq('id', scholarshipId)
      .maybeSingle();
    if (error) this.fail('getScholarship', error);
    return data ? map.toScholarship(data) : null;
  }

  async createScholarship(userId: string, input: NewScholarship): Promise<Scholarship> {
    const essayIds = await this.filterOwnedEssayIds(userId, input.essayIds);
    const { data, error } = await this.client
      .from('scholarships')
      .insert({
        ...map.fromScholarship({ ...input, essayIds }),
        user_id: userId,
        title: input.title,
        deadline_time_zone: input.deadlineTimeZone,
      })
      .select('*')
      .single();
    if (error) this.fail('createScholarship', error);
    return map.toScholarship(data);
  }

  async updateScholarship(
    userId: string,
    scholarshipId: string,
    input: Partial<NewScholarship>,
  ): Promise<Scholarship> {
    const essayIds = input.essayIds
      ? await this.filterOwnedEssayIds(userId, input.essayIds)
      : undefined;

    const { data, error } = await this.client
      .from('scholarships')
      .update(map.fromScholarship({ ...input, essayIds }))
      .eq('user_id', userId)
      .eq('id', scholarshipId)
      .select('*')
      .maybeSingle();
    if (error) this.fail('updateScholarship', error);
    if (!data) throw notFound('That scholarship');
    return map.toScholarship(data);
  }

  async deleteScholarship(userId: string, scholarshipId: string): Promise<void> {
    const { error, count } = await this.client
      .from('scholarships')
      .delete({ count: 'exact' })
      .eq('user_id', userId)
      .eq('id', scholarshipId);
    if (error) this.fail('deleteScholarship', error);
    if (count === 0) throw notFound('That scholarship');
  }

  private async filterOwnedEssayIds(userId: string, essayIds: string[]): Promise<string[]> {
    if (essayIds.length === 0) return [];
    const { data, error } = await this.client
      .from('essays')
      .select('id')
      .eq('user_id', userId)
      .in('id', essayIds);
    if (error) this.fail('filterOwnedEssayIds', error);
    return data.map((row) => row.id);
  }

  // --- Tasks ----------------------------------------------------------------

  async listTasks(userId: string): Promise<Task[]> {
    const { data, error } = await this.client
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('due_at', { ascending: true, nullsFirst: false });
    if (error) this.fail('listTasks', error);
    return data.map(map.toTask);
  }

  async getTask(userId: string, taskId: string): Promise<Task | null> {
    const { data, error } = await this.client
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('id', taskId)
      .maybeSingle();
    if (error) this.fail('getTask', error);
    return data ? map.toTask(data) : null;
  }

  async createTask(userId: string, input: NewTask): Promise<Task> {
    await this.assertOptionalLinks(userId, input.applicationId, null);
    const { data, error } = await this.client
      .from('tasks')
      .insert({
        ...map.fromTask(input),
        user_id: userId,
        title: input.title,
        time_zone: input.timeZone,
      })
      .select('*')
      .single();
    if (error) this.fail('createTask', error);
    return map.toTask(data);
  }

  async updateTask(userId: string, taskId: string, input: Partial<NewTask>): Promise<Task> {
    const { data, error } = await this.client
      .from('tasks')
      .update(map.fromTask(input))
      .eq('user_id', userId)
      .eq('id', taskId)
      .select('*')
      .maybeSingle();
    if (error) this.fail('updateTask', error);
    if (!data) throw notFound('That task');
    return map.toTask(data);
  }

  async deleteTask(userId: string, taskId: string): Promise<void> {
    const { error, count } = await this.client
      .from('tasks')
      .delete({ count: 'exact' })
      .eq('user_id', userId)
      .eq('id', taskId);
    if (error) this.fail('deleteTask', error);
    if (count === 0) throw notFound('That task');
  }

  // --- Coach ----------------------------------------------------------------

  async listCoachSessions(userId: string): Promise<CoachSession[]> {
    const { data, error } = await this.client
      .from('coach_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) this.fail('listCoachSessions', error);
    return data.map(map.toCoachSession);
  }

  async getCoachSession(userId: string, sessionId: string): Promise<CoachSession | null> {
    const { data, error } = await this.client
      .from('coach_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('id', sessionId)
      .maybeSingle();
    if (error) this.fail('getCoachSession', error);
    return data ? map.toCoachSession(data) : null;
  }

  async createCoachSession(userId: string, input: NewCoachSession): Promise<CoachSession> {
    const { data, error } = await this.client
      .from('coach_sessions')
      .insert({ user_id: userId, mode: input.mode, title: input.title })
      .select('*')
      .single();
    if (error) this.fail('createCoachSession', error);
    return map.toCoachSession(data);
  }

  async deleteCoachSession(userId: string, sessionId: string): Promise<void> {
    const { error, count } = await this.client
      .from('coach_sessions')
      .delete({ count: 'exact' })
      .eq('user_id', userId)
      .eq('id', sessionId);
    if (error) this.fail('deleteCoachSession', error);
    if (count === 0) throw notFound('That conversation');
  }

  async listCoachMessages(userId: string, sessionId: string): Promise<CoachMessage[]> {
    const { data, error } = await this.client
      .from('coach_messages')
      .select('*')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (error) this.fail('listCoachMessages', error);
    return data.map(map.toCoachMessage);
  }

  async createCoachMessage(userId: string, input: NewCoachMessage): Promise<CoachMessage> {
    if (!(await this.getCoachSession(userId, input.sessionId))) throw notFound('That conversation');
    const { data, error } = await this.client
      .from('coach_messages')
      .insert({
        user_id: userId,
        session_id: input.sessionId,
        role: input.role,
        content: input.content,
        metadata: input.metadata,
      })
      .select('*')
      .single();
    if (error) this.fail('createCoachMessage', error);
    return map.toCoachMessage(data);
  }

  // --- Whole account --------------------------------------------------------

  async exportUserData(userId: string): Promise<UserDataBundle> {
    const [
      profile,
      colleges,
      applications,
      requirements,
      essays,
      activities,
      recommenders,
      applicationRecommenders,
      scholarships,
      tasks,
      coachSessions,
    ] = await Promise.all([
      this.getProfile(userId),
      this.listColleges(userId),
      this.listApplications(userId),
      this.listRequirements(userId),
      this.listEssays(userId),
      this.listActivities(userId),
      this.listRecommenders(userId),
      this.listApplicationRecommenders(userId),
      this.listScholarships(userId),
      this.listTasks(userId),
      this.listCoachSessions(userId),
    ]);

    const { data: versionRows, error: versionError } = await this.client
      .from('essay_versions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (versionError) this.fail('exportUserData', versionError);

    const { data: messageRows, error: messageError } = await this.client
      .from('coach_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (messageError) this.fail('exportUserData', messageError);

    return {
      profile,
      colleges,
      applications,
      requirements,
      essays,
      essayVersions: versionRows.map(map.toEssayVersion),
      activities,
      recommenders,
      applicationRecommenders,
      scholarships,
      tasks,
      coachSessions,
      coachMessages: messageRows.map(map.toCoachMessage),
    };
  }

  async deleteAllUserData(userId: string): Promise<void> {
    // Ordered so foreign keys never block a delete. Cascades cover most of it,
    // but being explicit means the outcome does not depend on cascade config.
    const tables = [
      'coach_messages',
      'coach_sessions',
      'tasks',
      'essay_versions',
      'application_recommenders',
      'requirements',
      'scholarships',
      'essays',
      'applications',
      'recommenders',
      'activities',
      'colleges',
      'user_profiles',
    ] as const;

    for (const table of tables) {
      const { error } = await this.client.from(table).delete().eq('user_id', userId);
      if (error) this.fail(`deleteAllUserData:${table}`, error);
    }
  }

  async resetDemoData(): Promise<void> {
    // Demo seeding never touches production storage.
    throw new RepositoryError(
      'invalid',
      'Demo data can only be reset while ApplyPilot is running in demo mode.',
    );
  }
}
