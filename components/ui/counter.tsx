'use client';

import { cn } from '@/lib/utils/cn';
import { evaluateCount, formatCount } from '@/lib/domain/counting';
import type { LimitType } from '@/lib/domain/types';

/**
 * Live word / character counter.
 *
 * Going over the limit is shown as information, not failure — students often
 * draft long on purpose and cut later. The number is announced politely so
 * screen-reader users get the count without it interrupting typing.
 */
export function Counter({
  text,
  limitType,
  limitValue,
  className,
}: {
  text: string;
  limitType: LimitType;
  limitValue: number | null;
  className?: string;
}) {
  const state = evaluateCount(text, limitType, limitValue);

  return (
    <span
      className={cn(
        'text-xs tabular-nums',
        state.over ? 'text-warning font-medium' : state.nearLimit ? 'text-ink' : 'text-ink-muted',
        className,
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      {formatCount(state)}
      {state.over && state.remaining !== null ? (
        <span className="ml-1">({Math.abs(state.remaining)} over — trim before you submit)</span>
      ) : null}
    </span>
  );
}
