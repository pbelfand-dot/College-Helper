import { AlertCircle, type LucideIcon } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import { Button } from './button';

/**
 * Empty, loading and error states.
 *
 * Every list in ApplyPilot uses these, so a student never lands on a blank
 * screen wondering whether something is broken or just not started yet.
 */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  /** Say what to do next, not just that there is nothing here. */
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'border-line-strong bg-surface flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-dashed px-6 py-12 text-center',
        className,
      )}
    >
      {Icon ? (
        <span className="bg-accent-soft text-accent-text flex size-10 items-center justify-center rounded-full">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      ) : null}
      <h3 className="text-ink text-base font-semibold">{title}</h3>
      <p className="text-ink-muted max-w-md text-sm">{description}</p>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  className,
}: {
  title?: string;
  description: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'border-danger/40 bg-danger-soft flex flex-col items-start gap-2 rounded-[var(--radius-lg)] border px-4 py-3',
        className,
      )}
    >
      <div className="text-danger flex items-center gap-2 text-sm font-semibold">
        <AlertCircle className="size-4" aria-hidden="true" />
        {title}
      </div>
      <p className="text-ink text-sm">{description}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('ap-skeleton rounded-[var(--radius)]', className)} aria-hidden="true" />
  );
}

/** Standard list placeholder while a route segment streams in. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Loading">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-20 w-full" />
      ))}
    </div>
  );
}
