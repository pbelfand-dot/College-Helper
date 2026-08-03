import { beforeEach, describe, expect, it } from 'vitest';
import { DemoRepository } from '@/lib/data/demo/demo-repository';
import { deleteWorkspace, getWorkspace, resetWorkspace } from '@/lib/data/demo/store';
import { DEMO_USER_ID } from '@/lib/data/demo/seed';
import { RepositoryError } from '@/lib/data/repository';

/**
 * These tests are the ones that matter most.
 *
 * Every repository method takes `userId` first and must scope to it. If that
 * ever stops being true, a student could read another student's essays by
 * guessing a record id. The demo adapter is exercised here because it can run
 * without credentials; the Supabase adapter enforces the same rule twice, once
 * in the query and once in row-level security.
 */

const OTHER_USER = '00000000-0000-4000-8000-0000000000ff';

function newWorkspace(seeded = true): { repo: DemoRepository; id: string } {
  const id = `test-${Math.random().toString(36).slice(2)}`;
  resetWorkspace(id, seeded);
  return { repo: new DemoRepository(id), id };
}

describe('DemoRepository user scoping', () => {
  let repo: DemoRepository;
  let workspaceId: string;

  beforeEach(() => {
    const created = newWorkspace();
    repo = created.repo;
    workspaceId = created.id;
  });

  it('returns the seeded records for the owning user', async () => {
    const colleges = await repo.listColleges(DEMO_USER_ID);
    expect(colleges.length).toBeGreaterThan(0);
  });

  it('returns nothing at all to a different user id', async () => {
    expect(await repo.listColleges(OTHER_USER)).toEqual([]);
    expect(await repo.listApplications(OTHER_USER)).toEqual([]);
    expect(await repo.listEssays(OTHER_USER)).toEqual([]);
    expect(await repo.listActivities(OTHER_USER)).toEqual([]);
    expect(await repo.listRecommenders(OTHER_USER)).toEqual([]);
    expect(await repo.listScholarships(OTHER_USER)).toEqual([]);
    expect(await repo.listTasks(OTHER_USER)).toEqual([]);
    expect(await repo.getProfile(OTHER_USER)).toBeNull();
  });

  it('does not return a record to another user even when the id is known', async () => {
    const [college] = await repo.listColleges(DEMO_USER_ID);
    expect(await repo.getCollege(DEMO_USER_ID, college.id)).not.toBeNull();
    expect(await repo.getCollege(OTHER_USER, college.id)).toBeNull();
  });

  it('does not let another user update a record whose id they know', async () => {
    const [college] = await repo.listColleges(DEMO_USER_ID);
    await expect(repo.updateCollege(OTHER_USER, college.id, { name: 'Hijacked' })).rejects.toThrow(
      RepositoryError,
    );

    const unchanged = await repo.getCollege(DEMO_USER_ID, college.id);
    expect(unchanged?.name).not.toBe('Hijacked');
  });

  it('does not let another user delete a record whose id they know', async () => {
    const [essay] = await repo.listEssays(DEMO_USER_ID);
    await expect(repo.deleteEssay(OTHER_USER, essay.id)).rejects.toThrow(RepositoryError);
    expect(await repo.getEssay(DEMO_USER_ID, essay.id)).not.toBeNull();
  });

  it('refuses to attach a new application to another user college', async () => {
    const [college] = await repo.listColleges(DEMO_USER_ID);

    await expect(
      repo.createApplication(OTHER_USER, {
        collegeId: college.id,
        applicationRound: 'regular-decision',
        deadlineAt: null,
        deadlineTimeZone: 'UTC',
        status: 'planning',
        submittedAt: null,
        decisionResult: 'pending',
        decisionAt: null,
        feeAmount: null,
        feeWaiverStatus: 'not-applicable',
        testingPlan: 'not-decided',
        transcriptStatus: 'not-started',
        notes: null,
      }),
    ).rejects.toThrow(RepositoryError);
  });

  it('refuses to add a requirement to another user application', async () => {
    const [application] = await repo.listApplications(DEMO_USER_ID);

    await expect(
      repo.createRequirement(OTHER_USER, {
        applicationId: application.id,
        type: 'other',
        title: 'Injected',
        description: null,
        required: true,
        status: 'not-started',
        dueAt: null,
        sourceUrl: null,
      }),
    ).rejects.toThrow(RepositoryError);
  });

  it('refuses to version another user essay', async () => {
    const [essay] = await repo.listEssays(DEMO_USER_ID);

    await expect(
      repo.createEssayVersion(OTHER_USER, {
        essayId: essay.id,
        content: 'Injected',
        source: 'manual',
        note: null,
      }),
    ).rejects.toThrow(RepositoryError);
  });

  it('silently drops an essay id belonging to someone else when linking a scholarship', async () => {
    const [essay] = await repo.listEssays(DEMO_USER_ID);

    const scholarship = await repo.createScholarship(OTHER_USER, {
      title: 'Attempted link',
      organization: null,
      sourceUrl: null,
      amount: null,
      deadlineAt: null,
      deadlineTimeZone: 'UTC',
      status: 'researching',
      requirements: null,
      essayIds: [essay.id],
      lastVerifiedAt: null,
      notes: null,
    });

    expect(scholarship.essayIds).toEqual([]);
  });

  it('exports only the requesting user records', async () => {
    const mine = await repo.exportUserData(DEMO_USER_ID);
    expect(mine.colleges.length).toBeGreaterThan(0);
    expect(mine.colleges.every((college) => college.userId === DEMO_USER_ID)).toBe(true);

    const theirs = await repo.exportUserData(OTHER_USER);
    expect(theirs.profile).toBeNull();
    expect(theirs.colleges).toEqual([]);
    expect(theirs.essays).toEqual([]);
  });

  it('hands back clones, so a caller cannot mutate the store by reference', async () => {
    const [college] = await repo.listColleges(DEMO_USER_ID);
    college.name = 'Mutated in place';

    const refetched = await repo.getCollege(DEMO_USER_ID, college.id);
    expect(refetched?.name).not.toBe('Mutated in place');
    void workspaceId;
  });
});

