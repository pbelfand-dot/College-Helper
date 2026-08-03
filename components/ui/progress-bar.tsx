import { cn } from '@/lib/utils/cn';

/**
 * Checklist progress.
 *
 * The label always says what is being counted and shows the raw counts, because
 * ApplyPilot's progress numbers are meant to be reconstructable by hand. There
 * is no hidden score anywhere in this product.
 */
export function ProgressBar({
  percent,
  label = 'Checklist completion',
  completed,
  total,
  className,
  size = 'md',
}: {
  percent: number | null;
  label?: string;
  completed?: number;
  total?: number;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const value = percent ?? 0;
  const hasCounts = typeof completed === 'number' && typeof total === 'number';
  const description = hasCounts ? `${completed} of ${total} required items complete` : label;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="text-ink-muted font-medium">{label}</span>
        <span className="text-ink-muted tabular-nums">
          {percent === null ? 'No required items yet' : `${value}%`}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent ?? undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={description}
        className={cn(
          'bg-surface-muted w-full overflow-hidden rounded-full',
          size === 'sm' ? 'h-1.5' : 'h-2',
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-300',
            value >= 100 ? 'bg-success' : 'bg-accent',
          )}
          style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
        />
      </div>
      {hasCounts ? <p className="text-ink-subtle text-xs">{description}</p> : null}
    </div>
  );
}
