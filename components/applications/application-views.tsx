'use client';

import Link from 'next/link';
import { LayoutGrid, ListChecks, Table2 } from 'lucide-react';
import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DeadlineBadge } from '@/components/ui/deadline-badge';
import {
  ActiveFilterNotice,
  FilterBar,
  FilterSelect,
  SearchField,
} from '@/components/ui/filter-bar';
import { ProgressBar } from '@/components/ui/progress-bar';
import { EmptyState } from '@/components/ui/states';
import { ApplicationStatusBadge, DecisionBadge } from '@/components/ui/status-badge';
import { applicationRoundLabels, applicationStatusLabels } from '@/lib/domain/labels';
import { formatDate } from '@/lib/dates/format';
import type { ApplicationProgress } from '@/lib/domain/progress';
import {
  APPLICATION_ROUNDS,
  APPLICATION_STATUSES,
  type ApplicationRound,
  type ApplicationStatus,
  type College,
} from '@/lib/domain/types';
import { cn } from '@/lib/utils/cn';
import { NewApplicationButton } from './new-application-button';

type View = 'table' | 'board';

/**
 * Applications in either a table or a status board.
 *
 * The board groups by the student's own status field, not by any notion of how
 * "good" an application is.
 */
export function ApplicationViews({
  entries,
  colleges,
  timeZone,
}: {
  entries: ApplicationProgress[];
  colleges: College[];
  timeZone: string;
}) {
  const [view, setView] = React.useState<View>('table');
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<ApplicationStatus | 'all'>('all');
  const [round, setRound] = React.useState<ApplicationRound | 'all'>('all');

  const collegeNames = React.useMemo(
    () => new Map(colleges.map((college) => [college.id, college.name])),
    [colleges],
  );

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (status !== 'all' && entry.application.status !== status) return false;
      if (round !== 'all' && entry.application.applicationRound !== round) return false;
      if (!needle) return true;
      const name = collegeNames.get(entry.application.collegeId) ?? '';
      return name.toLowerCase().includes(needle);
    });
  }, [entries, search, status, round, collegeNames]);

  function clearFilters() {
    setSearch('');
    setStatus('all');
    setRound('all');
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="No applications yet"
        description="Create an application for a college on your list. Each one gets its own requirement checklist, deadline and linked essays."
        action={<NewApplicationButton colleges={colleges} defaultTimeZone={timeZone} />}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="radiogroup"
          aria-label="View"
          className="inline-flex gap-1 rounded-[var(--radius)] border border-line-strong p-1"
        >
          <ViewButton current={view} value="table" onSelect={setView} icon={Table2} label="Table" />
          <ViewButton current={view} value="board" onSelect={setView} icon={LayoutGrid} label="Board" />
        </div>
        <NewApplicationButton colleges={colleges} defaultTimeZone={timeZone} size="sm" />
      </div>

      <FilterBar>
        <SearchField
          id="application-search"
          value={search}
          onChange={setSearch}
          label="Search by college"
          placeholder="College name"
        />
        <FilterSelect
          id="application-status"
          label="Status"
          value={status}
          onChange={setStatus}
          allLabel="Any status"
          options={APPLICATION_STATUSES.map((value) => ({
            value,
            label: applicationStatusLabels[value],
          }))}
        />
        <FilterSelect
          id="application-round"
          label="Round"
          value={round}
          onChange={setRound}
          allLabel="Any round"
          options={APPLICATION_ROUNDS.map((value) => ({
            value,
            label: applicationRoundLabels[value],
          }))}
        />
      </FilterBar>

      <ActiveFilterNotice shown={filtered.length} total={entries.length} onClear={clearFilters} />

      {filtered.length === 0 ? (
        <EmptyState
          title="Nothing matches those filters"
          description="Adjust the filters above to see your applications again."
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : view === 'table' ? (
        <ApplicationTable entries={filtered} collegeNames={collegeNames} timeZone={timeZone} />
      ) : (
        <ApplicationBoard entries={filtered} collegeNames={collegeNames} />
      )}
    </div>
  );
}

