/**
 * Word and character counting for essays and activity descriptions.
 *
 * Limits are always configurable per essay/activity — ApplyPilot never hardcodes
 * another organisation's current limit, because those change.
 */

import type { LimitType } from './types';

/**
 * Counts whitespace-separated tokens. Hyphenated words count as one, matching
 * how most application portals describe their limits.
 */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/u).length;
}

/**
 * Counts characters the way a text field does, using code points so emoji and
 * accented characters are not double-counted.
 */
export function countCharacters(text: string): number {
  return [...text].length;
}

export interface CountState {
  limitType: LimitType;
  /** Words or characters used, depending on `limitType`. */
  used: number;
  /** `null` when there is no configured limit. */
  limit: number | null;
  /** Remaining allowance. Negative when over. `null` when unlimited. */
  remaining: number | null;
  over: boolean;
  /** 0-100+, rounded. `null` when unlimited. */
  percentUsed: number | null;
  /** True once the student is within 10% of the limit but not yet over. */
  nearLimit: boolean;
}

export function evaluateCount(
  text: string,
  limitType: LimitType,
  limitValue: number | null,
): CountState {
  const used =
    limitType === 'characters'
      ? countCharacters(text)
      : limitType === 'words'
        ? countWords(text)
        : countWords(text);

  if (limitType === 'none' || limitValue === null || limitValue <= 0) {
    return {
      limitType,
      used,
      limit: null,
      remaining: null,
      over: false,
      percentUsed: null,
      nearLimit: false,
    };
  }

  const remaining = limitValue - used;
  const percentUsed = Math.round((used / limitValue) * 100);
  return {
    limitType,
    used,
    limit: limitValue,
    remaining,
    over: remaining < 0,
    percentUsed,
    nearLimit: remaining >= 0 && percentUsed >= 90,
  };
}

/** e.g. "412 / 650 characters" or "128 words". */
export function formatCount(state: CountState): string {
  const unit = state.limitType === 'characters' ? 'characters' : 'words';
  if (state.limit === null) return `${state.used} ${unit}`;
  return `${state.used} / ${state.limit} ${unit}`;
}
