'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Field, FieldSet } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/states';
import { TimeZoneField } from '@/components/ui/time-zone-field';
import { scholarshipStatusLabels } from '@/lib/domain/labels';
import { SCHOLARSHIP_STATUSES, type Essay, type Scholarship } from '@/lib/domain/types';
import { toDateInputValue, toDateTimeLocalValue } from '@/lib/dates/format';
import type { ActionResult } from '@/lib/utils/result';

type ScholarshipAction = (
  previous: ActionResult<{ id: string }> | null,
  formData: FormData,
) => Promise<ActionResult<{ id: string }>>;

/**
 * Create/edit form for a scholarship.
 *
 * The source link and the "last verified" date are first-class fields, because
 * scholarship listings change and close without notice and the only reliable
 * answer is the official page on the day you look at it.
 */
export function ScholarshipForm({
  action,
  scholarship,
  essays,
  defaultTimeZone,
  onDone,
  submitLabel = 'Save scholarship',
}: {
  action: ScholarshipAction;
  scholarship?: Scholarship;
  essays: Essay[];
  defaultTimeZone: string;
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
  const deadlineTimeZone = scholarship?.deadlineTimeZone ?? defaultTimeZone;
  const linkedEssayIds = new Set(scholarship?.essayIds ?? []);

  return (
    <form action={formAction} className="flex flex-col gap-7">
      {scholarship ? <input type="hidden" name="scholarshipId" value={scholarship.id} /> : null}

      {state && !state.ok ? <ErrorState title="Could not save" description={state.error} /> : null}

      <FieldSet legend="The scholarship">
        <Field id="scholarship-title" label="Name" required error={errors?.title}>
          {(props) => (
            <Input
              {...props}
              name="title"
              defaultValue={scholarship?.title}
              placeholder="Regional Watershed Studies Award"
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="scholarship-organization" label="Organisation" error={errors?.organization}>
            {(props) => (
              <Input
                {...props}
                name="organization"
                defaultValue={scholarship?.organization ?? ''}
                placeholder="County Water Programme"
              />
            )}
          </Field>

          <Field
            id="scholarship-amount"
            label="Amount"
            description="As listed on the official source. Leave blank if it is not stated."
            error={errors?.amount}
          >
            {(props) => (
              <Input
                {...props}
                name="amount"
                inputMode="decimal"
                placeholder="2500"
                defaultValue={scholarship?.amount ?? ''}
              />
            )}
          </Field>
        </div>

        <Field id="scholarship-status" label="Status" error={errors?.status}>
          {(props) => (
            <Select {...props} name="status" defaultValue={scholarship?.status ?? 'researching'}>
              {SCHOLARSHIP_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {scholarshipStatusLabels[value]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </FieldSet>

      <FieldSet
        legend="Deadline"
        description="Enter the deadline exactly as the organisation states it, in the zone they state it in."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="scholarship-deadlineAt" label="Deadline" error={errors?.deadlineAt}>
            {(props) => (
              <Input
                {...props}
                name="deadlineAt"
                type="datetime-local"
                defaultValue={toDateTimeLocalValue(
                  scholarship?.deadlineAt ?? null,
                  deadlineTimeZone,
                )}
              />
            )}
          </Field>

          <TimeZoneField
            id="scholarship-deadlineTimeZone"
            name="deadlineTimeZone"
            label="Deadline time zone"
            description="Which zone the deadline is stated in — not necessarily yours."
            defaultValue={deadlineTimeZone}
            error={errors?.deadlineTimeZone}
          />
        </div>
      </FieldSet>

      <FieldSet
        legend="Checking the source"
        description="Scholarship listings change and close without notice. Keep the official link here and record the day you last checked it."
      >
        <Field
          id="scholarship-sourceUrl"
          label="Official source link"
          description="The organisation's own page, not a listing site."
          error={errors?.sourceUrl}
        >
          {(props) => (
            <Input
              {...props}
              name="sourceUrl"
              type="url"
              inputMode="url"
              placeholder="https://…"
              defaultValue={scholarship?.sourceUrl ?? ''}
            />
          )}
        </Field>

        <Field
          id="scholarship-lastVerifiedAt"
          label="Last verified"
          description="The day you last confirmed the deadline and the requirements on that page."
          error={errors?.lastVerifiedAt}
        >
          {(props) => (
            <Input
              {...props}
              name="lastVerifiedAt"
              type="date"
              defaultValue={toDateInputValue(scholarship?.lastVerifiedAt ?? null, defaultTimeZone)}
            />
          )}
        </Field>
      </FieldSet>

      <FieldSet legend="What it asks for">
        <Field
          id="scholarship-requirements"
          label="Requirements"
          description="Copy them from the official source, in their words."
          error={errors?.requirements}
        >
          {(props) => (
            <Textarea
              {...props}
              name="requirements"
              rows={3}
              defaultValue={scholarship?.requirements ?? ''}
            />
          )}
        </Field>

        <div className="flex flex-col gap-2">
          <p className="text-ink text-sm font-medium">Essays you plan to use</p>
          {errors?.essayIds ? (
            <p className="text-danger text-xs font-medium" role="alert">
              {errors.essayIds.join(' ')}
            </p>
          ) : null}
          {essays.length === 0 ? (
            <p className="text-ink-muted text-xs">
              You have no essays yet. You can create one on the Essays page and come back to link
              it.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {essays.map((essay) => (
                <li key={essay.id}>
                  <label className="text-ink flex items-center gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      name="essayIds"
                      value={essay.id}
                      defaultChecked={linkedEssayIds.has(essay.id)}
                      className="size-4 accent-[hsl(var(--ap-accent))]"
                    />
                    {essay.title}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </FieldSet>

      <Field
        id="scholarship-notes"
        label="Your notes"
        description="Where you found it, who to ask, anything you still need to confirm."
        error={errors?.notes}
      >
        {(props) => (
          <Textarea {...props} name="notes" rows={3} defaultValue={scholarship?.notes ?? ''} />
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