describe('DemoRepository cascades', () => {
  it('removes an application checklist when the application is deleted', async () => {
    const { repo } = newWorkspace();
    const [application] = await repo.listApplications(DEMO_USER_ID);

    expect((await repo.listRequirements(DEMO_USER_ID, application.id)).length).toBeGreaterThan(0);
    await repo.deleteApplication(DEMO_USER_ID, application.id);
    expect(await repo.listRequirements(DEMO_USER_ID, application.id)).toEqual([]);
  });

  /**
   * Deleting a college must never destroy a student's writing. The essay is
   * unlinked, not removed.
   */
  it('keeps essays when their college is deleted, and unlinks them', async () => {
    const { repo } = newWorkspace();
    const essays = await repo.listEssays(DEMO_USER_ID);
    const linked = essays.find((essay) => essay.collegeId !== null);
    expect(linked).toBeDefined();

    const before = essays.length;
    await repo.deleteCollege(DEMO_USER_ID, linked!.collegeId as string);

    const after = await repo.listEssays(DEMO_USER_ID);
    expect(after).toHaveLength(before);

    const survivor = after.find((essay) => essay.id === linked!.id);
    expect(survivor).toBeDefined();
    expect(survivor?.collegeId).toBeNull();
    expect(survivor?.currentDraft).toBe(linked!.currentDraft);
  });

  it('deletes an essay together with its versions', async () => {
    const { repo } = newWorkspace();
    const [essay] = await repo.listEssays(DEMO_USER_ID);

    await repo.createEssayVersion(DEMO_USER_ID, {
      essayId: essay.id,
      content: 'A version',
      source: 'manual',
      note: null,
    });
    expect((await repo.listEssayVersions(DEMO_USER_ID, essay.id)).length).toBeGreaterThan(0);

    await repo.deleteEssay(DEMO_USER_ID, essay.id);
    expect(await repo.listEssayVersions(DEMO_USER_ID, essay.id)).toEqual([]);
  });

  it('renumbers activities contiguously after one is deleted', async () => {
    const { repo } = newWorkspace();
    const activities = await repo.listActivities(DEMO_USER_ID);
    await repo.deleteActivity(DEMO_USER_ID, activities[1].id);

    const remaining = await repo.listActivities(DEMO_USER_ID);
    expect(remaining.map((activity) => activity.sortOrder)).toEqual(
      remaining.map((_, index) => index),
    );
  });
});

