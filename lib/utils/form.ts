import { z } from 'zod';
import { RepositoryError } from '@/lib/data/repository';
import { type ActionResult, fail } from './result';

/**
 * Shared plumbing for server actions.
 *
 * Two things every action needs and should not re-implement: turning a
 * `FormData` into a plain object, and converting a thrown repository error into
 * a user-facing message that leaks nothing about the storage layer.
 */

/** Reads a FormData into a plain object. Repeated keys become arrays. */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue; // ApplyPilot does not accept uploads.
    if (key in result) {
      const existing = result[key];
      result[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function validationFailure<T>(error: z.ZodError): ActionResult<T> {
  return fail('Please check the highlighted fields.', z.flattenError(error).fieldErrors);
}

/**
 * Maps a repository error to safe copy. Anything unrecognised becomes a generic
 * message — internal details never reach the browser.
 */
export function repositoryFailure<T>(error: unknown, fallback: string): ActionResult<T> {
  if (error instanceof RepositoryError) {
    switch (error.code) {
      case 'not-found':
        return fail(error.message);
      case 'invalid':
        return fail(error.message);
      case 'conflict':
        return fail('That change conflicts with something else. Reload and try again.');
      default:
        return fail('We could not reach your saved data. Please try again.');
    }
  }
  return fail(fallback);
}

/** `""` from a select means "not set". */
export function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (value === null) return null;
  const text = String(value).trim();
  return text.length === 0 ? null : text;
}

/**
 * Converts a `datetime-local` or `date` value plus a time zone into an ISO
 * instant. Returns null for empty input.
 *
 * Date-only values are pinned to 23:59 local time, which is what a student
 * means by "the deadline is the 1st".
 */
export function toIsoInstant(
  value: FormDataEntryValue | null,
  timeZone: string,
  endOfDayForDateOnly = true,
): string | null {
  const raw = emptyToNull(value);
  if (!raw) return null;

  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  const local = dateOnly && endOfDayForDateOnly ? `${raw}T23:59` : raw;

  const parsed = zonedWallTimeToInstant(local, timeZone);
  return parsed ? parsed.toISOString() : null;
}

/**
 * Interprets `YYYY-MM-DDTHH:mm` as wall time in `timeZone` and returns the
 * matching instant. Works by measuring the zone's offset at that moment and
 * correcting for it.
 */
function zonedWallTimeToInstant(local: string, timeZone: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!match) {
    const fallback = new Date(local);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  const [, year, month, day, hour, minute] = match.map(Number) as unknown as number[];
  // Start by assuming the wall time is UTC, then subtract the zone's offset.
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  const offset = timeZoneOffsetMs(new Date(utcGuess), timeZone);
  return new Date(utcGuess - offset);
}

/** Milliseconds that `timeZone` is ahead of UTC at the given instant. */
function timeZoneOffsetMs(at: Date, timeZone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = Object.fromEntries(
      formatter.formatToParts(at).map((part) => [part.type, part.value]),
    );
    const asUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour === '24' ? '0' : parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    return asUtc - at.getTime();
  } catch {
    return 0;
  }
}
