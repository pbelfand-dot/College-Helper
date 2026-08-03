import Link from 'next/link';
import * as React from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Dashboard section wrapper.
 *
 * Sections are plain headed regions rather than identical floating cards, so
 * the page reads as one document instead of a wall of boxes.
 */
export function DashboardSection({
  title,
  description,
  href,
  linkLabel,
  children,
  className,
}: {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-ink uppercase">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-ink-muted">{description}</p> : null}
        </div>
        {href ? (
          <Link
            href={href}
            className="shrink-0 rounded text-xs font-medium text-accent-text underline-offset-4 hover:underline"
          >
            {linkLabel ?? 'View all'}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** Compact figure + label. Used for counts, never for a composite score. */
export function StatTile({
  label,
  value,
  hint,
  href,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  tone?: 'neutral' | 'warning' | 'accent';
}) {
  const content = (
    <>
      <p className="text-2xl font-semibold tabular-nums text-ink">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-ink">{label}</p>
      {hint ? <p className="mt-0.5 text-xs text-ink-muted">{hint}</p> : null}
    </>
  );

  const className = cn(
    'flex flex-col rounded-[var(--radius-lg)] border px-4 py-3.5 transition-colors',
    tone === 'warning'
      ? 'border-warning/35 bg-warning-soft'
      : tone === 'accent'
        ? 'border-accent/25 bg-accent-soft'
        : 'border-line bg-surface',
    href ? 'hover:border-line-strong' : '',
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return <div className={className}>{content}</div>;
}
