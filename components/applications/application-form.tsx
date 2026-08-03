'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Field, FieldSet } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { TimeZoneField } from '@/components/ui/time-zone-field';
import { ErrorState } from '@/components/ui/states';
import {
  applicationRoundHints,
  applicationRoundLabels,
  applicationStatusLabels,
  decisionResultLabels,
  feeWaiverStatusLabels,
  testingPlanLabels,
  transcriptStatusLabels,
} from '@/lib/domain/labels';
import {
  APPLICATION_ROUNDS,
  APPLICATION_STATUSES,
  DECISION_RESULTS,
  FEE_WAIVER_STATUSES,
  TESTING_PLANS,
  TRANSCRIPT_STATUSES,
  type Application,
  type ApplicationRound,
  type College,
} from '@/lib/domain/types';
import { toDateInputValue, toDateTimeLocalValue } from '@/lib/dates/format';
import type { ActionResult } from '@/lib/utils/result';

type ApplicationAction = (
  previous: ActionResult<{ id: string }> | null,
  formData: FormData,
) => Promise<ActionResult<{ id: string }>>;

export function ApplicationForm({
  action,
  colleges,
  application,
  defaultCollegeId,
  defaultTimeZone,
  onDone,
  submitLabel = 'Save application',
  showOutcomeFields = false,
}: {
  action: ApplicationAction;
  colleges: College[];
  application?: Application;
  defaultCollegeId?: string;
  defaultTimeZone: string;
  onDone?: (id: string) => void;
  submitLabel?: string;
  showOutcomeFields?: boolean;
}) {
  const [state, formAction] = useActionState(
    async (previous: ActionResult<{ id: string }> | null, formData: FormData) => {
      const result = await action(previous, formData);
      if (result.ok && onDone) onDone(result.data.id);
      return result;
    },
    null,
  );

  const [round, setRound] = useState<ApplicationRound>(
    application?.applicationRound ?? 'regular-decision',
  );
  const timeZone = application?.deadlineTimeZone ?? defaultTimeZone;
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-7">
      {application ? <input type="hidden" name="applicationId" value={application.id} /> : null}

      {state && !state.ok ? <ErrorState title="Could not save" description={state.error} /> : null}

      <FieldSet legend="What you are applying to">
        <Field id="collegeId" label="College" required error={errors?.collegeId}>
          {(props) => (
            <Select
              {...props}
              name="collegeId"
              defaultValue={application?.collegeId ?? defaultCollegeId ?? ''}
            >
              <option value="" disabled>
                Choose a college from your list
              </option>
              {colleges.map((college) => (
                <option key={college.id} value={college.id}>
                  {college.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          id="applicationRound"
          label="Application round"
          description={applicationRoundHints[round]}
          error={errors?.applicationRound}
        >
          {(props) => (
            <Select
              {...props}
              name="applicationRound"
              value={round}
              onChange={(event) => setRound(event.target.value as ApplicationRound)}
            >
              {APPLICATION_ROUNDS.map((value) => (
                <option key={value} value={value}>
                  {applicationRoundLabels[value]}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="deadlineAt"
            label="Deadline"
            description="Enter the deadline exactly as the college states it, including the time."
            error={errors?.deadlineAt}
          >
            {(props) => (
              <Input
                {...props}
                name="deadlineAt"
                type="datetime-local"
                defaultValue={toDateTimeLocalValue(application?.deadlineAt ?? null, timeZone)}
              />
            )}
          </Field>

          <TimeZoneField
            id="deadlineTimeZone"
            name="deadlineTimeZone"
            label="Deadline time zone"
            description="Which zone the college's deadline is stated in — not necessarily yours."
            defaultValue={timeZone}
            error={errors?.deadlineTimeZone}
          />
        </div>

        <Field id="status" label="Status" error={errors?.status}>
          {(props) => (
            <Select {...props} name="status" defaultValue={application?.status ?? 'planning'}>
              {APPLICATION_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {applicationStatusLabels[value]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </FieldSet>

      <FieldSet
        legend="Fees, testing and transcript"
        description="Your own plan and status. Confirm what this college requires on their site — policies differ and change."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="feeAmount" label="Application fee" error={errors?.feeAmount}>
            {(props) => (
              <Input
                {...props}
                name="feeAmount"
                inputMode="decimal"
                placeholder="75"
                defaultValue={application?.feeAmount ?? ''}
              />
            )}
          </Field>
          <Field id="feeWaiverStatus" label="Fee waiver" error={errors?.feeWaiverStatus}>
            {(props) => (
              <Select
                {...props}
                name="feeWaiverStatus"
                defaultValue={application?.feeWaiverStatus ?? 'not-applicable'}
              >
                {FEE_WAIVER_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {feeWaiverStatusLabels[value]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="testingPlan" label="Your testing plan" error={errors?.testingPlan}>
            {(props) => (
              <Select
                {...props}
                name="testingPlan"
                defaultValue={application?.testingPlan ?? 'not-decided'}
              >
                {TESTING_PLANS.map((value) => (
                  <option key={value} value={value}>
                    {testingPlanLabels[value]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id="transcriptStatus" label="Transcript" error={errors?.transcriptStatus}>
            {(props) => (
              <Select
                {...props}
                name="transcriptStatus"
                defaultValue={application?.transcriptStatus ?? 'not-started'}
              >
                {TRANSCRIPT_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {transcriptStatusLabels[value]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </FieldSet>

      {showOutcomeFields ? (
        <FieldSet legend="Submission and outcome">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="submittedAt"
              label="Date you submitted"
              description="You submit on the official site — ApplyPilot just records that you did."
              error={errors?.submittedAt}
            >
              {(props) => (
                <Input
                  {...props}
                  name="submittedAt"
                  type="date"
                  defaultValue={toDateInputValue(application?.submittedAt ?? null, timeZone)}
                />
              )}
            </Field>
            <Field id="decisionAt" label="Date you heard back" error={errors?.decisionAt}>
              {(props) => (
                <Input
                  {...props}
                  name="decisionAt"
                  type="date"
                  defaultValue={toDateInputValue(application?.decisionAt ?? null, timeZone)}
                />
              )}
            </Field>
          </div>

          <Field id="decisionResult" label="Result" error={errors?.decisionResult}>
            {(props) => (
              <Select
                {...props}
                name="decisionResult"
                defaultValue={application?.decisionResult ?? 'pending'}
              >
                {DECISION_RESULTS.map((value) => (
                  <option key={value} value={value}>
                    {decisionResultLabels[value]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </FieldSet>
      ) : (
        <>
          <input type="hidden" name="submittedAt" value={application?.submittedAt ?? ''} />
          <input type="hidden" name="decisionAt" value={application?.decisionAt ?? ''} />
          <input
            type="hidden"
            name="decisionResult"
            value={application?.decisionResult ?? 'pending'}
          />
        </>
      )}

      <Field id="notes" label="Notes" error={errors?.notes}>
        {(props) => (
          <Textarea {...props} name="notes" rows={3} defaultValue={application?.notes ?? ''} />
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
