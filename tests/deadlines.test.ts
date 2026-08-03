import { describe, expect, it } from 'vitest';
import {
  bucketFor,
  collectDeadlines,
  daysUntil,
  findCrowdedDates,
  groupDeadlines,
  type DeadlineItem,
} from '@/lib/domain/deadlines';
import type {
  Application,
  College,
  Essay,
  Recommender,
  Scholarship,
  Task,
} from '@/lib/domain/types';

const NOW = new Date('2026-10-01T12:00:00.000Z');

function item(overrides: Partial<DeadlineItem> = {}): DeadlineItem {
  return {
    id: overrides.id ?? 'x',
    kind: overrides.kind ?? 'task',
    title: overrides.title ?? 'Something',
    subtitle: null,
    dueAt: overrides.dueAt ?? '2026-10-05T23:59:00.000Z',
    timeZone: overrides.timeZone ?? 'America/New_York',
    href: '/calendar',
    done: overrides.done ?? false,
    allDay: true,
  };
}

describe('daysUntil', () => {
  it('counts calendar days in the deadline own time zone', () => {
    expect(daysUntil('2026-10-08T23:59:00.000Z', 'America/New_York', NOW)).toBe(7);
  });

  it('returns 0 for a deadline later the same local day', () => {
    expect(daysUntil('2026-10-01T20:00:00.000Z', 'America/New_York', NOW)).toBe(0);
  });

  it('returns a negative number for a date already past', () => {
    expect(daysUntil('2026-09-28T12:00:00.000Z', 'America/New_York', NOW)).toBe(-3);
  });

  it('respects the deadline zone rather than the viewer zone', () => {
    // 2026-10-02T02:00Z is still Oct 1 in New York but already Oct 2 in London.
    const instant = '2026-10-02T02:00:00.000Z';
    expect(daysUntil(instant, 'America/New_York', NOW)).toBe(0);
    expect(daysUntil(instant, 'Europe/London', NOW)).toBe(1);
  });

  it('returns null for an unreadable date', () => {
    expect(daysUntil('not-a-date', 'UTC', NOW)).toBeNull();
  });
});

describe('bucketFor', () => {
  it('places a past deadline in overdue', () => {
    expect(bucketFor(item({ dueAt: '2026-09-30T23:59:00.000Z' }), NOW)).toBe('overdue');
  });

  it('places deadlines into 7, 14 and 30 day buckets', () => {
    expect(bucketFor(item({ dueAt: '2026-10-05T23:59:00.000Z' }), NOW)).toBe('next7');
    expect(bucketFor(item({ dueAt: '2026-10-12T23:59:00.000Z' }), NOW)).toBe('next14');
    expect(bucketFor(item({ dueAt: '2026-10-25T23:59:00.000Z' }), NOW)).toBe('next30');
    expect(bucketFor(item({ dueAt: '2026-12-25T23:59:00.000Z' }), NOW)).toBe('later');
  });

  it('puts a deadline exactly seven days out in next7, not next14', () => {
    expect(bucketFor(item({ dueAt: '2026-10-08T23:59:00.000Z' }), NOW)).toBe('next7');
  });
});

describe('groupDeadlines', () => {
  it('keeps buckets exclusive and skips finished items', () => {
    const grouped = groupDeadlines(
      [
        item({ id: 'a', dueAt: '2026-09-20T23:59:00.000Z' }),
        item({ id: 'b', dueAt: '2026-10-03T23:59:00.000Z' }),
        item({ id: 'c', dueAt: '2026-10-11T23:59:00.000Z' }),
        item({ id: 'd', dueAt: '2026-10-20T23:59:00.000Z' }),
        item({ id: 'e', dueAt: '2026-10-04T23:59:00.000Z', done: true }),
      ],
      NOW,
    );

    expect(grouped.overdue.map((entry) => entry.id)).toEqual(['a']);
    expect(grouped.next7.map((entry) => entry.id)).toEqual(['b']);
    expect(grouped.next14.map((entry) => entry.id)).toEqual(['c']);
    expect(grouped.next30.map((entry) => entry.id)).toEqual(['d']);
  });

  it('sorts each bucket by date', () => {
    const grouped = groupDeadlines(
      [
        item({ id: 'later', dueAt: '2026-10-06T23:59:00.000Z' }),
        item({ id: 'sooner', dueAt: '2026-10-02T23:59:00.000Z' }),
      ],
      NOW,
    );
    expect(grouped.next7.map((entry) => entry.id)).toEqual(['sooner', 'later']);
  });
});

