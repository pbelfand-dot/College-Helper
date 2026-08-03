/**
 * Dashboard insight calculations.
 *
 * Every number here is a count of things the student can see and verify. There
 * is no weighting, no composite index, and nothing that resembles an admissions
 * prediction.
 */

import { differenceInCalendarDays } from 'date-fns';
import { parseIso } from '@/lib/dates/format';
import {
  type DeadlineItem,
  collectDeadlines,
  groupDeadlines,
} from './deadlines';
import { summarizeApplications, summarizeEssayProgress, type ApplicationProgress } from './progress';
import type {
  Activity,
  Application,
  College,
  Essay,
  Recommender,
  Requirement,
  Scholarship,
  Task,
  UserProfile,
} from './types';

export interface DashboardInput {
  profile: UserProfile;
  colleges: College[];
  applications: Application[];
  requirements: Requirement[];
  essays: Essay[];
  activities: Activity[];
  recommenders: Recommender[];
  scholarships: Scholarship[];
  tasks: Task[];
  now?: Date;
}

export interface DashboardSummary {
  deadlines: {
    all: DeadlineItem[];
    overdue: DeadlineItem[];
    next7: DeadlineItem[];
    next14: DeadlineItem[];
    next30: DeadlineItem[];
  };
  /** Applications with at least one incomplete required item, most urgent first. */
  needsAttention: ApplicationProgress[];
  essayProgress: ReturnType<typeof summarizeEssayProgress>;
  /** Essays with a deadline inside two weeks that are not finished. */
  essaysDueSoon: Essay[];
  activities: {
    total: number;
    /** Activities with no description written yet. */
    missingDescription: number;
    /** Activities whose description is over its configured limit. */
    overLimit: number;
  };
  recommendationFollowUps: Recommender[];
  scholarshipsNeedingAction: Scholarship[];
  /** Colleges in the list with no research notes, or not verified in 30+ days. */
  staleResearch: College[];
  openTaskCount: number;
}

const DAY = 1;

export function buildDashboardSummary(input: DashboardInput): DashboardSummary {
  const now = input.now ?? new Date();
  const timeZone = input.profile.timeZone;

  const allDeadlines = collectDeadlines({
    applications: input.applications,
    colleges: input.colleges,
    essays: input.essays,
    recommenders: input.recommenders,
    scholarships: input.scholarships,
    tasks: input.tasks,
    fallbackTimeZone: timeZone,
  });
  const grouped = groupDeadlines(allDeadlines, now);

  const progress = summarizeApplications(input.applications, input.requirements);
  const needsAttention = progress
    .filter(
      (entry) =>
        entry.missing.length > 0 &&
        entry.application.status !== 'submitted' &&
        entry.application.status !== 'decision-received' &&
        entry.application.status !== 'withdrawn',
    )
    .sort((a, b) => {
      // Soonest deadline first; applications without one go last.
      const left = a.application.deadlineAt ?? '9999';
      const right = b.application.deadlineAt ?? '9999';
      return left.localeCompare(right);
    });

  const essaysDueSoon = input.essays
    .filter((essay) => {
      if (essay.status === 'final' || !essay.dueAt) return false;
      const due = parseIso(essay.dueAt);
      if (!due) return false;
      const days = differenceInCalendarDays(due, now);
      return days >= -365 && days <= 14;
    })
    .sort((a, b) => (a.dueAt ?? '').localeCompare(b.dueAt ?? ''));

  const recommendationFollowUps = input.recommenders
    .filter((recommender) => {
      if (recommender.status === 'submitted' || recommender.status === 'declined') return false;
      const followUp = parseIso(recommender.followUpAt);
      return followUp !== null && differenceInCalendarDays(followUp, now) <= DAY * 2;
    })
    .sort((a, b) => (a.followUpAt ?? '').localeCompare(b.followUpAt ?? ''));

  const scholarshipsNeedingAction = input.scholarships
    .filter(
      (scholarship) =>
        scholarship.status === 'researching' ||
        scholarship.status === 'planning-to-apply' ||
        scholarship.status === 'in-progress',
    )
    .sort((a, b) => (a.deadlineAt ?? '9999').localeCompare(b.deadlineAt ?? '9999'));

  const staleResearch = input.colleges.filter((college) => {
    if (college.listStatus === 'submitted' || college.listStatus === 'decision-received') {
      return false;
    }
    const hasNotes = Boolean(college.fitNotes || college.academicNotes || college.campusNotes);
    if (!hasNotes) return true;
    const verified = parseIso(college.lastVerifiedAt);
    return verified === null || differenceInCalendarDays(now, verified) >= 30;
  });

  return {
    deadlines: {
      all: allDeadlines,
      overdue: grouped.overdue,
      next7: grouped.next7,
      next14: grouped.next14,
      next30: grouped.next30,
    },
    needsAttention,
    essayProgress: summarizeEssayProgress(input.essays),
    essaysDueSoon,
    activities: {
      total: input.activities.length,
      missingDescription: input.activities.filter((a) => a.description.trim().length === 0).length,
      overLimit: input.activities.filter((a) => [...a.description].length > a.descriptionLimit).length,
    },
    recommendationFollowUps,
    scholarshipsNeedingAction,
    staleResearch,
    openTaskCount: input.tasks.filter((task) => task.completedAt === null).length,
  };
}
