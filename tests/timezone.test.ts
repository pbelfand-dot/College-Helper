import { describe, expect, it } from 'vitest';
import { toIsoInstant } from '@/lib/utils/form';
import { formatDeadline, toDateTimeLocalValue } from '@/lib/dates/format';

/**
 * Deadline conversion has to survive daylight saving.
 *
 * `toIsoInstant` interprets a wall-clock string as local time in a chosen zone
 * by measuring that zone's UTC offset. The risky case is a date on the other
 * side of a DST transition from "now", where a naive implementation is off by
 * an hour — enough to move an 11:59pm deadline into the next day.
 */

function entry(value: string): FormDataEntryValue {
  return value;
}

describe('toIsoInstant', () => {
  it('returns null for an empty value', () => {
    expect(toIsoInstant(entry(''), 'America/New_York')).toBeNull();
    expect(toIsoInstant(null, 'America/New_York')).toBeNull();
  });

  it('pins a date-only value to 23:59 local time', () => {
    const iso = toIsoInstant(entry('2026-11-15'), 'America/New_York');
    // 15 Nov is EST (UTC-5), so 23:59 local is 04:59Z the next day.
    expect(iso).toBe('2026-11-16T04:59:00.000Z');
  });

  it('handles a summer date in the same zone (EDT, UTC-4)', () => {
    const iso = toIsoInstant(entry('2026-07-15'), 'America/New_York');
    expect(iso).toBe('2026-07-16T03:59:00.000Z');
  });

  /**
   * The specific bug this guards: converting a winter date while the offset is
   * measured near a summer instant, or vice versa.
   */
  it('uses the offset in force on the target date, not today', () => {
    const winter = toIsoInstant(entry('2027-01-10T23:59'), 'America/New_York');
    const summer = toIsoInstant(entry('2027-07-10T23:59'), 'America/New_York');

    expect(winter).toBe('2027-01-11T04:59:00.000Z'); // EST, UTC-5
    expect(summer).toBe('2027-07-11T03:59:00.000Z'); // EDT, UTC-4
  });

  it('round-trips back to the same wall time it was given', () => {
    for (const [wall, zone] of [
      ['2027-01-10T23:59', 'America/New_York'],
      ['2027-07-10T23:59', 'America/New_York'],
      ['2027-03-14T23:59', 'America/New_York'], // US DST starts 14 Mar 2027
      ['2027-11-07T23:59', 'America/New_York'], // US DST ends 7 Nov 2027
      ['2027-03-28T23:59', 'Europe/London'], // UK DST starts 28 Mar 2027
      ['2027-06-15T09:30', 'Asia/Kolkata'], // half-hour offset
      ['2027-06-15T09:30', 'Australia/Sydney'], // southern hemisphere
      ['2027-12-15T09:30', 'Australia/Sydney'],
    ] as const) {
      const iso = toIsoInstant(entry(wall), zone);
      expect(iso, `${wall} in ${zone}`).not.toBeNull();
      expect(toDateTimeLocalValue(iso, zone), `${wall} in ${zone}`).toBe(wall);
    }
  });

  it('keeps a deadline on the intended calendar day in its own zone', () => {
    const iso = toIsoInstant(entry('2027-01-01'), 'America/Los_Angeles');
    // Displayed back in the same zone it must still read as 1 January.
    expect(formatDeadline(iso, 'America/Los_Angeles')).toContain('Jan 1, 2027');
    expect(formatDeadline(iso, 'America/Los_Angeles')).toContain('11:59 PM');
  });

  it('respects a zone with no DST at all', () => {
    const summer = toIsoInstant(entry('2027-07-10T12:00'), 'America/Phoenix');
    const winter = toIsoInstant(entry('2027-01-10T12:00'), 'America/Phoenix');
    expect(summer).toBe('2027-07-10T19:00:00.000Z');
    expect(winter).toBe('2027-01-10T19:00:00.000Z');
  });

  it('does not force end-of-day when asked not to', () => {
    const iso = toIsoInstant(entry('2027-01-10'), 'UTC', false);
    expect(iso).toBe('2027-01-10T00:00:00.000Z');
  });
});
