import 'server-only';

import { newId } from '@/lib/utils/id';
import { nextSortOrder, renumber, sortBySortOrder } from '@/lib/domain/ordering';
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
  notFound,
} from '../repository';
import { clearWorkspace, getWorkspace, resetWorkspace } from './store';

/**
 * In-memory repository backing demo mode.
 *
 * Every method filters by `userId` exactly the way the Supabase adapter does,
 * so a bug in a caller that passes the wrong id fails the same way in both
 * adapters instead of only showing up in production.
 */
export class DemoRepository implements ApplyPilotRepository {
  readonly kind = 'demo' as const;

  constructor(private readonly workspaceId: string) {}

  private data(): UserDataBundle {
    return getWorkspace(this.workspaceId);
  }

  private stamp() {
    return new Date().toISOString();
  }

  /** Clones on the way out so callers cannot mutate the store by reference. */
  private clone<T>(value: T): T {
    return structuredClone(value);
  }

  private owned<T extends { userId: string }>(rows: T[], userId: string): T[] {
    return rows.filter((row) => row.userId === userId);
  }

  // --- Profile --------------------------------------------------------------

  async getProfile(userId: string): Promise<UserProfile | null> {
    const profile = this.data().profile;
    if (!profile || profile.userId !== userId) return null;
    return this.clone(profile);
  }

  async upsertProfile(userId: string, input: ProfileUpsert): Promise<UserProfile> {
    const data = this.data();
    const now = this.stamp();
    const existing = data.profile && data.profile.userId === userId ? data.profile : null;

    const profile: UserProfile = existing
      ? { ...existing, ...input, userId, updatedAt: now }
      : { ...input, id: newId(), userId, createdAt: now, updatedAt: now };

    data.profile = profile;
    return this.clone(profile);
  }

  // --- Colleges -------------------------------------------------------------

  async listColleges(userId: string): Promise<College[]> {
    return this.clone(
      this.owned(this.data().colleges, userId).sort((a, b) => a.name.localeCompare(b.name)),
    );
  }

  async getCollege(userId: string, collegeId: string): Promise<College | null> {
    const found = this.data().colleges.find((c) => c.id === collegeId && c.userId === userId);
    return found ? this.clone(found) : null;
  }

  async createCollege(userId: string, input: NewCollege): Promise<College> {
    const now = this.stamp();
    const college: College = { ...input, id: newId(), userId, createdAt: now, updatedAt: now };
    this.data().colleges.push(college);
    return this.clone(college);
  }

  async updateCollege(
    userId: string,
    collegeId: string,
    input: Partial<NewCollege>,
  ): Promise<College> {
    const data = this.data();
    const index = data.colleges.findIndex((c) => c.id === collegeId && c.userId === userId);
    if (index === -1) throw notFound('That college');
    data.colleges[index] = { ...data.colleges[index], ...input, updatedAt: this.stamp() };
    return this.clone(data.colleges[index]);
  }

  async deleteCollege(userId: string, collegeId: string): Promise<void> {
    const data = this.data();
    const index = data.colleges.findIndex((c) => c.id === collegeId && c.userId === userId);
    if (index === -1) throw notFound('That college');

    // Cascade: applications for this college, and everything hanging off them.
    const applicationIds = data.applications
      .filter((a) => a.userId === userId && a.collegeId === collegeId)
      .map((a) => a.id);

    data.colleges.splice(index, 1);
    data.applications = data.applications.filter((a) => !applicationIds.includes(a.id));
    data.requirements = data.requirements.filter((r) => !applicationIds.includes(r.applicationId));
    data.applicationRecommenders = data.applicationRecommenders.filter(
      (link) => !applicationIds.includes(link.applicationId),
    );
    // Essays survive: a student's writing is never deleted as a side effect.
    data.essays = data.essays.map((essay) =>
      essay.collegeId === collegeId ||
      (essay.applicationId && applicationIds.includes(essay.applicationId))
        ? { ...essay, collegeId: null, applicationId: null, updatedAt: this.stamp() }
        : essay,
    );
    data.tasks = data.tasks.map((task) =>
      task.applicationId && applicationIds.includes(task.applicationId)
        ? { ...task, applicationId: null, updatedAt: this.stamp() }
        : task,
    );
  }

