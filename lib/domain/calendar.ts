/**
 * Month-grid construction.
 *
 * Pure so the grid is testable without rendering: given a month, a time zone
 * and a list of deadlines, produce the weeks to draw and which items fall on
 * each day.
 */

import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import type { DeadlineItem } from './deadlines';

export interface CalendarDay {
  /** `YYYY-MM-DD` in the viewing time zone. */
  key: string;
  date: Date;
  dayOfMonth: number;
  inMonth: boolean;
  isToday: boolean;
  items: DeadlineItem[];
}

export interface CalendarWeek {
  key: string;
  days: CalendarDay[];
}

/** The calendar day a deadline lands on, as seen from `timeZone`. */
export function dayKeyFor(isoDate: string, timeZone: string): string {
  try {
    return formatInTimeZone(new Date(isoDate), timeZone, 'yyyy-MM-dd');
  } catch {
    return isoDate.slice(0, 10);
  }
}

function localDayKey(date: Date, timeZone: string): string {
  try {
    return formatInTimeZone(date, timeZone, 'yyyy-MM-dd');
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Builds a six-week grid starting on Sunday.
 *
 * Items are grouped by the day they fall on **in the viewer's time zone**, so a
 * deadline at 11:59pm Eastern shows on the Eastern date even for a student in
 * California.
 */
export function buildMonthGrid({
  month,
  items,
  timeZone,
  now = new Date(),
}: {
  month: Date;
  items: DeadlineItem[];
  timeZone: string;
  now?: Date;
}): CalendarWeek[] {
  const byDay = new Map<string, DeadlineItem[]>();
  for (const item of items) {
    const key = dayKeyFor(item.dueAt, timeZone);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(item);
    else byDay.set(key, [item]);
  }
  for (const bucket of byDay.values()) {
    bucket.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  }

  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: addDays(gridStart, 41) });
  const todayKey = localDayKey(now, timeZone);

  const weeks: CalendarWeek[] = [];
  for (let index = 0; index < days.length; index += 7) {
    const slice = days.slice(index, index + 7);
    weeks.push({
      key: localDayKey(slice[0], timeZone),
      days: slice.map((date) => {
        const key = localDayKey(date, timeZone);
        return {
          key,
          date,
          dayOfMonth: date.getDate(),
          inMonth: isSameMonth(date, month),
          isToday: key === todayKey,
          items: byDay.get(key) ?? [],
        };
      }),
    });
  }

  // Drop every trailing row that contains no day of this month. A 28-day
  // February starting on a Sunday leaves two such rows, not one.
  while (weeks.length > 0 && weeks[weeks.length - 1].days.every((day) => !day.inMonth)) {
    weeks.pop();
  }

  return weeks;
}

/** Whether the month has any items at all, for the empty state. */
export function monthHasItems(weeks: CalendarWeek[]): boolean {
  return weeks.some((week) => week.days.some((day) => day.inMonth && day.items.length > 0));
}

export function monthBounds(month: Date): { start: Date; end: Date } {
  return { start: startOfMonth(month), end: endOfMonth(month) };
}