describe('collectDeadlines', () => {
  const college: College = {
    id: 'c1',
    userId: 'u1',
    name: 'Example College',
    city: null,
    stateOrRegion: null,
    country: null,
    institutionType: null,
    websiteUrl: null,
    admissionsUrl: null,
    financialAidUrl: null,
    majors: [],
    tags: [],
    listStatus: 'applying',
    fitNotes: null,
    academicNotes: null,
    campusNotes: null,
    costNotes: null,
    sourceNotes: null,
    lastVerifiedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const application: Application = {
    id: 'a1',
    userId: 'u1',
    collegeId: 'c1',
    applicationRound: 'early-action',
    deadlineAt: '2026-11-01T03:59:00.000Z',
    deadlineTimeZone: 'America/New_York',
    status: 'in-progress',
    submittedAt: null,
    decisionResult: 'pending',
    decisionAt: null,
    feeAmount: null,
    feeWaiverStatus: 'not-applicable',
    testingPlan: 'not-decided',
    transcriptStatus: 'not-started',
    notes: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const essay: Essay = {
    id: 'e1',
    userId: 'u1',
    applicationId: null,
    collegeId: 'c1',
    title: 'Personal statement',
    prompt: null,
    limitType: 'words',
    limitValue: 650,
    brainstormNotes: null,
    outline: null,
    currentDraft: '',
    status: 'drafting',
    dueAt: '2026-10-20T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const recommender: Recommender = {
    id: 'd1',
    userId: 'u1',
    name: 'Ms. Okafor',
    role: 'Teacher',
    organizationOrSubject: 'Science',
    email: null,
    dateRequested: null,
    dueAt: '2026-10-15T00:00:00.000Z',
    status: 'agreed',
    followUpAt: null,
    thankYouStatus: 'not-sent',
    notes: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const scholarship: Scholarship = {
    id: 's1',
    userId: 'u1',
    title: 'Example award',
    organization: null,
    sourceUrl: null,
    amount: null,
    deadlineAt: '2026-10-18T23:59:00.000Z',
    deadlineTimeZone: 'America/Chicago',
    status: 'in-progress',
    requirements: null,
    essayIds: [],
    lastVerifiedAt: null,
    notes: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const task: Task = {
    id: 'k1',
    userId: 'u1',
    applicationId: null,
    essayId: null,
    scholarshipId: null,
    recommenderId: null,
    title: 'Ask about the fee waiver',
    description: null,
    category: 'application',
    dueAt: '2026-10-04T00:00:00.000Z',
    timeZone: 'America/New_York',
    completedAt: null,
    priority: 'high',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const input = {
    applications: [application],
    colleges: [college],
    essays: [essay],
    recommenders: [recommender],
    scholarships: [scholarship],
    tasks: [task],
    fallbackTimeZone: 'America/New_York',
  };

  it('gathers every dated record into one sorted list', () => {
    const items = collectDeadlines(input);
    expect(items).toHaveLength(5);
    expect(items.map((entry) => entry.kind)).toEqual([
      'task',
      'recommendation',
      'scholarship',
      'essay',
      'application',
    ]);
  });

  it('labels an application with its college name', () => {
    const applicationItem = collectDeadlines(input).find((entry) => entry.kind === 'application');
    expect(applicationItem?.title).toBe('Example College');
  });

  it('keeps each record own time zone rather than flattening to one', () => {
    const items = collectDeadlines(input);
    expect(items.find((entry) => entry.kind === 'scholarship')?.timeZone).toBe('America/Chicago');
    expect(items.find((entry) => entry.kind === 'application')?.timeZone).toBe('America/New_York');
  });

  it('marks submitted applications and completed tasks as done', () => {
    const items = collectDeadlines({
      ...input,
      applications: [{ ...application, status: 'submitted' }],
      tasks: [{ ...task, completedAt: '2026-10-02T00:00:00.000Z' }],
    });
    expect(items.find((entry) => entry.kind === 'application')?.done).toBe(true);
    expect(items.find((entry) => entry.kind === 'task')?.done).toBe(true);
  });

  it('skips records with no date', () => {
    const items = collectDeadlines({
      ...input,
      applications: [{ ...application, deadlineAt: null }],
    });
    expect(items.some((entry) => entry.kind === 'application')).toBe(false);
  });
});

describe('findCrowdedDates', () => {
  it('reports days carrying at least the threshold number of deadlines', () => {
    const crowded = findCrowdedDates(
      [
        item({ id: '1', dueAt: '2026-11-01T23:59:00.000Z' }),
        item({ id: '2', dueAt: '2026-11-01T20:00:00.000Z' }),
        item({ id: '3', dueAt: '2026-11-01T10:00:00.000Z' }),
        item({ id: '4', dueAt: '2026-11-05T10:00:00.000Z' }),
      ],
      3,
    );
    expect(crowded).toEqual([{ date: '2026-11-01', count: 3 }]);
  });

  it('ignores finished items', () => {
    const crowded = findCrowdedDates(
      [
        item({ id: '1', dueAt: '2026-11-01T23:59:00.000Z', done: true }),
        item({ id: '2', dueAt: '2026-11-01T20:00:00.000Z' }),
      ],
      2,
    );
    expect(crowded).toEqual([]);
  });
});
