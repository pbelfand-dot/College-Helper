import { describe, expect, it } from 'vitest';
import { buildMonthGrid, dayKeyFor, monthHasItems } from '@/lib/domain/calendar';
import type { DeadlineItem } from '@/lib/domain/deadlines';

function item(id: string, dueAt: string, timeZone = 'America/New_York'): DeadlineItem {
  return {
    id,
    kind: 'task',
    title: `Item ${id}`,
    subtitle: null,
    dueAt,
    timeZone,
    href: '/calendar',
    done: false,
    allDay: true,
  };
}

describe('dayKeyFor', () => {
  it('resolves an instant to the calendar day in the given zone', () => {
    // 03:59 UTC on Nov 1 is still Oct 31 in New York.
    expect(dayKeyFor('2026-11-01T03:59:00.000Z', 'America/New_York')).toBe('2026-10-31');
    expect(dayKeyFor('2026-11-01T03:59:00.000Z', 'UTC')).toBe('2026-11-01');
  });
});

describe('buildMonthGrid', () => {
  const month = new Date('2026-10-15T12:00:00.000Z');
  const now = new Date('2026-10-15T12:00:00.000Z');

  it('starts each week on Sunday and covers the whole month', () => {
    const weeks = buildMonthGrid({ month, items: [], timeZone: 'UTC', now });

    expect(weeks.length).toBeGreaterThanOrEqual(5);
    expect(weeks[0].days).toHaveLength(7);
    expect(weeks[0].days[0].date.getDay()).toBe(0);

    const inMonth = weeks.flatMap((week) => week.days).filter((day) => day.inMonth);
    expect(inMonth).toHaveLength(31);
  });

  it('places an item on the day it falls in the viewing zone', () => {
    const weeks = buildMonthGrid({
      month,
      items: [item('a', '2026-10-20T23:59:00.000Z', 'UTC')],
      timeZone: 'UTC',
      now,
    });

    const day = weeks.flatMap((week) => week.days).find((entry) => entry.key === '2026-10-20');
    expect(day?.items.map((entry) => entry.id)).toEqual(['a']);
  });

  it('groups several items on the same day and sorts them by time', () => {
    const weeks = buildMonthGrid({
      month,
      items: [
        item('late', '2026-10-20T22:00:00.000Z', 'UTC'),
        item('early', '2026-10-20T08:00:00.000Z', 'UTC'),
      ],
      timeZone: 'UTC',
      now,
    });

    const day = weeks.flatMap((week) => week.days).find((entry) => entry.key === '2026-10-20');
    expect(day?.items.map((entry) => entry.id)).toEqual(['early', 'late']);
  });

  it('marks today', () => {
    const weeks = buildMonthGrid({ month, items: [], timeZone: 'UTC', now });
    const today = weeks.flatMap((week) => week.days).filter((day) => day.isToday);
    expect(today).toHaveLength(1);
    expect(today[0].key).toBe('2026-10-15');
  });

  it('drops a trailing week that contains no days of the month', () => {
    const weeks = buildMonthGrid({
      month: new Date('2026-02-10T12:00:00.000Z'),
      items: [],
      timeZone: 'UTC',
      now,
    });
    const lastWeek = weeks[weeks.length - 1];
    expect(lastWeek.days.some((day) => day.inMonth)).toBe(true);
  });
});

describe('monthHasItems', () => {
  const month = new Date('2026-10-15T12:00:00.000Z');

  it('is false for an empty month', () => {
    expect(monthHasItems(buildMonthGrid({ month, items: [], timeZone: 'UTC' }))).toBe(false);
  });

  it('ignores items that only fall in the leading or trailing days', () => {
    const weeks = buildMonthGrid({
      month,
      items: [item('a', '2026-09-29T12:00:00.000Z', 'UTC')],
      timeZone: 'UTC',
    });
    expect(monthHasItems(weeks)).toBe(false);
  });

  it('is true when an item falls inside the month', () => {
    const weeks = buildMonthGrid({
      month,
      items: [item('a', '2026-10-09T12:00:00.000Z', 'UTC')],
      timeZone: 'UTC',
    });
    expect(monthHasItems(weeks)).toBe(true);
  });
});
