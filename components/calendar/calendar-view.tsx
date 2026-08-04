'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { addMonths, format, subMonths } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, List, Plus } from 'lucide-react';
import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { UpcomingDeadlineList } from '@/components/dashboard/upcoming-deadlines';
import { buildMonthGrid, monthHasItems } from '@/lib/domain/calendar';
import type { DeadlineItem, DeadlineKind } from '@/lib/domain/deadlines';
import { formatAllDayDeadline, formatDeadline } from '@/lib/dates/format';
import type { Application, College, Essay, Scholarship, Task } from '@/lib/domain/types';
import { cn } from '@/lib/utils/cn';
import { TaskForm } from './task-form';
import { TaskChecklist } from './task-checklist';
import { createTask } from '@/app/(app)/calendar/actions';

const KIND_LABELS: Record<DeadlineKind, string> = {
  application: 'Applications',
  essay: 'Essays',
  recommendation: 'Recommendations',
  scholarship: 'Scholarships',
  task: 'My tasks',
};

const KIND_ORDER: DeadlineKind[] = [
  'application',
  'essay',
  'recommendation',
  'scholarship',
  'task',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * The calendar.
 *
 * Every date shown carries its year, and every deadline row carries the time
 * zone it belongs to — a deadline stated in Eastern time is displayed as
 * Eastern time, not silently converted.
 */
export function CalendarView({
  items,
  tasks,
  applications,
  colleges,
  essays,
  scholarships,
  timeZone,
}: {
  items: DeadlineItem[];
  tasks: Task[];
  applications: Application[];
  colleges: College[];
  essays: Essay[];
  scholarships: Scholarship[];
  timeZone: string;
}) {
  const router = useRouter();
  const { notify } = useToast();

  const [view, setView] = React.useState<'month' | 'agenda'>('month');
  const [month, setMonth] = React.useState(() => new Date());
  const [hidden, setHidden] = React.useState<Set<DeadlineKind>>(new Set());
  const [showDone, setShowDone] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [addDate, setAddDate] = React.useState<string | undefined>(undefined);

  const visible = React.useMemo(
    () => items.filter((item) => !hidden.has(item.kind) && (showDone || !item.done)),
    [items, hidden, showDone],
  );

  const weeks = React.useMemo(
    () => buildMonthGrid({ month, items: visible, timeZone }),
    [month, visible, timeZone],
  );

  function toggleKind(kind: DeadlineKind) {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  function openAddFor(date?: string) {
    setAddDate(date);
    setAddOpen(true);
  }

  const addDialog = (
    <Dialog open={addOpen} onOpenChange={setAddOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a task</DialogTitle>
          <DialogDescription>
            Tasks are your own reminders. ApplyPilot shows them here and on your dashboard — it does
            not email or text you.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <TaskForm
            action={createTask}
            applications={applications}
            colleges={colleges}
            essays={essays}
            scholarships={scholarships}
            defaultTimeZone={timeZone}
            defaultDate={addDate}
            submitLabel="Add task"
            onDone={() => {
              setAddOpen(false);
              notify('Task added.');
              router.refresh();
            }}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="flex flex-col gap-4">
      {addDialog}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="radiogroup"
          aria-label="Calendar view"
          className="border-line-strong inline-flex gap-1 rounded-[var(--radius)] border p-1"
        >
          <ViewToggle
            current={view}
            value="month"
            onSelect={setView}
            icon={CalendarDays}
            label="Month"
          />
          <ViewToggle current={view} value="agenda" onSelect={setView} icon={List} label="Agenda" />
        </div>

        <Button size="sm" onClick={() => openAddFor(undefined)}>
          <Plus aria-hidden="true" />
          Add task
        </Button>
      </div>

      <div className="border-line bg-surface flex flex-col gap-3 rounded-[var(--radius-lg)] border px-4 py-3">
        <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <legend className="sr-only">Filter by type</legend>
          <span className="text-ink-muted text-xs font-medium">Show</span>
          {KIND_ORDER.map((kind) => (
            <label key={kind} className="text-ink flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={!hidden.has(kind)}
                onChange={() => toggleKind(kind)}
                className="size-3.5 accent-[hsl(var(--ap-accent))]"
              />
              {KIND_LABELS[kind]}
            </label>
          ))}
          <label className="text-ink flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={showDone}
              onChange={(event) => setShowDone(event.target.checked)}
              className="size-3.5 accent-[hsl(var(--ap-accent))]"
            />
            Finished items
          </label>
        </fieldset>
        <p className="text-ink-subtle text-xs">
          Times are shown in the zone each deadline was recorded in. Your own zone is{' '}
          {timeZone.replace(/_/g, ' ')}.
        </p>
      </div>

      {view === 'month' ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-ink text-base font-semibold">{format(month, 'MMMM yyyy')}</h2>
            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setMonth(subMonths(month, 1))}
                aria-label="Previous month"
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setMonth(new Date())}>
                Today
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setMonth(addMonths(month, 1))}
                aria-label="Next month"
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </div>

          {!monthHasItems(weeks) ? (
            <EmptyState
              icon={CalendarDays}
              title={`Nothing scheduled in ${format(month, 'MMMM yyyy')}`}
              description="Deadlines from your applications, essays, recommendations and scholarships appear here automatically. You can also add your own tasks."
              action={<Button onClick={() => openAddFor(undefined)}>Add a task</Button>}
            />
          ) : null}

          <div className="overflow-x-auto">
            <div className="min-w-[44rem]">
              <div className="border-line bg-line grid grid-cols-7 gap-px rounded-t-[var(--radius-lg)] border">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="bg-surface-muted text-ink-muted px-2 py-1.5 text-center text-xs font-medium"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="border-line bg-line grid grid-cols-7 gap-px border-x border-b">
                {weeks.flatMap((week) =>
                  week.days.map((day) => (
                    <div
                      key={day.key}
                      className={cn(
                        'bg-surface flex min-h-24 flex-col gap-1 p-1.5',
                        !day.inMonth && 'bg-surface-muted/60',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            'text-xs tabular-nums',
                            day.isToday
                              ? 'bg-accent text-accent-contrast flex size-5 items-center justify-center rounded-full font-semibold'
                              : day.inMonth
                                ? 'text-ink'
                                : 'text-ink-subtle',
                          )}
                        >
                          {day.dayOfMonth}
                        </span>
                        {day.inMonth ? (
                          <button
                            type="button"
                            onClick={() => openAddFor(day.key)}
                            aria-label={`Add a task on ${day.key}`}
                            className="text-ink-subtle hover:bg-surface-muted hover:text-ink rounded p-0.5 opacity-0 transition-opacity focus-visible:opacity-100 [div:hover>&]:opacity-100"
                          >
                            <Plus className="size-3" aria-hidden="true" />
                          </button>
                        ) : null}
                      </div>

                      <ul className="flex flex-col gap-0.5">
                        {day.items.slice(0, 3).map((entry) => (
                          <li key={entry.id}>
                            <Link
                              href={entry.href}
                              title={
                                entry.allDay
                                  ? formatAllDayDeadline(entry.dueAt, entry.timeZone)
                                  : formatDeadline(entry.dueAt, entry.timeZone)
                              }
                              className={cn(
                                'block truncate rounded px-1 py-0.5 text-[11px] transition-colors',
                                entry.done
                                  ? 'text-ink-subtle hover:bg-surface-muted line-through'
                                  : 'bg-accent-soft text-accent-text hover:brightness-95',
                              )}
                            >
                              {entry.title}
                            </Link>
                          </li>
                        ))}
                        {day.items.length > 3 ? (
                          <li className="text-ink-subtle px-1 text-[11px]">
                            +{day.items.length - 3} more
                          </li>
                        ) : null}
                      </ul>
                    </div>
                  )),
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-ink text-base font-semibold">Everything coming up</h2>
            <Badge tone="neutral">{visible.filter((entry) => !entry.done).length} open</Badge>
          </div>
          <UpcomingDeadlineList
            items={visible}
            emptyTitle="Nothing on the agenda"
            emptyDescription="When you add deadlines to applications, essays, recommendations or scholarships, they appear here."
          />
        </div>
      )}

      <TaskChecklist
        tasks={tasks}
        applications={applications}
        colleges={colleges}
        essays={essays}
        scholarships={scholarships}
        timeZone={timeZone}
      />
    </div>
  );
}

function ViewToggle({
  current,
  value,
  onSelect,
  icon: Icon,
  label,
}: {
  current: 'month' | 'agenda';
  value: 'month' | 'agenda';
  onSelect: (value: 'month' | 'agenda') => void;
  icon: typeof CalendarDays;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={current === value}
      onClick={() => onSelect(value)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[calc(var(--radius)-2px)] px-2.5 py-1.5 text-xs transition-colors',
        current === value
          ? 'bg-accent-soft text-accent-text font-medium'
          : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}
