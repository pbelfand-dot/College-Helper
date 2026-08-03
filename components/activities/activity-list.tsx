'use client';

import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronUp,
  MessageSquareText,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { ActivityCoachPanel } from '@/components/coach/activity-coach-panel';
import { activityCategoryLabels } from '@/lib/domain/labels';
import { countCharacters } from '@/lib/domain/counting';
import { moveDown, moveUp, sortBySortOrder } from '@/lib/domain/ordering';
import { formatDate } from '@/lib/dates/format';
import type { Activity } from '@/lib/domain/types';
import { ActivityForm } from './activity-form';
import {
  createActivity,
  deleteActivity,
  reorderActivity,
  updateActivity,
} from '@/app/(app)/activities/actions';

/**
 * The activities list.
 *
 * Order matters to students, so moving an item updates the list immediately
 * using the same pure `moveUp`/`moveDown` helpers the server uses, then
 * persists. If the save fails we put the list back and say so.
 */
export function ActivityList({
  activities,
  timeZone,
}: {
  activities: Activity[];
  timeZone: string;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [addOpen, setAddOpen] = React.useState(false);
  const [movingId, setMovingId] = React.useState<string | null>(null);

  /**
   * `override` holds the order being previewed during a drag/move. It is
   * cleared the moment the server sends a fresh list, so the server always wins
   * once the save lands.
   */
  const [override, setOverride] = React.useState<Activity[] | null>(null);
  const [syncedFrom, setSyncedFrom] = React.useState(activities);
  if (syncedFrom !== activities) {
    setSyncedFrom(activities);
    setOverride(null);
  }

  const ordered = override ?? sortBySortOrder(activities);
  const setOrdered = setOverride;

  async function move(activityId: string, direction: 'up' | 'down') {
    const previous = ordered;
    const next = direction === 'up' ? moveUp(ordered, activityId) : moveDown(ordered, activityId);
    if (next === previous) return;

    setOrdered(next);
    setMovingId(activityId);
    const result = await reorderActivity(activityId, direction);
    setMovingId(null);

    if (result.ok) {
      router.refresh();
    } else {
      setOrdered(previous);
      notify(result.error, 'error');
    }
  }

  async function remove(activity: Activity) {
    const result = await deleteActivity(activity.id);
    if (result.ok) {
      notify('Activity removed.');
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
          Add activity
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add an activity</DialogTitle>
          <DialogDescription>
            Jobs, family responsibilities and things you quit all count. This list is about how you
            actually spend your time.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <ActivityForm
            action={createActivity}
            submitLabel="Add activity"
            onDone={() => {
              setAddOpen(false);
              notify('Activity added.');
              router.refresh();
            }}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );

  if (activities.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-end">{addButton}</div>
        <EmptyState
          icon={Sparkles}
          title="No activities yet"
          description="Add how you actually spend your time — clubs, a job, caring for a sibling, something you taught yourself. Order them the way you want them read."
          action={addButton}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-muted text-xs">
          Listed in your order. Most applications ask you to rank activities by what matters most to
          you — use the arrows to arrange them.
        </p>
        {addButton}
      </div>

      <ol className="flex flex-col gap-3">
        {ordered.map((activity, index) => (
          <ActivityRow
            key={activity.id}
            activity={activity}
            position={index + 1}
            isFirst={index === 0}
            isLast={index === ordered.length - 1}
            busy={movingId === activity.id}
            timeZone={timeZone}
            onMove={move}
            onDelete={remove}
            onSaved={() => router.refresh()}
          />
        ))}
      </ol>
    </div>
  );
}

function ActivityRow({
  activity,
  position,
  isFirst,
  isLast,
  busy,
  timeZone,
  onMove,
  onDelete,
  onSaved,
}: {
  activity: Activity;
  position: number;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  timeZone: string;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onDelete: (activity: Activity) => void;
  onSaved: () => void;
}) {
  const { notify } = useToast();
  const [editOpen, setEditOpen] = React.useState(false);
  const [coachOpen, setCoachOpen] = React.useState(false);

  const used = countCharacters(activity.description);
  const over = used > activity.descriptionLimit;

  return (
    <li className="border-line bg-surface rounded-[var(--radius-lg)] border px-4 py-3.5">
      <div className="flex gap-3">
        <div className="flex shrink-0 flex-col items-center gap-1">
          <span className="text-ink-subtle text-xs font-medium tabular-nums">{position}</span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={isFirst || busy}
            onClick={() => onMove(activity.id, 'up')}
            aria-label={`Move ${activity.organization} up`}
          >
            <ChevronUp aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={isLast || busy}
            onClick={() => onMove(activity.id, 'down')}
            aria-label={`Move ${activity.organization} down`}
          >
            <ChevronDown aria-hidden="true" />
          </Button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-ink text-sm font-semibold">{activity.organization}</h3>
              <p className="text-ink-muted mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                {activity.role ? <span>{activity.role}</span> : null}
                <Badge tone="neutral">{activityCategoryLabels[activity.category]}</Badge>
                {activity.hoursPerWeek !== null ? (
                  <span>
                    {activity.hoursPerWeek} hrs/week
                    {activity.weeksPerYear !== null ? `, ${activity.weeksPerYear} wks/yr` : ''}
                  </span>
                ) : null}
                {activity.startDate ? (
                  <span>
                    {formatDate(activity.startDate, timeZone)} –{' '}
                    {activity.continues
                      ? 'now'
                      : activity.endDate
                        ? formatDate(activity.endDate, timeZone)
                        : '—'}
                  </span>
                ) : null}
              </p>
            </div>

            <div className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCoachOpen(!coachOpen)}
                aria-expanded={coachOpen}
              >
                <MessageSquareText aria-hidden="true" />
                Coach
              </Button>

              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`Edit ${activity.organization}`}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Edit activity</DialogTitle>
                    <DialogDescription>{activity.organization}</DialogDescription>
                  </DialogHeader>
                  <DialogBody>
                    <ActivityForm
                      action={updateActivity}
                      activity={activity}
                      submitLabel="Save changes"
                      onDone={() => {
                        setEditOpen(false);
                        notify('Activity updated.');
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
                      aria-label={`Delete ${activity.organization}`}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </DialogTrigger>
                }
                title={`Delete ${activity.organization}?`}
                description="This removes the activity, its description and your private notes about it."
                onConfirm={() => onDelete(activity)}
              />
            </div>
          </div>

          {activity.description ? (
            <p className="text-ink mt-2 text-sm">{activity.description}</p>
          ) : (
            <p className="text-ink-subtle mt-2 text-sm italic">No description written yet.</p>
          )}

          <p
            className={
              over
                ? 'text-warning mt-1 text-xs font-medium'
                : 'text-ink-muted mt-1 text-xs tabular-nums'
            }
          >
            {used} / {activity.descriptionLimit} characters
            {over ? ` — ${used - activity.descriptionLimit} over the limit you set` : ''}
          </p>

          {coachOpen ? (
            <div className="border-line mt-4 border-t pt-4">
              <ActivityCoachPanel
                activityId={activity.id}
                descriptionLimit={activity.descriptionLimit}
              />
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}
