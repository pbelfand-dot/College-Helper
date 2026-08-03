/**
 * Date formatting for ApplyPilot.
 *
 * Rules that apply everywhere in the product:
 *  - deadlines always show their year;
 *  - deadlines always show the time zone they belong to;
 *  - nothing is described as "in 3 days!!" in a way designed to create panic.
 */

import { format, formatDistanceStrict, isValid, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

export const DEFAULT_TIME_ZONE = 'America/New_York';

export function parseIso(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

/** Returns the browser/server time zone, falling back to a stable default. */
export function resolveTimeZone(preferred?: string | null): string {
  if (preferred && isValidTimeZone(preferred)) return preferred;
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected && isValidTimeZone(detected)) return detected;
  } catch {
    // Intl is always present in supported runtimes; fall through to the default.
  }
  return DEFAULT_TIME_ZONE;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Short zone abbreviation such as "EST" or "GMT+2". */
export function timeZoneAbbreviation(date: Date, timeZone: string): string {
  try {
    return formatInTimeZone(date, timeZone, 'zzz');
  } catch {
    return timeZone;
  }
}

/** "Nov 1, 2025" — always includes the year. */
export function formatDate(value: string | Date | null | undefined, timeZone: string): string {
  const date = value instanceof Date ? value : parseIso(value ?? null);
  if (!date) return '—';
  try {
    return formatInTimeZone(date, timeZone, 'MMM d, yyyy');
  } catch {
    return format(date, 'MMM d, yyyy');
  }
}

/** "Nov 1, 2025 at 11:59 PM EST" — year and zone are never dropped. */
export function formatDeadline(value: string | Date | null | undefined, timeZone: string): string {
  const date = value instanceof Date ? value : parseIso(value ?? null);
  if (!date) return 'No deadline set';
  try {
    return formatInTimeZone(date, timeZone, "MMM d, yyyy 'at' h:mm a zzz");
  } catch {
    return format(date, "MMM d, yyyy 'at' h:mm a");
  }
}

/** Date only, but still zone-qualified: "Nov 1, 2025 (EST)". */
export function formatAllDayDeadline(
  value: string | Date | null | undefined,
  timeZone: string,
): string {
  const date = value instanceof Date ? value : parseIso(value ?? null);
  if (!date) return 'No deadline set';
  try {
    return formatInTimeZone(date, timeZone, 'MMM d, yyyy (zzz)');
  } catch {
    return format(date, 'MMM d, yyyy');
  }
}

/**
 * Calm relative phrasing. Deliberately plain: "in 6 days", "3 days ago".
 * No exclamation marks, no countdown timers.
 */
export function formatRelative(
  value: string | Date | null | undefined,
  now: Date = new Date(),
): string {
  const date = value instanceof Date ? value : parseIso(value ?? null);
  if (!date) return '';
  const distance = formatDistanceStrict(date, now, { addSuffix: true });
  return distance;
}

/** For `<input type="datetime-local">`, which expects local wall time. */
export function toDateTimeLocalValue(value: string | null | undefined, timeZone: string): string {
  const date = parseIso(value ?? null);
  if (!date) return '';
  try {
    return formatInTimeZone(date, timeZone, "yyyy-MM-dd'T'HH:mm");
  } catch {
    return format(date, "yyyy-MM-dd'T'HH:mm");
  }
}

/** For `<input type="date">`. */
export function toDateInputValue(value: string | null | undefined, timeZone: string): string {
  const date = parseIso(value ?? null);
  if (!date) return '';
  try {
    return formatInTimeZone(date, timeZone, 'yyyy-MM-dd');
  } catch {
    return format(date, 'yyyy-MM-dd');
  }
}
