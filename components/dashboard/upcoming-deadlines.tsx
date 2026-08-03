import Link from 'next/link';
import { CalendarCheck2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { formatAllDayDeadline, formatDeadline } from '@/lib/dates/format';
import { daysUntil, type DeadlineItem } from '@/lib/domain/deadlines';

const kindLabels: Record<DeadlineItem['kind'], string> = {
  application: 'Application',
  essay: 'Essay',
  recommendation: 'Recommendation',
  scholarship: 'Scholarship',
  task: 'Task',
};

/**
 * Shared deadline list, used on the dashboard and the calendar agenda.
 *
 * Each row shows the full date with year and time zone. Relative wording is
 * plain — "Due in 6 days", never a ticking counter.
 */
export function UpcomingDeadlineList({
  items,
  now = new Date(),
  emptyTitle = 'Nothing due right now',
  emptyDescription = 'When you add deadlines to applications, essays, scholarships or tasks, they will show up here.',
  max,
}: {
  items: DeadlineItem[];
  now?: Date;
  emptyTitle?: string;
  emptyDescription?: string;
  max?: number;
}) {
  if (items.length === 0) {
    return (
      <EmptyState icon={CalendarCheck2} title={emptyTitle} description={emptyDescription} />
    );
  }

  const shown = typeof max === 'number' ? items.slice(0, max) : items;

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
      {shown.map((item) => {
        const days = daysUntil(item.dueAt, item.timeZone, now) ?? 0;
        const passed = new Date(item.dueAt).getTime() < now.getTime();

        return (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-surface-muted sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium text-ink">{item.title}</span>
                  <Badge tone="neutral">{kindLabels[item.kind]}</Badge>
                </div>
                {item.subtitle ? (
                  <p className="mt-0.5 truncate text-xs text-ink-muted">{item.subtitle}</p>
                ) : null}
              </div>

              <div className="shrink-0 text-left sm:text-right">
                <p
                  className={
                    passed
                      ? 'text-xs font-medium text-danger'
                      : days <= 3
                        ? 'text-xs font-medium text-warning'
                        : 'text-xs font-medium text-ink'
                  }
                >
                  {passed
                    ? days === 0
                      ? 'Deadline passed today'
                      : `Passed ${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'} ago`
                    : days === 0
                      ? 'Due today'
                      : days === 1
                        ? 'Due tomorrow'
                        : `Due in ${days} days`}
                </p>
                <p className="text-xs text-ink-muted">
                  {item.allDay
                    ? formatAllDayDeadline(item.dueAt, item.timeZone)
                    : formatDeadline(item.dueAt, item.timeZone)}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
