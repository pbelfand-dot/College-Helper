'use client';

import { useRouter } from 'next/navigation';
import { Award, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
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
import { ScholarshipStatusBadge } from '@/components/ui/status-badge';
import { useToast } from '@/components/ui/toast';
import { scholarshipStatusLabels } from '@/lib/domain/labels';
import { formatDate } from '@/lib/dates/format';
import {
  SCHOLARSHIP_STATUSES,
  type Essay,
  type Scholarship,
  type ScholarshipStatus,
} from '@/lib/domain/types';
import { ScholarshipForm } from './scholarship-form';
import {
  createScholarship,
  deleteScholarship,
  updateScholarship,
} from '@/app/(app)/scholarships/actions';

const amountFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatAmount(amount: number | null): string {
  return amount === null ? 'Amount not recorded' : amountFormatter.format(amount);
}

/**
 * The scholarship list.
 *
 * Every row carries the date the student last checked the official source,
 * because a saved listing is a snapshot of a page that can change or close at
 * any time. Rows that were never verified say so rather than looking settled.
 */
export function ScholarshipList({
  scholarships,
  essays,
  timeZone,
}: {
  scholarships: Scholarship[];
  essays: Essay[];
  timeZone: string;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [addOpen, setAddOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<ScholarshipStatus | 'all'>('all');

  const essayTitles = React.useMemo(
    () => new Map(essays.map((essay) => [essay.id, essay.title])),
    [essays],
  );

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return scholarships.filter((scholarship) => {
      if (status !== 'all' && scholarship.status !== status) return false;
      if (!needle) return true;
      return [
        scholarship.title,
        scholarship.organization ?? '',
        scholarship.requirements ?? '',
        ...scholarship.essayIds.map((id) => essayTitles.get(id) ?? ''),
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [scholarships, search, status, essayTitles]);

  function clearFilters() {
    setSearch('');
    setStatus('all');
  }

  async function remove(scholarship: Scholarship) {
    const result = await deleteScholarship(scholarship.id);
    if (result.ok) {
      notify('Scholarship removed.');
      router.refresh();
    } else {
      notify(result.error, 'error');
    }
  }

  const addButton = (
    <Dialog open={addOpen} onOpenChange={setAddOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus aria-hidden="true" />
          Add scholarship
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a scholarship</DialogTitle>
          <DialogDescription>
            Record it from the official source, and keep the link so you can check it again later.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <ScholarshipForm
            action={createScholarship}
            essays={essays}
            defaultTimeZone={timeZone}
            submitLabel="Add scholarship"
            onDone={() => {
              setAddOpen(false);
              notify('Scholarship added.');
              router.refresh();
            }}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );

  const sourceNotice = (
    <p className="border-line bg-surface-muted text-ink-muted rounded-[var(--radius-lg)] border px-4 py-3 text-xs">
      Scholarship listings change and close without notice. Amounts, deadlines and requirements you
      save here are a snapshot of what you saw on the day you saved it. Confirm the details on the
      official source before you rely on them.
    </p>
  );

  if (scholarships.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-end">{addButton}</div>
        {sourceNotice}
        <EmptyState
          icon={Award}
          title="No scholarships saved yet"
          description="Add one you have found — a local award, an employer programme, something your counsellor mentioned. Save the official link and the date you checked it, so you can re-check it later."
          action={addButton}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">{addButton}</div>

      {sourceNotice}

      <FilterBar>
        <SearchField
          id="scholarship-search"
          value={search}
          onChange={setSearch}
          label="Search scholarships"
          placeholder="Name, organisation or requirement"
        />
        <FilterSelect
          id="scholarship-status"
          label="Status"
          value={status}
          onChange={setStatus}
          allLabel="Any status"
          options={SCHOLARSHIP_STATUSES.map((value) => ({
            value,
            label: scholarshipStatusLabels[value],
          }))}
        />
      </FilterBar>

      <ActiveFilterNotice
        shown={filtered.length}
        total={scholarships.length}
        onClear={clearFilters}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Award}
          title="Nothing matches those filters"
          description="Try a different search term, or clear the filters to see your whole list again."
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((scholarship) => (
            <ScholarshipRow
              key={scholarship.id}
              scholarship={scholarship}
              essays={essays}
              essayTitles={essayTitles}
              timeZone={timeZone}
              onDelete={remove}
              onSaved={() => router.refresh()}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ScholarshipRow({
  scholarship,
  essays,
  essayTitles,
  timeZone,
  onDelete,
  onSaved,
}: {
  scholarship: Scholarship;
  essays: Essay[];
  essayTitles: Map<string, string>;
  timeZone: string;
  onDelete: (scholarship: Scholarship) => void;
  onSaved: () => void;
}) {
  const { notify } = useToast();
  const [editOpen, setEditOpen] = React.useState(false);

  const linkedEssays = scholarship.essayIds
    .map((id) => essayTitles.get(id))
    .filter((title): title is string => Boolean(title));

  return (
    <li className="border-line bg-surface rounded-[var(--radius-lg)] border px-4 py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-ink text-sm font-semibold">{scholarship.title}</h3>
          <p className="text-ink-muted mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            {scholarship.organization ? <span>{scholarship.organization}</span> : null}
            <span className="tabular-nums">{formatAmount(scholarship.amount)}</span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <ScholarshipStatusBadge status={scholarship.status} />

          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`Edit ${scholarship.title}`}
              >
                <Pencil aria-hidden="true" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit scholarship</DialogTitle>
                <DialogDescription>{scholarship.title}</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <ScholarshipForm
                  action={updateScholarship}
                  scholarship={scholarship}
                  essays={essays}
                  defaultTimeZone={timeZone}
                  submitLabel="Save changes"
                  onDone={() => {
                    setEditOpen(false);
                    notify('Scholarship updated.');
                    onSaved();
                  }}
                />
              </DialogBody>
            </DialogContent>
          </Dialog>

          <ConfirmDialog
            trigger={
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={`Delete ${scholarship.title}`}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </DialogTrigger>
            }
            title={`Remove ${scholarship.title}?`}
            description="This removes the saved listing, its requirements and your notes. Any tasks linked to it stay, without the link."
            confirmLabel="Remove"
            onConfirm={() => onDelete(scholarship)}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <DeadlineBadge dueAt={scholarship.deadlineAt} timeZone={scholarship.deadlineTimeZone} />
      </div>

      <p className="mt-2 text-xs">
        {scholarship.lastVerifiedAt ? (
          <span className="text-ink-muted">
            Last verified {formatDate(scholarship.lastVerifiedAt, timeZone)} — check the official
            source again if that was a while ago.
          </span>
        ) : (
          <span className="text-warning font-medium">
            Never verified. Confirm the deadline and requirements on the official source before you
            work on this.
          </span>
        )}
      </p>

      {scholarship.sourceUrl ? (
        <p className="mt-2">
          <a
            href={scholarship.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-text inline-flex items-center gap-1.5 text-xs underline underline-offset-4 hover:no-underline"
          >
            <ExternalLink className="size-3" aria-hidden="true" />
            Official source
            <span className="sr-only"> for {scholarship.title} (opens in a new tab)</span>
          </a>
        </p>
      ) : (
        <p className="text-ink-subtle mt-2 text-xs italic">
          No source link saved yet. Adding one makes it much easier to re-check.
        </p>
      )}

      {scholarship.requirements ? (
        <p className="text-ink mt-2.5 text-sm">{scholarship.requirements}</p>
      ) : null}

      {linkedEssays.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="text-ink-muted text-xs">Essays:</span>
          {linkedEssays.map((title) => (
            <Badge key={title} tone="neutral">
              {title}
            </Badge>
          ))}
        </div>
      ) : null}
    </li>
  );
}
