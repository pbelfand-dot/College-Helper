'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Counter } from '@/components/ui/counter';
import { Field, FieldSet } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/states';
import { activityCategoryLabels } from '@/lib/domain/labels';
import { ACTIVITY_CATEGORIES, type Activity } from '@/lib/domain/types';
import type { ActionResult } from '@/lib/utils/result';

type ActivityAction = (
  previous: ActionResult<{ id: string }> | null,
  formData: FormData,
) => Promise<ActionResult<{ id: string }>>;

/**
 * Activity editor.
 *
 * The character limit is a field the student sets, and the counter reads from
 * it live. ApplyPilot never asserts what a given application's limit is this
 * year — the student copies it from the official instructions.
 */
export function ActivityForm({
  action,
  activity,
  onDone,
  submitLabel = 'Save activity',
}: {
  action: ActivityAction;
  activity?: Activity;
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

  const [description, setDescription] = useState(activity?.description ?? '');
  const [limit, setLimit] = useState(activity?.descriptionLimit ?? 150);
  const [continues, setContinues] = useState(activity?.continues ?? true);

  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-7">
      {activity ? <input type="hidden" name="activityId" value={activity.id} /> : null}

      {state && !state.ok ? <ErrorState title="Could not save" description={state.error} /> : null}

      <FieldSet legend="What it is">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="activity-organization" label="Organisation" required error={errors?.organization}>
            {(props) => (
              <Input
                {...props}
                name="organization"
                defaultValue={activity?.organization}
                placeholder="Lincoln High Robotics"
              />
            )}
          </Field>

          <Field id="activity-role" label="Your role" error={errors?.role}>
            {(props) => (
              <Input
                {...props}
                name="role"
                defaultValue={activity?.role ?? ''}
                placeholder="Documentation lead"
              />
            )}
          </Field>
        </div>

        <Field id="activity-category" label="Category" error={errors?.category}>
          {(props) => (
            <Select {...props} name="category" defaultValue={activity?.category ?? 'other'}>
              {ACTIVITY_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {activityCategoryLabels[value]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </FieldSet>

      <FieldSet legend="When and how much">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="activity-startDate" label="Started" error={errors?.startDate}>
            {(props) => (
              <Input
                {...props}
                name="startDate"
                type="date"
                defaultValue={activity?.startDate ? activity.startDate.slice(0, 10) : ''}
              />
            )}
          </Field>

          <Field
            id="activity-endDate"
            label="Ended"
            description="Leave blank if you are still doing it."
            error={errors?.endDate}
          >
            {(props) => (
              <Input
                {...props}
                name="endDate"
                type="date"
                disabled={continues}
                defaultValue={activity?.endDate ? activity.endDate.slice(0, 10) : ''}
              />
            )}
          </Field>
        </div>

        <label className="flex items-center gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            name="continues"
            checked={continues}
            onChange={(event) => setContinues(event.target.checked)}
            className="size-4 accent-[hsl(var(--ap-accent))]"
          />
          I am still doing this
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            id="activity-hoursPerWeek"
            label="Hours per week"
            description="An honest average."
            error={errors?.hoursPerWeek}
          >
            {(props) => (
              <Input
                {...props}
                name="hoursPerWeek"
                type="number"
                min={0}
                max={168}
                defaultValue={activity?.hoursPerWeek ?? ''}
              />
            )}
          </Field>

          <Field id="activity-weeksPerYear" label="Weeks per year" error={errors?.weeksPerYear}>
            {(props) => (
              <Input
                {...props}
                name="weeksPerYear"
                type="number"
                min={0}
                max={52}
                defaultValue={activity?.weeksPerYear ?? ''}
              />
            )}
          </Field>

          <Field
            id="activity-gradeLevels"
            label="Years involved"
            description="Comma separated, e.g. 10, 11, 12"
            error={errors?.gradeLevels}
          >
            {(props) => (
              <Input
                {...props}
                name="gradeLevels"
                defaultValue={activity?.gradeLevels.join(', ') ?? ''}
                placeholder="10, 11, 12"
              />
            )}
          </Field>
        </div>
      </FieldSet>

      <FieldSet legend="How you describe it">
        <Field
          id="activity-descriptionLimit"
          label="Character limit"
          description="Copy the limit from the application you are filling in. It is yours to set — different applications use different numbers, and they change."
          error={errors?.descriptionLimit}
        >
          {(props) => (
            <Input
              {...props}
              name="descriptionLimit"
              type="number"
              min={20}
              max={5000}
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value) || 0)}
              className="sm:max-w-40"
            />
          )}
        </Field>

        <Field
          id="activity-description"
          label="Description"
          error={errors?.description}
          aside={<Counter text={description} limitType="characters" limitValue={limit} />}
        >
          {(props) => (
            <Textarea
              {...props}
              name="description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Collect and log weekly water samples; trained six younger students to run the test kit."
            />
          )}
        </Field>

        <Field
          id="activity-impactEvidence"
          label="Evidence"
          description="What you could point at if someone asked. Only things that actually exist — never a number you are guessing at."
          error={errors?.impactEvidence}
        >
          {(props) => (
            <Textarea
              {...props}
              name="impactEvidence"
              rows={2}
              defaultValue={activity?.impactEvidence ?? ''}
            />
          )}
        </Field>

        <Field
          id="activity-reflectionNotes"
          label="Private notes"
          description="For you only. Never shown to a college — useful raw material when you write an essay."
          error={errors?.reflectionNotes}
        >
          {(props) => (
            <Textarea
              {...props}
              name="reflectionNotes"
              rows={2}
              defaultValue={activity?.reflectionNotes ?? ''}
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
