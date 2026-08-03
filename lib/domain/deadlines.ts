/**
 * Deadline collection and grouping.
 *
 * Deadlines from applications, essays, recommenders, scholarships and custom
 * tasks are normalised into one `DeadlineItem` shape so the dashboard and the
 * calendar can share exactly the same logic.
 */

import { differenceInCalendarDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { parseIso } from '@/lib/dates/format';
import type {
  Application,
  College,
  Essay,
  Recommender,
  Scholarship,
  Task,
  UserDataBundle,
} from './types';

export type DeadlineKind = 'application' | 'essay' | 'recommendation' | 'scholarship' | 'task';

export interface DeadlineItem {
  id: string;
  kind: DeadlineKind;
  title: string;
  /** Extra context, e.g. the college name or the round. */
  subtitle: string | null;
  dueAt: string;
  timeZone: string;
  href: string;
  /** True once the underlying record is done — completed task, submitted app… */
  done: boolean;
  /** Deadlines that only carry a date, not a meaningful time of day. */
  allDay: boolean;
}

export type DeadlineBucket = 'overdue' | 'next7' | 'next14' | 'next30' | 'later';

export interface GroupedDeadlines {
  overdue: DeadlineItem[];
  next7: DeadlineItem[];
  next14: DeadlineItem[];
  next30: DeadlineItem[];
  later: DeadlineItem[];
}

/**
 * Days between now and the deadline, counted in calendar days *in the
 * deadline's own time zone*. A deadline at 11:59pm Eastern is "today" for a
 * student in California until it actually passes.
 */
export function daysUntil(dueAt: string, timeZone: string, now: Date = new Date()): number | null {
  const due = parseIso(dueAt);
  if (!due) return null;
  try {
    return differenceInCalendarDays(toZonedTime(due, timeZone), toZonedTime(now, timeZone));
  } catch {
    return differenceInCalendarDays(due, now);
  }
}

export function bucketFor(item: DeadlineItem, now: Date = new Date()): DeadlineBucket {
  const due = parseIso(item.dueAt);
  if (!due) return 'later';
  if (due.getTime() < now.getTime()) return 'overdue';

  const days = daysUntil(item.dueAt, item.timeZone, now) ?? 0;
  if (days <= 7) return 'next7';
  if (days <= 14) return 'next14';
  if (days <= 30) return 'next30';
  return 'later';
}

/** Buckets are exclusive: an item in `next7` is not repeated in `next14`. */
export function groupDeadlines(items: DeadlineItem[], now: Date = new Date()): GroupedDeadlines {
  const grouped: GroupedDeadlines = { overdue: [], next7: [], next14: [], next30: [], later: [] };
  for (const item of items) {
    if (item.done) continue;
    grouped[bucketFor(item, now)].push(item);
  }
  for (const key of Object.keys(grouped) as DeadlineBucket[]) {
    grouped[key].sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  }
  return grouped;
}

export function sortByDueDate(items: DeadlineItem[]): DeadlineItem[] {
  return [...items].sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

// --- Collection -------------------------------------------------------------

interface CollectInput {
  applications: Application[];
  colleges: College[];
  essays: Essay[];
  recommenders: Recommender[];
  scholarships: Scholarship[];
  tasks: Task[];
  fallbackTimeZone: string;
}

/** Turns every dated record the student owns into a single deadline list. */
export function collectDeadlines(input: CollectInput): DeadlineItem[] {
  const collegeNames = new Map(input.colleges.map((c) => [c.id, c.name]));
  const items: DeadlineItem[] = [];

  for (const application of input.applications) {
    if (!application.deadlineAt) continue;
    items.push({
      id: `application:${application.id}`,
      kind: 'application',
      title: collegeNames.get(application.collegeId) ?? 'Application',
      subtitle: 'Application deadline',
      dueAt: application.deadlineAt,
      timeZone: application.deadlineTimeZone || input.fallbackTimeZone,
      href: `/applications/${application.id}`,
      done: application.status === 'submitted' || application.status === 'decision-received',
      allDay: false,
    });
  }

  for (const essay of input.essays) {
    if (!essay.dueAt) continue;
    items.push({
      id: `essay:${essay.id}`,
      kind: 'essay',
      title: essay.title,
      subtitle: essay.collegeId ? (collegeNames.get(essay.collegeId) ?? 'Essay') : 'Essay',
      dueAt: essay.dueAt,
      timeZone: input.fallbackTimeZone,
      href: `/essays/${essay.id}`,
      done: essay.status === 'final',
      allDay: true,
    });
  }

  for (const recommender of input.recommenders) {
    if (!recommender.dueAt) continue;
    items.push({
      id: `recommender:${recommender.id}`,
      kind: 'recommendation',
      title: `Recommendation from ${recommender.name}`,
      subtitle: recommender.organizationOrSubject,
      dueAt: recommender.dueAt,
      timeZone: input.fallbackTimeZone,
      href: '/recommendations',
      done: recommender.status === 'submitted' || recommender.status === 'declined',
      allDay: true,
    });
  }

  for (const scholarship of input.scholarships) {
    if (!scholarship.deadlineAt) continue;
    items.push({
      id: `scholarship:${scholarship.id}`,
      kind: 'scholarship',
      title: scholarship.title,
      subtitle: scholarship.organization,
      dueAt: scholarship.deadlineAt,
      timeZone: scholarship.deadlineTimeZone || input.fallbackTimeZone,
      href: '/scholarships',
      done:
        scholarship.status === 'submitted' ||
        scholarship.status === 'awarded' ||
        scholarship.status === 'not-selected' ||
        scholarship.status === 'skipped',
      allDay: false,
    });
  }

  for (const task of input.tasks) {
    if (!task.dueAt) continue;
    items.push({
      id: `task:${task.id}`,
      kind: 'task',
      title: task.title,
      subtitle: task.description,
      dueAt: task.dueAt,
      timeZone: task.timeZone || input.fallbackTimeZone,
      href: '/calendar',
      done: task.completedAt !== null,
      allDay: true,
    });
  }

  return sortByDueDate(items);
}

export function collectDeadlinesFromBundle(
  bundle: UserDataBundle,
  fallbackTimeZone: string,
): DeadlineItem[] {
  return collectDeadlines({
    applications: bundle.applications,
    colleges: bundle.colleges,
    essays: bundle.essays,
    recommenders: bundle.recommenders,
    scholarships: bundle.scholarships,
    tasks: bundle.tasks,
    fallbackTimeZone,
  });
}

/** Dates carrying more deadlines than `threshold`, used by the planning coach. */
export function findCrowdedDates(
  items: DeadlineItem[],
  threshold = 3,
): { date: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (item.done) continue;
    const day = item.dueAt.slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= threshold)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
