'use client';

import * as React from 'react';
import { Field } from './field';
import { Select } from './input';
import { DEFAULT_TIME_ZONE } from '@/lib/dates/format';
import { useClientValue } from '@/lib/utils/use-client-value';

/**
 * Time-zone picker.
 *
 * Every deadline in ApplyPilot carries a time zone, because "due at 11:59pm"
 * means different things in different places and getting that wrong is the kind
 * of mistake that actually costs a student an application.
 */

/** A short, practical list plus whatever the browser reports. */
const COMMON_ZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Dublin',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Istanbul',
  'Africa/Lagos',
  'Africa/Nairobi',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Singapore',
  'Asia/Seoul',
  'Asia/Tokyo',
  'Australia/Perth',
  'Australia/Sydney',
  'Pacific/Auckland',
  'UTC',
];

function detectTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

export function TimeZoneField({
  id = 'timeZone',
  name = 'timeZone',
  label = 'Time zone',
  description = 'Used to show your deadlines at the right local time.',
  defaultValue,
  error,
}: {
  id?: string;
  name?: string;
  label?: string;
  description?: string;
  defaultValue?: string | null;
  error?: string | string[];
}) {
  // The browser's zone is external state, so it is read through
  // useSyncExternalStore rather than copied into React state in an effect.
  const detected = useClientValue<string | null>(detectTimeZone, null);

  const zones = React.useMemo(() => {
    const all = new Set(COMMON_ZONES);
    if (detected) all.add(detected);
    if (defaultValue) all.add(defaultValue);
    return [...all].sort();
  }, [detected, defaultValue]);

  return (
    <Field id={id} label={label} description={description} error={error}>
      {(props) => (
        <Select {...props} name={name} defaultValue={defaultValue ?? detected ?? DEFAULT_TIME_ZONE}>
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replace(/_/g, ' ')}
              {zone === detected ? ' (detected)' : ''}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}
