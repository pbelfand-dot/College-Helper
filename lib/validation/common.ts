import { z } from 'zod';
import { isValidTimeZone } from '@/lib/dates/format';

/** Shared primitives so every schema treats empty form fields the same way. */

export const idSchema = z.string().uuid('That record id is not valid.');

/** Trims, then converts "" to null. HTML forms submit empty strings, not null. */
export function optionalText(max: number, label = 'This field') {
  return z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .default(null);
}

export function requiredText(max: number, label = 'This field') {
  return z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);
}

/** Only http(s). Rejects `javascript:` and other schemes before they reach an href. */
export const optionalUrl = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .default(null)
  .refine(
    (value) => {
      if (value === null) return true;
      try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'Enter a full link starting with http:// or https://' },
  );

export const optionalIsoDate = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .default(null)
  .refine((value) => value === null || !Number.isNaN(Date.parse(value)), {
    message: 'That date could not be read.',
  });

export const timeZoneSchema = z
  .string()
  .trim()
  .min(1)
  .refine(isValidTimeZone, { message: 'That time zone is not recognised.' });

export const optionalEmail = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .default(null)
  .refine((value) => value === null || z.email().safeParse(value).success, {
    message: 'Enter a valid email address.',
  });

export const optionalPositiveInt = (max: number, label = 'This number') =>
  z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((value) => {
      if (value === null || value === undefined || value === '') return null;
      const parsed = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(parsed) ? parsed : Number.NaN;
    })
    .refine((value) => value === null || (Number.isInteger(value) && value >= 0 && value <= max), {
      message: `${label} must be a whole number between 0 and ${max}.`,
    })
    .nullable();

export const optionalMoney = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined || value === '') return null;
    const parsed = typeof value === 'number' ? value : Number(String(value).replace(/[$,]/g, ''));
    return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : Number.NaN;
  })
  .refine((value) => value === null || (value >= 0 && value <= 10_000_000), {
    message: 'Enter an amount between 0 and 10,000,000.',
  })
  .nullable();

/**
 * Accepts either a real array (JSON body) or a comma-separated string (form
 * field), and always yields a trimmed, de-duplicated, bounded array.
 */
export function tagList(maxItems: number, maxLength: number) {
  return z
    .union([z.array(z.string()), z.string(), z.null(), z.undefined()])
    .transform((value) => {
      const raw =
        value === null || value === undefined
          ? []
          : Array.isArray(value)
            ? value
            : value.split(',');
      const cleaned = raw.map((item) => item.trim()).filter((item) => item.length > 0);
      return [...new Set(cleaned)];
    })
    .refine((value) => value.length <= maxItems, {
      message: `Please keep this to ${maxItems} entries or fewer.`,
    })
    .refine((value) => value.every((item) => item.length <= maxLength), {
      message: `Each entry must be ${maxLength} characters or fewer.`,
    });
}

/** Checkbox inputs submit "on"/absent; JSON submits real booleans. */
export const checkboxBoolean = z
  .union([z.boolean(), z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value === 'boolean') return value;
    if (value === null || value === undefined) return false;
    return value === 'on' || value === 'true' || value === '1';
  });
