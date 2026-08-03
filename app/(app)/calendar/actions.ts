'use server';

import { revalidatePath } from 'next/cache';
import { requireWorkspace } from '@/lib/data/factory';
import { taskCompletionSchema, taskSchema } from '@/lib/validation/schemas';
import { idSchema } from '@/lib/validation/common';
import { DEFAULT_TIME_ZONE } from '@/lib/dates/format';
import { type ActionResult, fail, ok } from '@/lib/utils/result';
import {
  emptyToNull,
  formDataToObject,
  repositoryFailure,
  toIsoInstant,
  validationFailure,
} from '@/lib/utils/form';

/**
 * Task mutations.
 *
 * Tasks are the only thing in ApplyPilot that acts as a reminder. They are
 * plain records the student sees when they open the app — there is no email,
 * no push notification and no background job, because a half-working
 * notification is worse than none.
 */

function taskPayload(formData: FormData) {
  const timeZone = emptyToNull(formData.get('timeZone')) ?? DEFAULT_TIME_ZONE;
  return {
    ...formDataToObject(formData),
    timeZone,
    dueAt: toIsoInstant(formData.get('dueAt'), timeZone),
  };
}

export async function createTask(
  _previous: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const { session, repository } = await requireWorkspace();

  const parsed = taskSchema.safeParse(taskPayload(formData));
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const task = await repository.createTask(session.userId, {
      ...parsed.data,
      completedAt: null,
    });
    revalidatePath('/calendar');
    revalidatePath('/dashboard');
    return ok({ id: task.id });
  } catch (error) {
    return repositoryFailure(error, 'We could not add that task.');
  }
}

export async function updateTask(
  _previous: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const { session, repository } = await requireWorkspace();

  const id = idSchema.safeParse(formData.get('taskId'));
  if (!id.success) return fail('That task could not be found.');

  const parsed = taskSchema.safeParse(taskPayload(formData));
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    await repository.updateTask(session.userId, id.data, parsed.data);
    revalidatePath('/calendar');
    revalidatePath('/dashboard');
    return ok({ id: id.data });
  } catch (error) {
    return repositoryFailure(error, 'We could not save that task.');
  }
}

/** Ticking a task off, and un-ticking it. */
export async function setTaskCompletion(
  taskId: string,
  completed: boolean,
): Promise<ActionResult<undefined>> {
  const { session, repository } = await requireWorkspace();

  const parsed = taskCompletionSchema.safeParse({ taskId, completed });
  if (!parsed.success) return fail('That task could not be updated.');

  try {
    await repository.updateTask(session.userId, parsed.data.taskId, {
      completedAt: parsed.data.completed ? new Date().toISOString() : null,
    });
    revalidatePath('/calendar');
    revalidatePath('/dashboard');
    return ok();
  } catch (error) {
    return repositoryFailure(error, 'We could not update that task.');
  }
}

export async function deleteTask(taskId: string): Promise<ActionResult<undefined>> {
  const { session, repository } = await requireWorkspace();

  const id = idSchema.safeParse(taskId);
  if (!id.success) return fail('That task could not be found.');

  try {
    await repository.deleteTask(session.userId, id.data);
    revalidatePath('/calendar');
    revalidatePath('/dashboard');
    return ok();
  } catch (error) {
    return repositoryFailure(error, 'We could not delete that task.');
  }
}
