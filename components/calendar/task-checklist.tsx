'use client';

import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { taskCategoryLabels } from '@/lib/domain/labels';
import { formatAllDayDeadline } from '@/lib/dates/format';
import type { Application, College, Essay, Scholarship, Task } from '@/lib/domain/types';
import { cn } from '@/lib/utils/cn';
import { TaskForm } from './task-form';
import { deleteTask, setTaskCompletion, updateTask } from '@/app/(app)/calendar/actions';

/**
 * The student's own task list.
 *
 * Completing a task flips optimistically so the tick feels immediate; the
 * server result then wins. Completed tasks stay visible under a toggle rather
 * than vanishing, because "what did I already do" is a real question.
 */
export function TaskChecklist({
  tasks,
  applications,
  colleges,
  essays,
  scholarships,
  timeZone,
}: {
  tasks: Task[];
  applications: Application[];
  colleges: College[];
  essays: Essay[];
  scholarships: Scholarship[];
  timeZone: string;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [showCompleted, setShowCompleted] = React.useState(false);

  const [optimistic, applyOptimistic] = React.useOptimistic(
    tasks,
    (current, update: { id: string; completed: boolean }) =>
      current.map((task) =>
        task.id === update.id
          ? { ...task, completedAt: update.completed ? new Date().toISOString() : null }
          : task,
      ),
  );

  /**
   * Tasks ticked off in this session stay on screen, struck through, even when
   * finished tasks are hidden. A row vanishing the instant you tick it removes
   * the only confirmation that the tick worked — and makes an accidental tick
   * hard to undo.
   */
  const [justToggled, setJustToggled] = React.useState<Set<string>>(new Set());

  const open = optimistic.filter((task) => task.completedAt === null);
  const done = optimistic.filter((task) => task.completedAt !== null);
  const shown = showCompleted
    ? [...open, ...done]
    : [...open, ...done.filter((task) => justToggled.has(task.id))];

  function toggle(task: Task, completed: boolean) {
    setJustToggled((current) => new Set(current).add(task.id));
    React.startTransition(async () => {
      applyOptimistic({ id: task.id, completed });
      const result = await setTaskCompletion(task.id, completed);
      if (result.ok) router.refresh();
      else notify(result.error, 'error');
    });
  }

  async function remove(task: Task) {
    const result = await deleteTask(task.id);
    if (result.ok) {
      notify('Task deleted.');
      router.refresh();
    } else {
      notify(result.error, 'error');
    }
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="tasks-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="tasks-heading" className="text-ink text-base font-semibold">
            Your tasks
          </h2>
          <p className="text-ink-muted mt-0.5 text-xs">
            {open.length} open, {done.length} finished.
          </p>
        </div>
        <label className="text-ink flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(event) => setShowCompleted(event.target.checked)}
            className="size-3.5 accent-[hsl(var(--ap-accent))]"
          />
          Show finished tasks
        </label>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          title={open.length === 0 && done.length > 0 ? 'Everything is done' : 'No tasks yet'}
          description={
            open.length === 0 && done.length > 0
              ? 'Nothing open right now. Tick the box above to see what you have finished.'
              : 'Add a task for anything that is not already a deadline — an email to send, a question to ask, a form to start.'
          }
        />
      ) : (
        <ul className="divide-line border-line bg-surface divide-y overflow-hidden rounded-[var(--radius-lg)] border">
          {shown.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              applications={applications}
              colleges={colleges}
              essays={essays}
              scholarships={scholarships}
              timeZone={timeZone}
              onToggle={toggle}
              onDelete={remove}
              onSaved={() => router.refresh()}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function TaskRow({
  task,
  applications,
  colleges,
  essays,
  scholarships,
  timeZone,
  onToggle,
  onDelete,
  onSaved,
}: {
  task: Task;
  applications: Application[];
  colleges: College[];
  essays: Essay[];
  scholarships: Scholarship[];
  timeZone: string;
  onToggle: (task: Task, completed: boolean) => void;
  onDelete: (task: Task) => void;
  onSaved: () => void;
}) {
  const { notify } = useToast();
  const [editOpen, setEditOpen] = React.useState(false);
  const completed = task.completedAt !== null;

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <input
        type="checkbox"
        id={`task-${task.id}`}
        checked={completed}
        onChange={(event) => onToggle(task, event.target.checked)}
        className="mt-1 size-4 shrink-0 cursor-pointer accent-[hsl(var(--ap-accent))]"
      />

      <div className="min-w-0 flex-1">
        <label
          htmlFor={`task-${task.id}`}
          className={cn(
            'cursor-pointer text-sm font-medium',
            completed ? 'text-ink-muted line-through' : 'text-ink',
          )}
        >
          {task.title}
        </label>

        <p className="text-ink-muted mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          <Badge tone="neutral">{taskCategoryLabels[task.category]}</Badge>
          {task.dueAt ? (
            <span>{formatAllDayDeadline(task.dueAt, task.timeZone || timeZone)}</span>
          ) : null}
          {task.priority === 'high' && !completed ? (
            <span className="text-warning">High priority</span>
          ) : null}
        </p>

        {task.description ? (
          <p className="text-ink-muted mt-1 text-xs">{task.description}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 gap-1">
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={`Edit task: ${task.title}`}
            >
              <Pencil aria-hidden="true" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit task</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <TaskForm
                action={updateTask}
                task={task}
                applications={applications}
                colleges={colleges}
                essays={essays}
                scholarships={scholarships}
                defaultTimeZone={timeZone}
                submitLabel="Save changes"
                onDone={() => {
                  setEditOpen(false);
                  notify('Task updated.');
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
                aria-label={`Delete task: ${task.title}`}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </DialogTrigger>
          }
          title="Delete this task?"
          description={
            <>
              <strong>{task.title}</strong> will be removed from your calendar and dashboard.
            </>
          }
          onConfirm={() => onDelete(task)}
        />
      </div>
    </li>
  );
}
