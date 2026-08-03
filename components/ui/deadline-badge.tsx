import { CalendarDays } from 'lucide-react';
import { Badge } from './badge';
import { daysUntil } from '@/lib/domain/deadlines';
import { formatAllDayDeadline, formatDeadline } from '@/lib/dates/format';

/**
 * Deadline display.
 *
 * Two rules the whole product follows and this component enforces:
 *  1. the year and the time zone are always visible;
 *  2. the wording stays calm. Something due tomorrow says "due tomorrow",
 *     not "1 DAY LEFT!". Urgency is conveyed by ordering and colour, never by
 *     pressure language.
 */
export function DeadlineBadge({
  dueAt,
  timeZone,
  allDay = false,
  now = new Date(),
  showDate = true,
}: {
  dueAt: string | null;
  timeZone: string;
  allDay?: boolean;
  now?: Date;
  showDate?: boolean;
}) {
  if (!dueAt) {
    return (
      <Badge tone="neutral">
        <CalendarDays className="size-3" aria-hidden="true" />
        No deadline set
      </Badge>
    );
  }

  const days = daysUntil(dueAt, timeZone, now) ?? 0;
  const passed = new Date(dueAt).getTime() < now.getTime();

  const tone = passed ? 'danger' : days <= 3 ? 'warning' : days <= 14 ? 'info' : 'neutral';
  const relative = passed
    ? days === 0
      ? 'Deadline passed today'
      : `Passed ${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'} ago`
    : days === 0
      ? 'Due today'
      : days === 1
        ? 'Due tomorrow'
        : `Due in ${days} days`;

  const absolute = allDay ? formatAllDayDeadline(dueAt, timeZone) : formatDeadline(dueAt, timeZone);

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <Badge tone={tone}>
        <CalendarDays className="size-3" aria-hidden="true" />
        {relative}
      </Badge>
      {showDate ? <span className="text-ink-muted text-xs">{absolute}</span> : null}
    </span>
  );
}
