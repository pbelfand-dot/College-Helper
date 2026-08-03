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
          <h2 className="text-ink text-sm font-semibold tracking-wide uppercase">{title}</h2>
          {description ? <p className="text-ink-muted mt-0.5 text-xs">{description}</p> : null}
        </div>
        {href ? (
          <Link
            href={href}
            className="text-accent-text shrink-0 rounded text-xs font-medium underline-offset-4 hover:underline"
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
      <p className="text-ink text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-ink mt-0.5 text-xs font-medium">{label}</p>
      {hint ? <p className="text-ink-muted mt-0.5 text-xs">{hint}</p> : null}
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
