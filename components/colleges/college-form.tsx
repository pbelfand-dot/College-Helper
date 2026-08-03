'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Field, FieldSet } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/states';
import { institutionTypeLabels, listStatusLabels } from '@/lib/domain/labels';
import { INSTITUTION_TYPES, LIST_STATUSES } from '@/lib/domain/types';
import type { College } from '@/lib/domain/types';
import type { ActionResult } from '@/lib/utils/result';

type CollegeAction = (
  previous: ActionResult<{ id: string }> | null,
  formData: FormData,
) => Promise<ActionResult<{ id: string }>>;

/**
 * Create/edit form for a college.
 *
 * The "where did this come from" fields are first-class rather than an
 * afterthought: a saved college is only as useful as the student's ability to
 * re-check it later.
 */
export function CollegeForm({
  action,
  college,
  onDone,
  submitLabel = 'Save college',
}: {
  action: CollegeAction;
  college?: College;
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
      {college ? <input type="hidden" name="collegeId" value={college.id} /> : null}

      {state && !state.ok ? <ErrorState title="Could not save" description={state.error} /> : null}

      <FieldSet legend="The basics">
        <Field id="name" label="College name" required error={errors?.name}>
          {(props) => (
            <Input
              {...props}
              name="name"
              defaultValue={college?.name}
              placeholder="University of Michigan"
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="city" label="City" error={errors?.city}>
            {(props) => <Input {...props} name="city" defaultValue={college?.city ?? ''} />}
          </Field>
          <Field id="stateOrRegion" label="State or region" error={errors?.stateOrRegion}>
            {(props) => (
              <Input {...props} name="stateOrRegion" defaultValue={college?.stateOrRegion ?? ''} />
            )}
          </Field>
          <Field id="country" label="Country" error={errors?.country}>
            {(props) => (
              <Input {...props} name="country" defaultValue={college?.country ?? 'United States'} />
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="institutionType" label="Type" error={errors?.institutionType}>
            {(props) => (
              <Select
                {...props}
                name="institutionType"
                defaultValue={college?.institutionType ?? ''}
              >
                <option value="">Not recorded</option>
                {INSTITUTION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {institutionTypeLabels[type]}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            id="listStatus"
            label="Where this sits on your list"
            description="Move it along as you decide. Nothing is locked in."
            error={errors?.listStatus}
          >
            {(props) => (
              <Select
                {...props}
                name="listStatus"
                defaultValue={college?.listStatus ?? 'exploring'}
              >
                {LIST_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {listStatusLabels[status]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="majors"
            label="Majors you are looking at"
            description="Separate with commas."
            error={errors?.majors}
          >
            {(props) => (
              <Input {...props} name="majors" defaultValue={college?.majors.join(', ') ?? ''} />
            )}
          </Field>
          <Field
            id="tags"
            label="Your own tags"
            description="Anything that helps you sort: small-campus, close-to-home, needs-a-visit."
            error={errors?.tags}
          >
            {(props) => (
              <Input {...props} name="tags" defaultValue={college?.tags.join(', ') ?? ''} />
            )}
          </Field>
        </div>
      </FieldSet>

      <FieldSet
        legend="Official links"
        description="Links to the college's own pages, so you can re-check facts rather than trusting a note you wrote in September."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="websiteUrl" label="Main website" error={errors?.websiteUrl}>
            {(props) => (
              <Input
                {...props}
                name="websiteUrl"
                type="url"
                inputMode="url"
                placeholder="https://…"
                defaultValue={college?.websiteUrl ?? ''}
              />
            )}
          </Field>
          <Field id="admissionsUrl" label="Admissions page" error={errors?.admissionsUrl}>
            {(props) => (
              <Input
                {...props}
                name="admissionsUrl"
                type="url"
                inputMode="url"
                placeholder="https://…"
                defaultValue={college?.admissionsUrl ?? ''}
              />
            )}
          </Field>
          <Field id="financialAidUrl" label="Financial aid page" error={errors?.financialAidUrl}>
            {(props) => (
              <Input
                {...props}
                name="financialAidUrl"
                type="url"
                inputMode="url"
                placeholder="https://…"
                defaultValue={college?.financialAidUrl ?? ''}
              />
            )}
          </Field>
        </div>

        <Field
          id="lastVerifiedAt"
          label="Last verified"
          description="When you last checked these details against the official site."
          error={errors?.lastVerifiedAt}
        >
          {(props) => (
            <Input
              {...props}
              name="lastVerifiedAt"
              type="date"
              defaultValue={college?.lastVerifiedAt ? college.lastVerifiedAt.slice(0, 10) : ''}
            />
          )}
        </Field>
      </FieldSet>

      <FieldSet legend="Your notes">
        <Field
          id="fitNotes"
          label="Why this one interests you"
          description="Your honest reasons. These are the raw material for a “why this college” essay later."
          error={errors?.fitNotes}
        >
          {(props) => (
            <Textarea {...props} name="fitNotes" rows={3} defaultValue={college?.fitNotes ?? ''} />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="academicNotes" label="Academic notes" error={errors?.academicNotes}>
            {(props) => (
              <Textarea
                {...props}
                name="academicNotes"
                rows={3}
                defaultValue={college?.academicNotes ?? ''}
              />
            )}
          </Field>
          <Field id="campusNotes" label="Campus and life notes" error={errors?.campusNotes}>
            {(props) => (
              <Textarea
                {...props}
                name="campusNotes"
                rows={3}
                defaultValue={college?.campusNotes ?? ''}
              />
            )}
          </Field>
        </div>

        <Field
          id="costNotes"
          label="Cost and aid questions"
          description="Questions to ask, not answers to assume. ApplyPilot does not give financial advice."
          error={errors?.costNotes}
        >
          {(props) => (
            <Textarea
              {...props}
              name="costNotes"
              rows={3}
              defaultValue={college?.costNotes ?? ''}
            />
          )}
        </Field>

        <Field
          id="sourceNotes"
          label="Where your information came from"
          description="Which page, which visit, which conversation. Future you will want to know."
          error={errors?.sourceNotes}
        >
          {(props) => (
            <Textarea
              {...props}
              name="sourceNotes"
              rows={2}
              defaultValue={college?.sourceNotes ?? ''}
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
