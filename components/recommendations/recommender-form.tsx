'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Field, FieldSet } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/states';
import { recommenderStatusLabels, thankYouStatusLabels } from '@/lib/domain/labels';
import { RECOMMENDER_STATUSES, THANK_YOU_STATUSES, type Recommender } from '@/lib/domain/types';
import { toDateInputValue } from '@/lib/dates/format';
import type { ActionResult } from '@/lib/utils/result';

type RecommenderAction = (
  previous: ActionResult<{ id: string }> | null,
  formData: FormData,
) => Promise<ActionResult<{ id: string }>>;

/**
 * Create/edit form for a recommender.
 *
 * There is deliberately no field for the letter. ApplyPilot records that you
 * asked, when it is due, and whether you have thanked them — nothing about what
 * the recommender wrote.
 */
export function RecommenderForm({
  action,
  recommender,
  timeZone,
  onDone,
  submitLabel = 'Save recommender',
}: {
  action: RecommenderAction;
  recommender?: Recommender;
  timeZone: string;
  onDone?: (id: string) => void;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(
    async (previous: ActionResult<{ id: string }> | null, formData: FormData) => {
      const result = await action(previous, formData);
      if (result.ok && onDone) onDone(result.data.id);
      return result;
    },
    null,
  );

  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-7">
      {recommender ? <input type="hidden" name="recommenderId" value={recommender.id} /> : null}

      {state && !state.ok ? <ErrorState title="Could not save" description={state.error} /> : null}

      <p className="border-line bg-surface-muted text-ink-muted rounded-[var(--radius-lg)] border px-4 py-3 text-xs">
        ApplyPilot never stores the letter itself. Recommendation letters are confidential between
        the recommender and the college. Only the request is tracked here: who you asked, when it is
        due, and whether you have said thank you.
      </p>

      <FieldSet legend="Who you asked">
        <Field id="recommender-name" label="Name" required error={errors?.name}>
          {(props) => (
            <Input
              {...props}
              name="name"
              defaultValue={recommender?.name}
              placeholder="Ms. Okafor"
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="recommender-role" label="Role" error={errors?.role}>
            {(props) => (
              <Input
                {...props}
                name="role"
                defaultValue={recommender?.role ?? ''}
                placeholder="Teacher, counsellor, supervisor"
              />
            )}
          </Field>

          <Field
            id="recommender-organizationOrSubject"
            label="Subject or organisation"
            error={errors?.organizationOrSubject}
          >
            {(props) => (
              <Input
                {...props}
                name="organizationOrSubject"
                defaultValue={recommender?.organizationOrSubject ?? ''}
                placeholder="AP Environmental Science"
              />
            )}
          </Field>
        </div>

        <Field
          id="recommender-email"
          label="Email"
          description="Optional. ApplyPilot does not contact anyone — this is only here if it helps you keep track. You can leave it blank."
          error={errors?.email}
        >
          {(props) => (
            <Input
              {...props}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="off"
              defaultValue={recommender?.email ?? ''}
            />
          )}
        </Field>
      </FieldSet>

      <FieldSet legend="Where the request stands">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="recommender-status" label="Status" error={errors?.status}>
            {(props) => (
              <Select {...props} name="status" defaultValue={recommender?.status ?? 'not-asked'}>
                {RECOMMENDER_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {recommenderStatusLabels[value]}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            id="recommender-thankYouStatus"
            label="Thank you"
            description="Worth tracking. Someone spent their own time on this."
            error={errors?.thankYouStatus}
          >
            {(props) => (
              <Select
                {...props}
                name="thankYouStatus"
                defaultValue={recommender?.thankYouStatus ?? 'not-sent'}
              >
                {THANK_YOU_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {thankYouStatusLabels[value]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            id="recommender-dateRequested"
            label="Date you asked"
            error={errors?.dateRequested}
          >
            {(props) => (
              <Input
                {...props}
                name="dateRequested"
                type="date"
                defaultValue={toDateInputValue(recommender?.dateRequested ?? null, timeZone)}
              />
            )}
          </Field>

          <Field
            id="recommender-dueAt"
            label="Due date"
            description="Copy this from the college's own instructions."
            error={errors?.dueAt}
          >
            {(props) => (
              <Input
                {...props}
                name="dueAt"
                type="date"
                defaultValue={toDateInputValue(recommender?.dueAt ?? null, timeZone)}
              />
            )}
          </Field>

          <Field
            id="recommender-followUpAt"
            label="Follow up on"
            description="One reminder to check in politely."
            error={errors?.followUpAt}
          >
            {(props) => (
              <Input
                {...props}
                name="followUpAt"
                type="date"
                defaultValue={toDateInputValue(recommender?.followUpAt ?? null, timeZone)}
              />
            )}
          </Field>
        </div>
      </FieldSet>

      <Field
        id="recommender-notes"
        label="Your notes"
        description="What you gave them, what they asked for, what you agreed. For you only."
        error={errors?.notes}
      >
        {(props) => (
          <Textarea {...props} name="notes" rows={3} defaultValue={recommender?.notes ?? ''} />
        )}
      </Field>

      <SubmitButton label={submitLabel} />
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} className="sm:self-start">
      {label}
    </Button>
  );
}
