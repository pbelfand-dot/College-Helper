/**
 * Transparent checklist maths.
 *
 * ApplyPilot deliberately has no proprietary "readiness score". Every number
 * the product shows is `completed required items / total required items` and is
 * labelled as checklist completion, so a student can always reconstruct it by
 * counting rows on the screen.
 */

import type { Application, Essay, Requirement } from './types';

export interface ChecklistCompletion {
  /** Required items marked complete. */
  completed: number;
  /** Required items in total. Items marked "not needed" are excluded. */
  total: number;
  /** 0-100, rounded. `null` when there is nothing to count. */
  percent: number | null;
  /** Required items that are not complete yet. */
  remaining: number;
}

const EMPTY: ChecklistCompletion = { completed: 0, total: 0, percent: null, remaining: 0 };

/**
 * Counts only requirements the student marked as required. "Not needed" items
 * drop out of both numerator and denominator so opting out of an optional
 * requirement never makes progress look worse.
 */
export function calculateChecklistCompletion(requirements: Requirement[]): ChecklistCompletion {
  const counted = requirements.filter((r) => r.required && r.status !== 'not-needed');
  if (counted.length === 0) return EMPTY;

  const completed = counted.filter((r) => r.status === 'complete').length;
  return {
    completed,
    total: counted.length,
    percent: Math.round((completed / counted.length) * 100),
    remaining: counted.length - completed,
  };
}

/** Requirements that still need work, in display order. */
export function missingRequirements(requirements: Requirement[]): Requirement[] {
  return requirements
    .filter((r) => r.required && r.status !== 'complete' && r.status !== 'not-needed')
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export interface ApplicationProgress {
  application: Application;
  completion: ChecklistCompletion;
  missing: Requirement[];
}

/** Groups requirements by application and computes each application's checklist. */
export function summarizeApplications(
  applications: Application[],
  requirements: Requirement[],
): ApplicationProgress[] {
  const byApplication = new Map<string, Requirement[]>();
  for (const requirement of requirements) {
    const bucket = byApplication.get(requirement.applicationId);
    if (bucket) bucket.push(requirement);
    else byApplication.set(requirement.applicationId, [requirement]);
  }

  return applications.map((application) => {
    const owned = byApplication.get(application.id) ?? [];
    return {
      application,
      completion: calculateChecklistCompletion(owned),
      missing: missingRequirements(owned),
    };
  });
}

export interface EssayProgressSummary {
  total: number;
  notStarted: number;
  inProgress: number;
  finished: number;
  /** 0-100, rounded. `null` when the student has no essays yet. */
  percentFinished: number | null;
}

export function summarizeEssayProgress(essays: Essay[]): EssayProgressSummary {
  if (essays.length === 0) {
    return { total: 0, notStarted: 0, inProgress: 0, finished: 0, percentFinished: null };
  }

  let notStarted = 0;
  let finished = 0;
  for (const essay of essays) {
    if (essay.status === 'final') finished += 1;
    else if (essay.status === 'not-started') notStarted += 1;
  }

  return {
    total: essays.length,
    notStarted,
    inProgress: essays.length - notStarted - finished,
    finished,
    percentFinished: Math.round((finished / essays.length) * 100),
  };
}