describe('DemoRepository whole-account operations', () => {
  it('reset restores the seeded workspace', async () => {
    const { repo } = newWorkspace();
    const [college] = await repo.listColleges(DEMO_USER_ID);
    await repo.deleteCollege(DEMO_USER_ID, college.id);

    const afterDelete = await repo.listColleges(DEMO_USER_ID);
    await repo.resetDemoData(DEMO_USER_ID);
    const afterReset = await repo.listColleges(DEMO_USER_ID);

    expect(afterReset.length).toBeGreaterThan(afterDelete.length);
  });

  it('delete-all leaves nothing behind', async () => {
    const { repo } = newWorkspace();
    await repo.deleteAllUserData(DEMO_USER_ID);

    const bundle = await repo.exportUserData(DEMO_USER_ID);
    expect(bundle.profile).toBeNull();
    expect(bundle.colleges).toEqual([]);
    expect(bundle.essays).toEqual([]);
    expect(bundle.essayVersions).toEqual([]);
    expect(bundle.tasks).toEqual([]);
  });

  it('gives each workspace its own isolated data', async () => {
    const first = newWorkspace();
    const second = newWorkspace();

    const [college] = await first.repo.listColleges(DEMO_USER_ID);
    await first.repo.updateCollege(DEMO_USER_ID, college.id, { name: 'Renamed in first' });

    const secondColleges = await second.repo.listColleges(DEMO_USER_ID);
    expect(secondColleges.some((entry) => entry.name === 'Renamed in first')).toBe(false);

    deleteWorkspace(first.id);
    deleteWorkspace(second.id);
  });

  it('seeds a workspace on first access', () => {
    const id = `lazy-${Math.random()}`;
    const bundle = getWorkspace(id);
    expect(bundle.colleges.length).toBeGreaterThan(0);
    deleteWorkspace(id);
  });

  it('can start from an empty workspace', async () => {
    const id = `empty-${Math.random()}`;
    resetWorkspace(id, false);
    const repo = new DemoRepository(id);

    expect(await repo.listColleges(DEMO_USER_ID)).toEqual([]);
    expect(await repo.getProfile(DEMO_USER_ID)).toBeNull();
    deleteWorkspace(id);
  });
});

describe('seeded demo data', () => {
  it('meets the quantities the demo screens need', async () => {
    const { repo } = newWorkspace();

    expect((await repo.listColleges(DEMO_USER_ID)).length).toBeGreaterThanOrEqual(6);
    expect((await repo.listApplications(DEMO_USER_ID)).length).toBeGreaterThanOrEqual(5);
    expect((await repo.listRequirements(DEMO_USER_ID)).length).toBeGreaterThanOrEqual(8);
    expect((await repo.listEssays(DEMO_USER_ID)).length).toBeGreaterThanOrEqual(3);
    expect((await repo.listActivities(DEMO_USER_ID)).length).toBeGreaterThanOrEqual(6);
    expect((await repo.listRecommenders(DEMO_USER_ID)).length).toBeGreaterThanOrEqual(3);
    expect((await repo.listScholarships(DEMO_USER_ID)).length).toBeGreaterThanOrEqual(4);
    expect((await repo.listTasks(DEMO_USER_ID)).length).toBeGreaterThanOrEqual(10);
  });

  it('uses more than one application round', async () => {
    const { repo } = newWorkspace();
    const rounds = new Set(
      (await repo.listApplications(DEMO_USER_ID)).map((entry) => entry.applicationRound),
    );
    expect(rounds.size).toBeGreaterThanOrEqual(3);
  });

  it('has essays at different stages', async () => {
    const { repo } = newWorkspace();
    const statuses = new Set((await repo.listEssays(DEMO_USER_ID)).map((entry) => entry.status));
    expect(statuses.size).toBeGreaterThanOrEqual(3);
  });

  /**
   * Every seeded record that describes something external has to be marked as
   * sample data, so the demo can never be mistaken for current admissions
   * information.
   */
  it('marks every seeded college and application as unverified sample data', async () => {
    const { repo } = newWorkspace();

    for (const college of await repo.listColleges(DEMO_USER_ID)) {
      expect(college.sourceNotes ?? '').toMatch(/sample data|verify/i);
    }
    for (const application of await repo.listApplications(DEMO_USER_ID)) {
      expect(application.notes ?? '').toMatch(/sample data|verify/i);
    }
    for (const scholarship of await repo.listScholarships(DEMO_USER_ID)) {
      expect(scholarship.notes ?? '').toMatch(/sample data|verify/i);
    }
  });

  it('generates unique ids for every seeded record', async () => {
    const { repo } = newWorkspace();
    const bundle = await repo.exportUserData(DEMO_USER_ID);

    const ids = [
      ...bundle.colleges,
      ...bundle.applications,
      ...bundle.requirements,
      ...bundle.essays,
      ...bundle.activities,
      ...bundle.recommenders,
      ...bundle.scholarships,
      ...bundle.tasks,
    ].map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
