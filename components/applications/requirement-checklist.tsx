'use client';

import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import * as React from 'react';
import { useRouter } from 'next/navigation';
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
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { ProgressBar } from '@/components/ui/progress-bar';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { requirementStatusLabels, requirementTypeLabels } from '@/lib/domain/labels';
import { calculateChecklistCompletion } from '@/lib/domain/progress';
import { formatDate } from '@/lib/dates/format';
import {
  REQUIREMENT_STATUSES,
  REQUIREMENT_TYPES,
  type Requirement,
  type RequirementStatus,
} from '@/lib/domain/types';
import { cn } from '@/lib/utils/cn';
import {
  createRequirement,
  deleteRequirement,
  setRequirementStatus,
} from '@/app/(app)/applications/actions';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { ActionResult } from '@/lib/utils/result';

/**
 * The requirement checklist.
 *
 * This is where ApplyPilot's progress number comes from, and the component is
 * built so a student can see exactly that: the bar, the fraction, and the rows
 * being counted are all on screen together. Items marked "not needed" are
 * visibly excluded from the count rather than silently dropped.
 */
export function RequirementChecklist({
  applicationId,
  requirements,
  timeZone,
}: {
  applicationId: string;
  requirements: Requirement[];
  timeZone: string;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [addOpen, setAddOpen] = React.useState(false);

  /**
   * Ticking a box flips it immediately rather than waiting for the round trip.
   * If the save fails, the optimistic value is discarded automatically when the
   * transition ends and the server data wins, and we surface the error.
   */
  const [optimistic, applyOptimistic] = React.useOptimistic(
    requirements,
    (current, update: { id: string; status: RequirementStatus }) =>
      current.map((item) => (item.id === update.id ? { ...item, status: update.status } : item)),
  );

  const completion = calculateChecklistCompletion(optimistic);

  function toggle(requirement: Requirement, nextStatus: RequirementStatus) {
    React.startTransition(async () => {
      applyOptimistic({ id: requirement.id, status: nextStatus });
      const result = await setRequirementStatus(requirement.id, nextStatus);
      if (result.ok) router.refresh();
      else notify(result.error, 'error');
    });
  }

  async function remove(requirement: Requirement) {
    const result = await deleteRequirement(requirement.id);
    if (result.ok) {
      notify('Requirement removed.');
      router.refresh();
    } else {
      notify(result.error, 'error');
    }
  }

  const addButton = (
    <Dialog open={addOpen} onOpenChange={setAddOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <Plus aria-hidden="true" />
          Add requirement
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a requirement</DialogTitle>
          <DialogDescription>
            Add what this college actually asks for, from their own site. Requirements differ
            between colleges and change between years.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <RequirementForm
            applicationId={applicationId}
            onDone={() => {
              setAddOpen(false);
              notify('Requirement added.');
              router.refresh();
            }}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );

  return (
    <section className="flex flex-col gap-4" aria-labelledby="checklist-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="checklist-heading" className="text-ink text-base font-semibold">
            Requirement checklist
          </h2>
          <p className="text-ink-muted mt-0.5 max-w-prose text-xs">
            You control this list. Confirm each item on the college&rsquo;s own site — requirements
            differ between colleges and change between years. Progress below is completed required
            items divided by total required items, and nothing else goes into it.
          </p>
        </div>
        {addButton}
      </div>

      <div className="border-line bg-surface rounded-[var(--radius-lg)] border px-4 py-3.5">
        <ProgressBar
          percent={completion.percent}
          completed={completion.completed}
          total={completion.total}
        />
      </div>

      {requirements.length === 0 ? (
        <EmptyState
          title="No requirements yet"
          description="Open the college's admissions page and add what they ask for. Each item you add becomes part of this application's checklist."
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
              Add the first requirement
            </Button>
          }
        />
      ) : (
        <ul className="divide-line border-line bg-surface divide-y overflow-hidden rounded-[var(--radius-lg)] border">
          {optimistic.map((requirement) => {
            const complete = requirement.status === 'complete';
            const excluded = requirement.status === 'not-needed' || !requirement.required;

            return (
              <li key={requirement.id} className="flex items-start gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  id={`requirement-${requirement.id}`}
                  checked={complete}
                  onChange={(event) =>
                    toggle(requirement, event.target.checked ? 'complete' : 'not-started')
                  }
                  className="mt-1 size-4 shrink-0 cursor-pointer accent-[hsl(var(--ap-accent))] disabled:cursor-wait"
                />

                <div className="min-w-0 flex-1">
                  <label
                    htmlFor={`requirement-${requirement.id}`}
                    className={cn(
                      'cursor-pointer text-sm font-medium',
                      complete ? 'text-ink-muted line-through' : 'text-ink',
                    )}
                  >
                    {requirement.title}
                  </label>

                  <p className="text-ink-muted mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                    <span>{requirementTypeLabels[requirement.type]}</span>
                    {requirement.required ? null : <span>· Optional</span>}
                    {excluded ? <span>· not counted in progress</span> : null}
                    {requirement.dueAt ? (
                      <span>· due {formatDate(requirement.dueAt, timeZone)}</span>
                    ) : null}
                  </p>

                  {requirement.description ? (
                    <p className="text-ink-muted mt-1 text-xs">{requirement.description}</p>
                  ) : null}

                  {requirement.sourceUrl ? (
                    <a
                      href={requirement.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-text mt-1 inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
                    >
                      Source
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </a>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <label className="sr-only" htmlFor={`status-${requirement.id}`}>
                    Status for {requirement.title}
                  </label>
                  <Select
                    id={`status-${requirement.id}`}
                    value={requirement.status}
                    onChange={(event) =>
                      toggle(requirement, event.target.value as RequirementStatus)
                    }
                    className="h-8 w-36 text-xs"
                  >
                    {REQUIREMENT_STATUSES.map((value) => (
                      <option key={value} value={value}>
                        {requirementStatusLabels[value]}
                      </option>
                    ))}
                  </Select>

                  <ConfirmDialog
                    trigger={
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label={`Delete requirement: ${requirement.title}`}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </DialogTrigger>
                    }
                    title="Delete this requirement?"
                    description={
                      <>
                        <strong>{requirement.title}</strong> will be removed from this
                        application&rsquo;s checklist. This does not affect any essay or recommender
                        linked to the application.
                      </>
                    }
                    onConfirm={() => remove(requirement)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function RequirementForm({ applicationId, onDone }: { applicationId: string; onDone: () => void }) {
  const [state, formAction] = useActionState(
    async (previous: ActionResult<{ id: string }> | null, formData: FormData) => {
      const result = await createRequirement(previous, formData);
      if (result.ok) onDone();
      return result;
    },
    null,
  );

  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="applicationId" value={applicationId} />

      {state && !state.ok ? <ErrorState title="Could not add" description={state.error} /> : null}

      <Field id="requirement-title" label="What is required?" required error={errors?.title}>
        {(props) => (
          <Input {...props} name="title" placeholder="Supplemental essay about your community" />
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="requirement-type" label="Type" error={errors?.type}>
          {(props) => (
            <Select {...props} name="type" defaultValue="other">
              {REQUIREMENT_TYPES.map((value) => (
                <option key={value} value={value}>
                  {requirementTypeLabels[value]}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field id="requirement-dueAt" label="Due date" error={errors?.dueAt}>
          {(props) => <Input {...props} name="dueAt" type="date" />}
        </Field>
      </div>

      <Field
        id="requirement-description"
        label="Notes"
        description="Anything you want to remember about this item."
        error={errors?.description}
      >
        {(props) => <Textarea {...props} name="description" rows={2} />}
      </Field>

      <Field
        id="requirement-sourceUrl"
        label="Where you found this"
        description="A link to the official page, so you can re-check it later."
        error={errors?.sourceUrl}
      >
        {(props) => <Input {...props} name="sourceUrl" type="url" placeholder="https://…" />}
      </Field>

      <label className="text-ink flex items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          name="required"
          defaultChecked
          className="size-4 accent-[hsl(var(--ap-accent))]"
        />
        This is required (counts towards checklist completion)
      </label>

      <AddButton />
    </form>
  );
}

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} className="sm:self-start">
      Add requirement
    </Button>
  );
}
