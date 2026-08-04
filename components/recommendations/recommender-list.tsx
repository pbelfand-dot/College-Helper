'use client';

import { useRouter } from 'next/navigation';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
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
import { RecommenderStatusBadge } from '@/components/ui/status-badge';
import { useToast } from '@/components/ui/toast';
import { recommenderStatusLabels, thankYouStatusLabels } from '@/lib/domain/labels';
import { formatDate } from '@/lib/dates/format';
import {
  RECOMMENDER_STATUSES,
  type Application,
  type College,
  type Recommender,
  type RecommenderStatus,
} from '@/lib/domain/types';
import { RecommenderForm } from './recommender-form';
import {
  createRecommender,
  deleteRecommender,
  updateRecommender,
} from '@/app/(app)/recommendations/actions';

/** Just the two ids: the link table carries nothing else the browser needs. */
export interface RecommenderLink {
  applicationId: string;
  recommenderId: string;
}

/**
 * The recommenders list.
 *
 * Each card shows the state of a request and which colleges it is attached to.
 * There is nowhere to put the letter, by design — it stays between the
 * recommender and the college.
 */
export function RecommenderList({
  recommenders,
  links,
  applications,
  colleges,
  timeZone,
}: {
  recommenders: Recommender[];
  links: RecommenderLink[];
  applications: Application[];
  colleges: College[];
  timeZone: string;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [addOpen, setAddOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<RecommenderStatus | 'all'>('all');

  /** recommenderId -> the college names this recommender is linked to. */
  const linkedColleges = React.useMemo(() => {
    const collegeNames = new Map(colleges.map((college) => [college.id, college.name]));
    const applicationColleges = new Map(
      applications.map((application) => [
        application.id,
        collegeNames.get(application.collegeId) ?? 'An application',
      ]),
    );

    const result = new Map<string, string[]>();
    for (const link of links) {
      const name = applicationColleges.get(link.applicationId);
      if (!name) continue;
      const existing = result.get(link.recommenderId) ?? [];
      if (!existing.includes(name)) existing.push(name);
      result.set(link.recommenderId, existing);
    }
    return result;
  }, [links, applications, colleges]);

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return recommenders.filter((recommender) => {
      if (status !== 'all' && recommender.status !== status) return false;
      if (!needle) return true;
      return [
        recommender.name,
        recommender.role ?? '',
        recommender.organizationOrSubject ?? '',
        ...(linkedColleges.get(recommender.id) ?? []),
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [recommenders, search, status, linkedColleges]);

  function clearFilters() {
    setSearch('');
    setStatus('all');
  }

  async function remove(recommender: Recommender) {
    const result = await deleteRecommender(recommender.id);
    if (result.ok) {
      notify('Recommender removed.');
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
          Add recommender
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a recommender</DialogTitle>
          <DialogDescription>
            A teacher, counsellor, coach or supervisor you plan to ask. Only the name is required.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <RecommenderForm
            action={createRecommender}
            timeZone={timeZone}
            submitLabel="Add recommender"
            onDone={() => {
              setAddOpen(false);
              notify('Recommender added.');
              router.refresh();
            }}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );

  if (recommenders.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-end">{addButton}</div>
        <EmptyState
          icon={Users}
          title="No recommenders yet"
          description="Add the people you plan to ask — a teacher who knows your work, a counsellor, a supervisor. Then record when you asked and when each letter is due, and link them to applications from the application page."
          action={
            /*
             * A plain button, not a second copy of the dialog above.
             *
             * Rendering one `<Dialog>` element in two places does not share it:
             * React mounts two, both read the same `open` state, so both open at
             * once. Two modals then stack with duplicate field ids, and each one
             * marks everything outside itself `aria-hidden` — between them that
             * covers the whole document, including the other dialog. The empty
             * state is exactly where a new student starts, so this was the first
             * thing a screen reader would fail to announce.
             */
            <Button onClick={() => setAddOpen(true)}>
              <Plus aria-hidden="true" />
              Add your first recommender
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">{addButton}</div>

      <FilterBar>
        <SearchField
          id="recommender-search"
          value={search}
          onChange={setSearch}
          label="Search recommenders"
          placeholder="Name, subject or college"
        />
        <FilterSelect
          id="recommender-status"
          label="Status"
          value={status}
          onChange={setStatus}
          allLabel="Any status"
          options={RECOMMENDER_STATUSES.map((value) => ({
            value,
            label: recommenderStatusLabels[value],
          }))}
        />
      </FilterBar>

      <ActiveFilterNotice
        shown={filtered.length}
        total={recommenders.length}
        onClear={clearFilters}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nothing matches those filters"
          description="Try a different search term, or clear the filters to see everyone again."
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((recommender) => (
            <RecommenderCard
              key={recommender.id}
              recommender={recommender}
              collegeNames={linkedColleges.get(recommender.id) ?? []}
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

function RecommenderCard({
  recommender,
  collegeNames,
  timeZone,
  onDelete,
  onSaved,
}: {
  recommender: Recommender;
  collegeNames: string[];
  timeZone: string;
  onDelete: (recommender: Recommender) => void;
  onSaved: () => void;
}) {
  const { notify } = useToast();
  const [editOpen, setEditOpen] = React.useState(false);

  const subtitle = [recommender.role, recommender.organizationOrSubject]
    .filter((value): value is string => Boolean(value))
    .join(' · ');

  return (
    <li className="border-line bg-surface rounded-[var(--radius-lg)] border px-4 py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-ink text-sm font-semibold">{recommender.name}</h3>
          {subtitle ? <p className="text-ink-muted mt-0.5 text-xs">{subtitle}</p> : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <RecommenderStatusBadge status={recommender.status} />

          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`Edit ${recommender.name}`}
              >
                <Pencil aria-hidden="true" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit recommender</DialogTitle>
                <DialogDescription>{recommender.name}</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <RecommenderForm
                  action={updateRecommender}
                  recommender={recommender}
                  timeZone={timeZone}
                  submitLabel="Save changes"
                  onDone={() => {
                    setEditOpen(false);
                    notify('Recommender updated.');
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
                  aria-label={`Delete ${recommender.name}`}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </DialogTrigger>
            }
            title={`Remove ${recommender.name}?`}
            description="This removes the request record and your notes about it, and unlinks them from your applications. It does not contact anyone."
            confirmLabel="Remove"
            onConfirm={() => onDelete(recommender)}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <DeadlineBadge dueAt={recommender.dueAt} timeZone={timeZone} allDay />
        <Badge tone={recommender.thankYouStatus === 'sent' ? 'success' : 'neutral'}>
          Thank you: {thankYouStatusLabels[recommender.thankYouStatus]}
        </Badge>
      </div>

      <p className="text-ink-muted mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span>
          {recommender.dateRequested
            ? `Asked ${formatDate(recommender.dateRequested, timeZone)}`
            : 'No request date recorded'}
        </span>
        {recommender.followUpAt ? (
          <span>Follow up {formatDate(recommender.followUpAt, timeZone)}</span>
        ) : null}
      </p>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className="text-ink-muted text-xs">Linked to:</span>
        {collegeNames.length === 0 ? (
          <span className="text-ink-subtle text-xs italic">
            Not linked to an application yet — you can link them on an application page.
          </span>
        ) : (
          collegeNames.map((name) => (
            <Badge key={name} tone="neutral">
              {name}
            </Badge>
          ))
        )}
      </div>

      {recommender.notes ? <p className="text-ink mt-2.5 text-sm">{recommender.notes}</p> : null}
    </li>
  );
}
