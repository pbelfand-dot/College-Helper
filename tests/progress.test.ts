import { describe, expect, it } from 'vitest';
import {
  calculateChecklistCompletion,
  missingRequirements,
  summarizeApplications,
  summarizeEssayProgress,
} from '@/lib/domain/progress';
import type { Application, Essay, Requirement } from '@/lib/domain/types';

function requirement(overrides: Partial<Requirement> = {}): Requirement {
  return {
    id: overrides.id ?? 'r1',
    userId: 'u1',
    applicationId: overrides.applicationId ?? 'a1',
    type: 'other',
    title: overrides.title ?? 'Item',
    description: null,
    required: overrides.required ?? true,
    status: overrides.status ?? 'not-started',
    dueAt: null,
    sourceUrl: null,
    sortOrder: overrides.sortOrder ?? 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('calculateChecklistCompletion', () => {
  it('returns a null percent when there is nothing to count', () => {
    const result = calculateChecklistCompletion([]);
    expect(result).toEqual({ completed: 0, total: 0, percent: null, remaining: 0 });
  });

  it('counts completed required items over total required items', () => {
    const result = calculateChecklistCompletion([
      requirement({ id: 'r1', status: 'complete' }),
      requirement({ id: 'r2', status: 'in-progress' }),
      requirement({ id: 'r3', status: 'not-started' }),
      requirement({ id: 'r4', status: 'complete' }),
    ]);

    expect(result.completed).toBe(2);
    expect(result.total).toBe(4);
    expect(result.percent).toBe(50);
    expect(result.remaining).toBe(2);
  });

  it('excludes optional items from both sides of the fraction', () => {
    const result = calculateChecklistCompletion([
      requirement({ id: 'r1', status: 'complete' }),
      requirement({ id: 'r2', status: 'not-started', required: false }),
    ]);

    expect(result.total).toBe(1);
    expect(result.percent).toBe(100);
  });

  it('excludes "not needed" items so opting out never lowers progress', () => {
    const before = calculateChecklistCompletion([
      requirement({ id: 'r1', status: 'complete' }),
      requirement({ id: 'r2', status: 'not-started' }),
    ]);
    const after = calculateChecklistCompletion([
      requirement({ id: 'r1', status: 'complete' }),
      requirement({ id: 'r2', status: 'not-needed' }),
    ]);

    expect(before.percent).toBe(50);
    expect(after.percent).toBe(100);
    expect(after.total).toBe(1);
  });

  it('returns null rather than 0 when every item is excluded', () => {
    const result = calculateChecklistCompletion([
      requirement({ id: 'r1', status: 'not-needed' }),
      requirement({ id: 'r2', required: false }),
    ]);
    expect(result.percent).toBeNull();
  });

  it('rounds to a whole percent', () => {
    const result = calculateChecklistCompletion([
      requirement({ id: 'r1', status: 'complete' }),
      requirement({ id: 'r2' }),
      requirement({ id: 'r3' }),
    ]);
    expect(result.percent).toBe(33);
  });
});

describe('missingRequirements', () => {
  it('lists only incomplete required items, in display order', () => {
    const missing = missingRequirements([
      requirement({ id: 'r1', status: 'complete', sortOrder: 0 }),
      requirement({ id: 'r2', status: 'not-started', sortOrder: 2 }),
      requirement({ id: 'r3', status: 'in-progress', sortOrder: 1 }),
      requirement({ id: 'r4', status: 'not-needed', sortOrder: 3 }),
      requirement({ id: 'r5', required: false, sortOrder: 4 }),
    ]);

    expect(missing.map((item) => item.id)).toEqual(['r3', 'r2']);
  });
});

describe('summarizeApplications', () => {
  function application(id: string): Application {
    return {
      id,
      userId: 'u1',
      collegeId: 'c1',
      applicationRound: 'regular-decision',
      deadlineAt: null,
      deadlineTimeZone: 'America/New_York',
      status: 'planning',
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
  }

  it('attributes requirements to the right application', () => {
    const result = summarizeApplications(
      [application('a1'), application('a2')],
      [
        requirement({ id: 'r1', applicationId: 'a1', status: 'complete' }),
        requirement({ id: 'r2', applicationId: 'a1' }),
        requirement({ id: 'r3', applicationId: 'a2', status: 'complete' }),
      ],
    );

    expect(result[0].completion.percent).toBe(50);
    expect(result[1].completion.percent).toBe(100);
  });

  it('gives an application with no requirements a null percent, not zero', () => {
    const result = summarizeApplications([application('a1')], []);
    expect(result[0].completion.percent).toBeNull();
    expect(result[0].missing).toEqual([]);
  });
});

describe('summarizeEssayProgress', () => {
  function essay(status: Essay['status']): Essay {
    return {
      id: Math.random().toString(),
      userId: 'u1',
      applicationId: null,
      collegeId: null,
      title: 'Essay',
      prompt: null,
      limitType: 'words',
      limitValue: 650,
      brainstormNotes: null,
      outline: null,
      currentDraft: '',
      status,
      dueAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
  }

  it('reports null progress when there are no essays', () => {
    expect(summarizeEssayProgress([]).percentFinished).toBeNull();
  });

  it('buckets essays by stage', () => {
    const result = summarizeEssayProgress([
      essay('not-started'),
      essay('drafting'),
      essay('revising'),
      essay('final'),
    ]);

    expect(result.total).toBe(4);
    expect(result.notStarted).toBe(1);
    expect(result.inProgress).toBe(2);
    expect(result.finished).toBe(1);
    expect(result.percentFinished).toBe(25);
  });
});
