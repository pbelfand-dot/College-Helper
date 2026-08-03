'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { TimeZoneField } from '@/components/ui/time-zone-field';
import { ErrorState } from '@/components/ui/states';
import { taskCategoryLabels, taskPriorityLabels } from '@/lib/domain/labels';
import { toDateInputValue } from '@/lib/dates/format';
import {
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  type Application,
  type College,
  type Essay,
  type Scholarship,
  type Task,
} from '@/lib/domain/types';
import type { ActionResult } from '@/lib/utils/result';

type TaskAction = (
  previous: ActionResult<{ id: string }> | null,
  formData: FormData,
) => Promise<ActionResult<{ id: string }>>;

/** Create or edit a task, optionally attached to an application, essay or scholarship. */
export function TaskForm({
  action,
  task,
  applications,
  colleges,
  essays,
  scholarships,
  defaultTimeZone,
  defaultDate,
  onDone,
  submitLabel = 'Save task',
}: {
  action: TaskAction;
  task?: Task;
  applications: Application[];
  colleges: College[];
  essays: Essay[];
  scholarships: Scholarship[];
  defaultTimeZone: string;
  defaultDate?: string;
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
  const timeZone = task?.timeZone ?? defaultTimeZone;
  const collegeNames = new Map(colleges.map((college) => [college.id, college.name]));

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {task ? <input type="hidden" name="taskId" value={task.id} /> : null}

      {state && !state.ok ? <ErrorState title="Could not save" description={state.error} /> : null}

      <Field id="task-title" label="What needs doing?" required error={errors?.title}>
        {(props) => (
          <Input
            {...props}
            name="title"
            defaultValue={task?.title}
            placeholder="Ask the counselling office about the fee waiver"
          />
        )}
      </Field>

      <Field id="task-description" label="Notes" error={errors?.description}>
        {(props) => (
          <Textarea {...props} name="description" rows={2} defaultValue={task?.description ?? ''} />
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="task-dueAt" label="Due date" error={errors?.dueAt}>
          {(props) => (
            <Input
              {...props}
              name="dueAt"
              type="date"
              defaultValue={task ? toDateInputValue(task.dueAt, timeZone) : (defaultDate ?? '')}
            />
          )}
        </Field>

        <TimeZoneField
          id="task-timeZone"
          name="timeZone"
          label="Time zone"
          description="Which zone this date belongs to."
          defaultValue={timeZone}
          error={errors?.timeZone}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="task-category" label="Category" error={errors?.category}>
          {(props) => (
            <Select {...props} name="category" defaultValue={task?.category ?? 'other'}>
              {TASK_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {taskCategoryLabels[value]}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field id="task-priority" label="Priority" error={errors?.priority}>
          {(props) => (
            <Select {...props} name="priority" defaultValue={task?.priority ?? 'medium'}>
              {TASK_PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {taskPriorityLabels[value]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <fieldset className="flex flex-col gap-4">
        <legend className="text-ink text-sm font-semibold">
          Attach this to something (optional)
        </legend>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="task-applicationId" label="Application" error={errors?.applicationId}>
            {(props) => (
              <Select {...props} name="applicationId" defaultValue={task?.applicationId ?? ''}>
                <option value="">None</option>
                {applications.map((application) => (
                  <option key={application.id} value={application.id}>
                    {collegeNames.get(application.collegeId) ?? 'Application'}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field id="task-essayId" label="Essay" error={errors?.essayId}>
            {(props) => (
              <Select {...props} name="essayId" defaultValue={task?.essayId ?? ''}>
                <option value="">None</option>
                {essays.map((essay) => (
                  <option key={essay.id} value={essay.id}>
                    {essay.title}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field id="task-scholarshipId" label="Scholarship" error={errors?.scholarshipId}>
            {(props) => (
              <Select {...props} name="scholarshipId" defaultValue={task?.scholarshipId ?? ''}>
                <option value="">None</option>
                {scholarships.map((scholarship) => (
                  <option key={scholarship.id} value={scholarship.id}>
                    {scholarship.title}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </fieldset>

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