function ViewButton({
  current,
  value,
  onSelect,
  icon: Icon,
  label,
}: {
  current: View;
  value: View;
  onSelect: (value: View) => void;
  icon: typeof Table2;
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
          ? 'bg-accent-soft font-medium text-accent-text'
          : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}

function ApplicationTable({
  entries,
  collegeNames,
  timeZone,
}: {
  entries: ApplicationProgress[];
  collegeNames: Map<string, string>;
  timeZone: string;
}) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-surface">
      <table className="w-full min-w-[52rem] border-collapse text-sm">
        <caption className="sr-only">
          Your applications, with round, deadline, status and checklist completion
        </caption>
        <thead>
          <tr className="border-b border-line text-left">
            <Th>College</Th>
            <Th>Round</Th>
            <Th>Deadline</Th>
            <Th>Status</Th>
            <Th>Checklist</Th>
            <Th>Missing</Th>
          </tr>
        </thead>
        <tbody>
          {entries.map(({ application, completion, missing }) => (
            <tr key={application.id} className="border-b border-line last:border-0 hover:bg-surface-muted">
              <td className="px-4 py-3">
                <Link
                  href={`/applications/${application.id}`}
                  className="font-medium text-ink underline-offset-4 hover:underline"
                >
                  {collegeNames.get(application.collegeId) ?? 'Application'}
                </Link>
                <div className="mt-1">
                  <DecisionBadge result={application.decisionResult} />
                </div>
              </td>
              <td className="px-4 py-3 text-ink-muted">
                {applicationRoundLabels[application.applicationRound]}
              </td>
              <td className="px-4 py-3">
                {application.deadlineAt ? (
                  <>
                    <div className="text-ink">
                      {formatDate(application.deadlineAt, application.deadlineTimeZone)}
                    </div>
                    <div className="text-xs text-ink-muted">
                      <DeadlineBadge
                        dueAt={application.deadlineAt}
                        timeZone={application.deadlineTimeZone}
                        showDate={false}
                      />
                    </div>
                  </>
                ) : (
                  <span className="text-ink-subtle">Not set</span>
                )}
              </td>
              <td className="px-4 py-3">
                <ApplicationStatusBadge status={application.status} />
              </td>
              <td className="w-44 px-4 py-3">
                <ProgressBar
                  percent={completion.percent}
                  completed={completion.completed}
                  total={completion.total}
                  size="sm"
                  label="Checklist"
                />
              </td>
              <td className="px-4 py-3 text-xs text-ink-muted">
                {missing.length === 0 ? (
                  <span className="text-success">Nothing outstanding</span>
                ) : (
                  <ul className="flex flex-col gap-0.5">
                    {missing.slice(0, 3).map((requirement) => (
                      <li key={requirement.id}>{requirement.title}</li>
                    ))}
                    {missing.length > 3 ? <li>+{missing.length - 3} more</li> : null}
                  </ul>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-line px-4 py-2 text-xs text-ink-subtle">
        Deadlines are shown in the time zone you recorded for each college. Times of day appear on the
        application page. All dates use the {timeZone.replace(/_/g, ' ')} calendar for relative wording.
      </p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="px-4 py-2.5 text-xs font-semibold tracking-wide text-ink-muted uppercase">
      {children}
    </th>
  );
}

const boardColumns: ApplicationStatus[] = [
  'planning',
  'in-progress',
  'ready-to-submit',
  'submitted',
  'decision-received',
];

function ApplicationBoard({
  entries,
  collegeNames,
}: {
  entries: ApplicationProgress[];
  collegeNames: Map<string, string>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {boardColumns.map((column) => {
        const columnEntries = entries.filter((entry) => entry.application.status === column);
        return (
          <section
            key={column}
            aria-label={applicationStatusLabels[column]}
            className="flex flex-col gap-2 rounded-[var(--radius-lg)] border border-line bg-surface-muted/50 p-2.5"
          >
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold tracking-wide text-ink uppercase">
                {applicationStatusLabels[column]}
              </h3>
              <Badge tone="neutral">{columnEntries.length}</Badge>
            </div>

            {columnEntries.length === 0 ? (
              <p className="px-1 py-3 text-xs text-ink-subtle">Nothing here.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {columnEntries.map(({ application, completion }) => (
                  <li key={application.id}>
                    <Link
                      href={`/applications/${application.id}`}
                      className="flex flex-col gap-2 rounded-[var(--radius)] border border-line bg-surface px-3 py-2.5 transition-colors hover:border-line-strong"
                    >
                      <span className="text-sm font-medium text-ink">
                        {collegeNames.get(application.collegeId) ?? 'Application'}
                      </span>
                      <span className="text-xs text-ink-muted">
                        {applicationRoundLabels[application.applicationRound]}
                      </span>
                      {application.deadlineAt ? (
                        <DeadlineBadge
                          dueAt={application.deadlineAt}
                          timeZone={application.deadlineTimeZone}
                          showDate={false}
                        />
                      ) : null}
                      <ProgressBar
                        percent={completion.percent}
                        completed={completion.completed}
                        total={completion.total}
                        size="sm"
                        label="Checklist"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