  // --- Applications ---------------------------------------------------------

  async listApplications(userId: string): Promise<Application[]> {
    return this.clone(this.owned(this.data().applications, userId));
  }

  async getApplication(userId: string, applicationId: string): Promise<Application | null> {
    const found = this.data().applications.find(
      (a) => a.id === applicationId && a.userId === userId,
    );
    return found ? this.clone(found) : null;
  }

  async createApplication(userId: string, input: NewApplication): Promise<Application> {
    const data = this.data();
    const college = data.colleges.find((c) => c.id === input.collegeId && c.userId === userId);
    if (!college) throw notFound('That college');

    const now = this.stamp();
    const application: Application = {
      ...input,
      id: newId(),
      userId,
      createdAt: now,
      updatedAt: now,
    };
    data.applications.push(application);
    return this.clone(application);
  }

  async updateApplication(
    userId: string,
    applicationId: string,
    input: Partial<NewApplication>,
  ): Promise<Application> {
    const data = this.data();
    const index = data.applications.findIndex((a) => a.id === applicationId && a.userId === userId);
    if (index === -1) throw notFound('That application');

    if (input.collegeId) {
      const college = data.colleges.find((c) => c.id === input.collegeId && c.userId === userId);
      if (!college) throw notFound('That college');
    }

    data.applications[index] = { ...data.applications[index], ...input, updatedAt: this.stamp() };
    return this.clone(data.applications[index]);
  }

  async deleteApplication(userId: string, applicationId: string): Promise<void> {
    const data = this.data();
    const index = data.applications.findIndex((a) => a.id === applicationId && a.userId === userId);
    if (index === -1) throw notFound('That application');

    data.applications.splice(index, 1);
    data.requirements = data.requirements.filter((r) => r.applicationId !== applicationId);
    data.applicationRecommenders = data.applicationRecommenders.filter(
      (link) => link.applicationId !== applicationId,
    );
    data.essays = data.essays.map((essay) =>
      essay.applicationId === applicationId
        ? { ...essay, applicationId: null, updatedAt: this.stamp() }
        : essay,
    );
    data.tasks = data.tasks.map((task) =>
      task.applicationId === applicationId
        ? { ...task, applicationId: null, updatedAt: this.stamp() }
        : task,
    );
  }

  // --- Requirements ---------------------------------------------------------

  async listRequirements(userId: string, applicationId?: string): Promise<Requirement[]> {
    const rows = this.owned(this.data().requirements, userId).filter(
      (r) => !applicationId || r.applicationId === applicationId,
    );
    return this.clone(sortBySortOrder(rows));
  }

  async getRequirement(userId: string, requirementId: string): Promise<Requirement | null> {
    const found = this.data().requirements.find(
      (r) => r.id === requirementId && r.userId === userId,
    );
    return found ? this.clone(found) : null;
  }

  async createRequirement(userId: string, input: NewRequirement): Promise<Requirement> {
    const data = this.data();
    const application = data.applications.find(
      (a) => a.id === input.applicationId && a.userId === userId,
    );
    if (!application) throw notFound('That application');

    const siblings = data.requirements.filter(
      (r) => r.userId === userId && r.applicationId === input.applicationId,
    );
    const now = this.stamp();
    const requirement: Requirement = {
      ...input,
      sortOrder: input.sortOrder ?? nextSortOrder(siblings),
      id: newId(),
      userId,
      createdAt: now,
      updatedAt: now,
    };
    data.requirements.push(requirement);
    return this.clone(requirement);
  }

  async updateRequirement(
    userId: string,
    requirementId: string,
    input: Partial<NewRequirement>,
  ): Promise<Requirement> {
    const data = this.data();
    const index = data.requirements.findIndex((r) => r.id === requirementId && r.userId === userId);
    if (index === -1) throw notFound('That requirement');
    data.requirements[index] = { ...data.requirements[index], ...input, updatedAt: this.stamp() };
    return this.clone(data.requirements[index]);
  }

