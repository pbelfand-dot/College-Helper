'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GraduationCap, MapPin, Plus } from 'lucide-react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ActiveFilterNotice,
  FilterBar,
  FilterSelect,
  SearchField,
} from '@/components/ui/filter-bar';
import { EmptyState } from '@/components/ui/states';
import { ListStatusBadge } from '@/components/ui/status-badge';
import { useToast } from '@/components/ui/toast';
import { listStatusLabels } from '@/lib/domain/labels';
import { LIST_STATUSES, type College, type ListStatus } from '@/lib/domain/types';
import { CollegeForm } from './college-form';
import { createCollege } from '@/app/(app)/colleges/actions';

/**
 * The saved college list.
 *
 * Filtering happens client-side over the already-loaded list: these are the
 * student's own saved colleges, so the whole set is small and instant filtering
 * beats a round trip.
 */
export function CollegeList({ colleges }: { colleges: College[] }) {
  const router = useRouter();
  const { notify } = useToast();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<ListStatus | 'all'>('all');
  const [tag, setTag] = React.useState<string | 'all'>('all');

  const allTags = React.useMemo(
    () => [...new Set(colleges.flatMap((college) => college.tags))].sort(),
    [colleges],
  );

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return colleges.filter((college) => {
      if (status !== 'all' && college.listStatus !== status) return false;
      if (tag !== 'all' && !college.tags.includes(tag)) return false;
      if (!needle) return true;
      return [
        college.name,
        college.city,
        college.stateOrRegion,
        college.country,
        ...college.majors,
        ...college.tags,
      ]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(needle));
    });
  }, [colleges, search, status, tag]);

  function clearFilters() {
    setSearch('');
    setStatus('all');
    setTag('all');
  }

  const addButton = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus aria-hidden="true" />
          Add college
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a college</DialogTitle>
          <DialogDescription>
            Only the name is required. Everything else you can fill in as you research.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <CollegeForm
            action={createCollege}
            submitLabel="Add to my list"
            onDone={(id) => {
              setOpen(false);
              notify('College added to your list.');
              router.push(`/colleges/${id}`);
            }}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );

  if (colleges.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-end">{addButton}</div>
        <EmptyState
          icon={GraduationCap}
          title="No colleges saved yet"
          description="Add the first college you are curious about. You can start with just a name and add notes, links and deadlines as you go."
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
            <Button onClick={() => setOpen(true)}>
              <Plus aria-hidden="true" />
              Add your first college
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
          id="college-search"
          value={search}
          onChange={setSearch}
          label="Search your list"
          placeholder="Name, city, major or tag"
        />
        <FilterSelect
          id="college-status"
          label="List status"
          value={status}
          onChange={setStatus}
          allLabel="Any status"
          options={LIST_STATUSES.map((value) => ({ value, label: listStatusLabels[value] }))}
        />
        {allTags.length > 0 ? (
          <FilterSelect
            id="college-tag"
            label="Tag"
            value={tag}
            onChange={setTag}
            allLabel="Any tag"
            options={allTags.map((value) => ({ value, label: value }))}
          />
        ) : null}
      </FilterBar>

      <ActiveFilterNotice shown={filtered.length} total={colleges.length} onClear={clearFilters} />

      {filtered.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Nothing matches those filters"
          description="Try a different search term, or clear the filters to see your whole list again."
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((college) => (
            <li key={college.id}>
              <Link
                href={`/colleges/${college.id}`}
                className="border-line bg-surface hover:border-line-strong flex h-full flex-col gap-2.5 rounded-[var(--radius-lg)] border px-4 py-4 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-ink text-sm font-semibold">{college.name}</h3>
                  <ListStatusBadge status={college.listStatus} />
                </div>

                {college.city || college.stateOrRegion ? (
                  <p className="text-ink-muted flex items-center gap-1.5 text-xs">
                    <MapPin className="size-3" aria-hidden="true" />
                    {[college.city, college.stateOrRegion].filter(Boolean).join(', ')}
                  </p>
                ) : null}

                {college.fitNotes ? (
                  <p className="text-ink-muted line-clamp-2 text-xs">{college.fitNotes}</p>
                ) : (
                  <p className="text-ink-subtle text-xs italic">No notes yet</p>
                )}

                {college.tags.length > 0 ? (
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                    {college.tags.slice(0, 4).map((item) => (
                      <Badge key={item} tone="neutral">
                        {item}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
