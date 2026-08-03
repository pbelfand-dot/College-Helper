'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Plus } from 'lucide-react';
import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DeadlineBadge } from '@/components/ui/deadline-badge';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ActiveFilterNotice,
  FilterBar,
  FilterSelect,
  SearchField,
} from '@/components/ui/filter-bar';
import { EmptyState } from '@/components/ui/states';
import { EssayStatusBadge } from '@/components/ui/status-badge';
import { useToast } from '@/components/ui/toast';
import { essayStatusLabels } from '@/lib/domain/labels';
import { evaluateCount, formatCount } from '@/lib/domain/counting';
import { formatDate } from '@/lib/dates/format';
import {
  ESSAY_STATUSES,
  type Application,
  type College,
  type Essay,
  type EssayStatus,
} from '@/lib/domain/types';
import { EssayForm } from './essay-form';
import { createEssay } from '@/app/(app)/essays/actions';

export function EssayList({
  essays,
  colleges,
  applications,
  timeZone,
}: {
  essays: Essay[];
  colleges: College[];
  applications: Application[];
  timeZone: string;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<EssayStatus | 'all'>('all');
  const [collegeId, setCollegeId] = React.useState<string | 'all'>('all');

  const collegeNames = React.useMemo(
    () => new Map(colleges.map((college) => [college.id, college.name])),
    [colleges],
  );

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return essays.filter((essay) => {
      if (status !== 'all' && essay.status !== status) return false;
      if (collegeId !== 'all' && essay.collegeId !== collegeId) return false;
      if (!needle) return true;
      return [essay.title, essay.prompt ?? '', collegeNames.get(essay.collegeId ?? '') ?? '']
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [essays, search, status, collegeId, collegeNames]);

  function clearFilters() {
    setSearch('');
    setStatus('all');
    setCollegeId('all');
  }

  const newEssayButton = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus aria-hidden="true" />
          New essay
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New essay</DialogTitle>
          <DialogDescription>
            Set the prompt and limit from the official instructions. You can change them later.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <EssayForm
            action={createEssay}
            colleges={colleges}
            applications={applications}
            timeZone={timeZone}
            submitLabel="Create essay"
            onDone={(id) => {
              setOpen(false);
              notify('Essay created.');
              router.push(`/essays/${id}`);
            }}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );

  if (essays.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-end">{newEssayButton}</div>
        <EmptyState
          icon={FileText}
          title="No essays yet"
          description="Start with your personal statement, or a supplement for a college on your list. Each essay gets a brainstorm space, an outline, a draft with autosave, and full version history."
          action={newEssayButton}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">{newEssayButton}</div>

      <FilterBar>
        <SearchField
          id="essay-search"
          value={search}
          onChange={setSearch}
          label="Search essays"
          placeholder="Title, prompt or college"
        />
        <FilterSelect
          id="essay-status"
          label="Status"
          value={status}
          onChange={setStatus}
          allLabel="Any status"
          options={ESSAY_STATUSES.map((value) => ({ value, label: essayStatusLabels[value] }))}
        />
        {colleges.length > 0 ? (
          <FilterSelect
            id="essay-college"
            label="College"
            value={collegeId}
            onChange={setCollegeId}
            allLabel="Any college"
            options={colleges.map((college) => ({ value: college.id, label: college.name }))}
          />
        ) : null}
      </FilterBar>

      <ActiveFilterNotice shown={filtered.length} total={essays.length} onClear={clearFilters} />

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nothing matches those filters"
          description="Adjust the filters above to see your essays again."
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((essay) => {
            const count = evaluateCount(essay.currentDraft, essay.limitType, essay.limitValue);
            return (
              <li key={essay.id}>
                <Link
                  href={`/essays/${essay.id}`}
                  className="flex h-full flex-col gap-2.5 rounded-[var(--radius-lg)] border border-line bg-surface px-4 py-4 transition-colors hover:border-line-strong"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold text-ink">{essay.title}</h3>
                    <EssayStatusBadge status={essay.status} />
                  </div>

                  {essay.collegeId ? (
                    <Badge tone="neutral">{collegeNames.get(essay.collegeId) ?? 'College'}</Badge>
                  ) : (
                    <Badge tone="neutral">Not tied to one college</Badge>
                  )}

                  {essay.prompt ? (
                    <p className="line-clamp-2 text-xs text-ink-muted">{essay.prompt}</p>
                  ) : null}

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
                    <span
                      className={
                        count.over
                          ? 'text-xs font-medium text-warning'
                          : 'text-xs tabular-nums text-ink-muted'
                      }
                    >
                      {formatCount(count)}
                    </span>
                    <span className="text-xs text-ink-subtle">
                      Edited {formatDate(essay.updatedAt, timeZone)}
                    </span>
                  </div>

                  {essay.dueAt ? (
                    <DeadlineBadge
                      dueAt={essay.dueAt}
                      timeZone={timeZone}
                      allDay
                      showDate={false}
                    />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