  async deleteRequirement(userId: string, requirementId: string): Promise<void> {
    const data = this.data();
    const index = data.requirements.findIndex((r) => r.id === requirementId && r.userId === userId);
    if (index === -1) throw notFound('That requirement');
    data.requirements.splice(index, 1);
  }

  // --- Essays ---------------------------------------------------------------

  async listEssays(userId: string): Promise<Essay[]> {
    return this.clone(
      this.owned(this.data().essays, userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    );
  }

  async getEssay(userId: string, essayId: string): Promise<Essay | null> {
    const found = this.data().essays.find((e) => e.id === essayId && e.userId === userId);
    return found ? this.clone(found) : null;
  }

  async createEssay(userId: string, input: NewEssay): Promise<Essay> {
    const data = this.data();
    this.assertOptionalLinks(userId, input.applicationId, input.collegeId);

    const now = this.stamp();
    const essay: Essay = { ...input, id: newId(), userId, createdAt: now, updatedAt: now };
    data.essays.push(essay);
    return this.clone(essay);
  }

  async updateEssay(userId: string, essayId: string, input: Partial<NewEssay>): Promise<Essay> {
    const data = this.data();
    const index = data.essays.findIndex((e) => e.id === essayId && e.userId === userId);
    if (index === -1) throw notFound('That essay');
    this.assertOptionalLinks(userId, input.applicationId, input.collegeId);

    data.essays[index] = { ...data.essays[index], ...input, updatedAt: this.stamp() };
    return this.clone(data.essays[index]);
  }

  async deleteEssay(userId: string, essayId: string): Promise<void> {
    const data = this.data();
    const index = data.essays.findIndex((e) => e.id === essayId && e.userId === userId);
    if (index === -1) throw notFound('That essay');

    data.essays.splice(index, 1);
    data.essayVersions = data.essayVersions.filter((v) => v.essayId !== essayId);
    data.tasks = data.tasks.map((task) =>
      task.essayId === essayId ? { ...task, essayId: null, updatedAt: this.stamp() } : task,
    );
    data.scholarships = data.scholarships.map((s) =>
      s.essayIds.includes(essayId)
        ? { ...s, essayIds: s.essayIds.filter((id) => id !== essayId), updatedAt: this.stamp() }
        : s,
    );
  }

  private assertOptionalLinks(
    userId: string,
    applicationId?: string | null,
    collegeId?: string | null,
  ): void {
    const data = this.data();
    if (applicationId) {
      const found = data.applications.some((a) => a.id === applicationId && a.userId === userId);
      if (!found) throw notFound('That application');
    }
    if (collegeId) {
      const found = data.colleges.some((c) => c.id === collegeId && c.userId === userId);
      if (!found) throw notFound('That college');
    }
  }

  // --- Essay versions -------------------------------------------------------

  async listEssayVersions(userId: string, essayId: string): Promise<EssayVersion[]> {
    const rows = this.data().essayVersions.filter(
      (v) => v.userId === userId && v.essayId === essayId,
    );
    return this.clone(rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }

  async getEssayVersion(userId: string, versionId: string): Promise<EssayVersion | null> {
    const found = this.data().essayVersions.find((v) => v.id === versionId && v.userId === userId);
    return found ? this.clone(found) : null;
  }

  async createEssayVersion(userId: string, input: NewEssayVersion): Promise<EssayVersion> {
    const data = this.data();
    const essay = data.essays.find((e) => e.id === input.essayId && e.userId === userId);
    if (!essay) throw notFound('That essay');

    const version: EssayVersion = {
      ...input,
      id: newId(),
      userId,
      createdAt: this.stamp(),
    };
    data.essayVersions.push(version);
    return this.clone(version);
  }

  // --- Activities -----------------------------------------------------------

  async listActivities(userId: string): Promise<Activity[]> {
    return this.clone(sortBySortOrder(this.owned(this.data().activities, userId)));
  }

  async getActivity(userId: string, activityId: string): Promise<Activity | null> {
    const found = this.data().activities.find((a) => a.id === activityId && a.userId === userId);
    return found ? this.clone(found) : null;
  }

  async createActivity(userId: string, input: NewActivity): Promise<Activity> {
    const data = this.data();
    const siblings = this.owned(data.activities, userId);
    const now = this.stamp();
    const activity: Activity = {
      ...input,
      sortOrder: input.sortOrder ?? nextSortOrder(siblings),
      id: newId(),
      userId,
      createdAt: now,
      updatedAt: now,
    };
    data.activities.push(activity);
    return this.clone(activity);
  }

  async updateActivity(
    userId: string,
    activityId: string,
    input: Partial<NewActivity>,
  ): Promise<Activity> {
    const data = this.data();
    const index = data.activities.findIndex((a) => a.id === activityId && a.userId === userId);
    if (index === -1) throw notFound('That activity');
    data.activities[index] = { ...data.activities[index], ...input, updatedAt: this.stamp() };
    return this.clone(data.activities[index]);
  }

  async deleteActivity(userId: string, activityId: string): Promise<void> {
    const data = this.data();
    const index = data.activities.findIndex((a) => a.id === activityId && a.userId === userId);
    if (index === -1) throw notFound('That activity');
    data.activities.splice(index, 1);

    // Close the gap so ordering stays contiguous.
    const reordered = renumber(sortBySortOrder(this.owned(data.activities, userId)));
    const byId = new Map(reordered.map((a) => [a.id, a.sortOrder]));
    data.activities = data.activities.map((a) =>
      byId.has(a.id) ? { ...a, sortOrder: byId.get(a.id) as number } : a,
    );
  }

  async saveActivityOrder(userId: string, orderedIds: string[]): Promise<void> {
    const data = this.data();
    const owned = new Set(this.owned(data.activities, userId).map((a) => a.id));
    const positions = new Map<string, number>();

    orderedIds.forEach((id, index) => {
      if (owned.has(id)) positions.set(id, index);
    });

    data.activities = data.activities.map((activity) =>
      positions.has(activity.id)
        ? { ...activity, sortOrder: positions.get(activity.id) as number, updatedAt: this.stamp() }
        : activity,
    );
  }

  // --- Recommenders ---------------------------------------------------------

  async listRecommenders(userId: string): Promise<Recommender[]> {
    return this.clone(
      this.owned(this.data().recommenders, userId).sort((a, b) => a.name.localeCompare(b.name)),
    );
  }

  async getRecommender(userId: string, recommenderId: string): Promise<Recommender | null> {
    const found = this.data().recommenders.find(
      (r) => r.id === recommenderId && r.userId === userId,
    );
    return found ? this.clone(found) : null;
  }

  async createRecommender(userId: string, input: NewRecommender): Promise<Recommender> {
    const now = this.stamp();
    const recommender: Recommender = {
      ...input,
      id: newId(),
      userId,
      createdAt: now,
      updatedAt: now,
    };
    this.data().recommenders.push(recommender);
    return this.clone(recommender);
  }

  async updateRecommender(
    userId: string,
    recommenderId: string,
    input: Partial<NewRecommender>,
  ): Promise<Recommender> {
    const data = this.data();
    const index = data.recommenders.findIndex((r) => r.id === recommenderId && r.userId === userId);
    if (index === -1) throw notFound('That recommender');
    data.recommenders[index] = { ...data.recommenders[index], ...input, updatedAt: this.stamp() };
    return this.clone(data.recommenders[index]);
  }

  async deleteRecommender(userId: string, recommenderId: string): Promise<void> {
    const data = this.data();
    const index = data.recommenders.findIndex((r) => r.id === recommenderId && r.userId === userId);
    if (index === -1) throw notFound('That recommender');
    data.recommenders.splice(index, 1);
    data.applicationRecommenders = data.applicationRecommenders.filter(
      (link) => link.recommenderId !== recommenderId,
    );
    data.tasks = data.tasks.map((task) =>
      task.recommenderId === recommenderId
        ? { ...task, recommenderId: null, updatedAt: this.stamp() }
        : task,
    );
  }

  // --- Application <-> recommender -----------------------------------------

  async listApplicationRecommenders(userId: string): Promise<ApplicationRecommender[]> {
    return this.clone(this.owned(this.data().applicationRecommenders, userId));
  }

  async linkRecommender(
    userId: string,
    applicationId: string,
    recommenderId: string,
  ): Promise<ApplicationRecommender> {
    const data = this.data();
    const application = data.applications.find(
      (a) => a.id === applicationId && a.userId === userId,
    );
    if (!application) throw notFound('That application');
    const recommender = data.recommenders.find(
      (r) => r.id === recommenderId && r.userId === userId,
    );
    if (!recommender) throw notFound('That recommender');

    const existing = data.applicationRecommenders.find(
      (link) =>
        link.userId === userId &&
        link.applicationId === applicationId &&
        link.recommenderId === recommenderId,
    );
    if (existing) return this.clone(existing);

    const link: ApplicationRecommender = {
      userId,
      applicationId,
      recommenderId,
      status: recommender.status,
    };
    data.applicationRecommenders.push(link);
    return this.clone(link);
  }

  async unlinkRecommender(
    userId: string,
    applicationId: string,
    recommenderId: string,
  ): Promise<void> {
    const data = this.data();
    data.applicationRecommenders = data.applicationRecommenders.filter(
      (link) =>
        !(
          link.userId === userId &&
          link.applicationId === applicationId &&
          link.recommenderId === recommenderId
        ),
    );
  }

  // --- Scholarships ---------------------------------------------------------

  async listScholarships(userId: string): Promise<Scholarship[]> {
    return this.clone(this.owned(this.data().scholarships, userId));
  }

  async getScholarship(userId: string, scholarshipId: string): Promise<Scholarship | null> {
    const found = this.data().scholarships.find(
      (s) => s.id === scholarshipId && s.userId === userId,
    );
    return found ? this.clone(found) : null;
  }

  async createScholarship(userId: string, input: NewScholarship): Promise<Scholarship> {
    const now = this.stamp();
    const scholarship: Scholarship = {
      ...input,
      essayIds: this.filterOwnedEssayIds(userId, input.essayIds),
      id: newId(),
      userId,
      createdAt: now,
      updatedAt: now,
    };
    this.data().scholarships.push(scholarship);
    return this.clone(scholarship);
  }

  async updateScholarship(
    userId: string,
    scholarshipId: string,
    input: Partial<NewScholarship>,
  ): Promise<Scholarship> {
    const data = this.data();
    const index = data.scholarships.findIndex((s) => s.id === scholarshipId && s.userId === userId);
    if (index === -1) throw notFound('That scholarship');

    const essayIds = input.essayIds
      ? this.filterOwnedEssayIds(userId, input.essayIds)
      : data.scholarships[index].essayIds;

    data.scholarships[index] = {
      ...data.scholarships[index],
      ...input,
      essayIds,
      updatedAt: this.stamp(),
    };
    return this.clone(data.scholarships[index]);
  }

  async deleteScholarship(userId: string, scholarshipId: string): Promise<void> {
    const data = this.data();
    const index = data.scholarships.findIndex((s) => s.id === scholarshipId && s.userId === userId);
    if (index === -1) throw notFound('That scholarship');
    data.scholarships.splice(index, 1);
    data.tasks = data.tasks.map((task) =>
      task.scholarshipId === scholarshipId
        ? { ...task, scholarshipId: null, updatedAt: this.stamp() }
        : task,
    );
  }

  /** Silently drops essay ids that are not this user's — never a cross-user link. */
  private filterOwnedEssayIds(userId: string, essayIds: string[]): string[] {
    const owned = new Set(this.owned(this.data().essays, userId).map((e) => e.id));
    return essayIds.filter((id) => owned.has(id));
  }

  // --- Tasks ----------------------------------------------------------------

  async listTasks(userId: string): Promise<Task[]> {
    return this.clone(this.owned(this.data().tasks, userId));
  }

  async getTask(userId: string, taskId: string): Promise<Task | null> {
    const found = this.data().tasks.find((t) => t.id === taskId && t.userId === userId);
    return found ? this.clone(found) : null;
  }

  async createTask(userId: string, input: NewTask): Promise<Task> {
    this.assertOptionalLinks(userId, input.applicationId, null);
    const now = this.stamp();
    const task: Task = { ...input, id: newId(), userId, createdAt: now, updatedAt: now };
    this.data().tasks.push(task);
    return this.clone(task);
  }

  async updateTask(userId: string, taskId: string, input: Partial<NewTask>): Promise<Task> {
    const data = this.data();
    const index = data.tasks.findIndex((t) => t.id === taskId && t.userId === userId);
    if (index === -1) throw notFound('That task');
    data.tasks[index] = { ...data.tasks[index], ...input, updatedAt: this.stamp() };
    return this.clone(data.tasks[index]);
  }

  async deleteTask(userId: string, taskId: string): Promise<void> {
    const data = this.data();
    const index = data.tasks.findIndex((t) => t.id === taskId && t.userId === userId);
    if (index === -1) throw notFound('That task');
    data.tasks.splice(index, 1);
  }

  // --- Coach ----------------------------------------------------------------

  async listCoachSessions(userId: string): Promise<CoachSession[]> {
    return this.clone(
      this.owned(this.data().coachSessions, userId).sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      ),
    );
  }

  async getCoachSession(userId: string, sessionId: string): Promise<CoachSession | null> {
    const found = this.data().coachSessions.find((s) => s.id === sessionId && s.userId === userId);
    return found ? this.clone(found) : null;
  }

  async createCoachSession(userId: string, input: NewCoachSession): Promise<CoachSession> {
    const now = this.stamp();
    const session: CoachSession = { ...input, id: newId(), userId, createdAt: now, updatedAt: now };
    this.data().coachSessions.push(session);
    return this.clone(session);
  }

  async deleteCoachSession(userId: string, sessionId: string): Promise<void> {
    const data = this.data();
    const index = data.coachSessions.findIndex((s) => s.id === sessionId && s.userId === userId);
    if (index === -1) throw notFound('That conversation');
    data.coachSessions.splice(index, 1);
    data.coachMessages = data.coachMessages.filter((m) => m.sessionId !== sessionId);
  }

  async listCoachMessages(userId: string, sessionId: string): Promise<CoachMessage[]> {
    const rows = this.data().coachMessages.filter(
      (m) => m.userId === userId && m.sessionId === sessionId,
    );
    return this.clone(rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
  }

  async createCoachMessage(userId: string, input: NewCoachMessage): Promise<CoachMessage> {
    const data = this.data();
    const session = data.coachSessions.find((s) => s.id === input.sessionId && s.userId === userId);
    if (!session) throw notFound('That conversation');

    const message: CoachMessage = { ...input, id: newId(), userId, createdAt: this.stamp() };
    data.coachMessages.push(message);
    session.updatedAt = this.stamp();
    return this.clone(message);
  }

  // --- Whole account --------------------------------------------------------

  async exportUserData(userId: string): Promise<UserDataBundle> {
    const data = this.data();
    return this.clone({
      profile: data.profile && data.profile.userId === userId ? data.profile : null,
      colleges: this.owned(data.colleges, userId),
      applications: this.owned(data.applications, userId),
      requirements: this.owned(data.requirements, userId),
      essays: this.owned(data.essays, userId),
      essayVersions: this.owned(data.essayVersions, userId),
      activities: sortBySortOrder(this.owned(data.activities, userId)),
      recommenders: this.owned(data.recommenders, userId),
      applicationRecommenders: this.owned(data.applicationRecommenders, userId),
      scholarships: this.owned(data.scholarships, userId),
      tasks: this.owned(data.tasks, userId),
      coachSessions: this.owned(data.coachSessions, userId),
      coachMessages: this.owned(data.coachMessages, userId),
    });
  }

  async deleteAllUserData(): Promise<void> {
    clearWorkspace(this.workspaceId);
  }

  async resetDemoData(): Promise<void> {
    resetWorkspace(this.workspaceId);
  }
}
