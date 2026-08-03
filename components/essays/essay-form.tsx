'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Field, FieldSet } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/states';
import { essayStatusLabels } from '@/lib/domain/labels';
import {
  ESSAY_STATUSES,
  LIMIT_TYPES,
  type Application,
  type College,
  type Essay,
  type LimitType,
} from '@/lib/domain/types';
import { toDateInputValue } from '@/lib/dates/format';
import type { ActionResult } from '@/lib/utils/result';

type EssayAction = (
  previous: ActionResult<{ id: string }> | null,
  formData: FormData,
) => Promise<ActionResult<{ id: string }>>;

/**
 * Essay settings: prompt, limit, links and status.
 *
 * The limit is entered by the student rather than inferred, because the actual
 * limits set by application platforms change and ApplyPilot has no business
 * asserting this year's number.
 */
export function EssayForm({
  action,
  essay,
  colleges,
  applications,
  timeZone,
  onDone,
  submitLabel = 'Save essay',
}: {
  action: EssayAction;
  essay?: Essay;
  colleges: College[];
  applications: Application[];
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

  const [limitType, setLimitType] = useState<LimitType>(essay?.limitType ?? 'words');
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  const collegeNames = new Map(colleges.map((college) => [college.id, college.name]));

  return (
    <form action={formAction} className="flex flex-col gap-7">
      {essay ? <input type="hidden" name="essayId" value={essay.id} /> : null}

      {state && !state.ok ? <ErrorState title="Could not save" description={state.error} /> : null}

      <FieldSet legend="The essay">
        <Field id="essay-title" label="Title" required error={errors?.title}>
          {(props) => (
            <Input
              {...props}
              name="title"
              defaultValue={essay?.title}
              placeholder="Personal statement"
            />
          )}
        </Field>

        <Field
          id="essay-prompt"
          label="Prompt"
          description="Paste the prompt exactly as the college words it. Check it against the official site — prompts change between years."
          error={errors?.prompt}
        >
          {(props) => (
            <Textarea {...props} name="prompt" rows={3} defaultValue={essay?.prompt ?? ''} />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="essay-limitType" label="Limit type" error={errors?.limitType}>
            {(props) => (
              <Select
                {...props}
                name="limitType"
                value={limitType}
                onChange={(event) => setLimitType(event.target.value as LimitType)}
              >
                {LIMIT_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {value === 'none' ? 'No limit' : value === 'words' ? 'Words' : 'Characters'}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            id="essay-limitValue"
            label="Limit"
            description="From the official instructions."
            error={errors?.limitValue}
          >
            {(props) => (
              <Input
                {...props}
                name="limitValue"
                type="number"
                min={0}
                disabled={limitType === 'none'}
                defaultValue={essay?.limitValue ?? 650}
              />
            )}
          </Field>

          <Field id="essay-status" label="Status" error={errors?.status}>
            {(props) => (
              <Select {...props} name="status" defaultValue={essay?.status ?? 'not-started'}>
                {ESSAY_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {essayStatusLabels[value]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </FieldSet>

      <FieldSet
        legend="Where this essay belongs"
        description="Optional. A personal statement often belongs to no single college."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="essay-collegeId" label="College" error={errors?.collegeId}>
            {(props) => (
              <Select {...props} name="collegeId" defaultValue={essay?.collegeId ?? ''}>
                <option value="">Not tied to one college</option>
                {colleges.map((college) => (
                  <option key={college.id} value={college.id}>
                    {college.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field id="essay-applicationId" label="Application" error={errors?.applicationId}>
            {(props) => (
              <Select {...props} name="applicationId" defaultValue={essay?.applicationId ?? ''}>
                <option value="">Not tied to one application</option>
                {applications.map((application) => (
                  <option key={application.id} value={application.id}>
                    {collegeNames.get(application.collegeId) ?? 'Application'}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <Field
          id="essay-dueAt"
          label="Your own due date"
          description="When you want this finished — often earlier than the application deadline."
          error={errors?.dueAt}
        >
          {(props) => (
            <Input
              {...props}
              name="dueAt"
              type="date"
              defaultValue={toDateInputValue(essay?.dueAt ?? null, timeZone)}
            />
          )}
        </Field>
      </FieldSet>

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
