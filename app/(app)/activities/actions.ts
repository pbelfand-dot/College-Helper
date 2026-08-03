'use server';

import { revalidatePath } from 'next/cache';
import { requireWorkspace } from '@/lib/data/factory';
import { activitySchema, activityReorderSchema } from '@/lib/validation/schemas';
import { idSchema } from '@/lib/validation/common';
import { moveDown, moveUp } from '@/lib/domain/ordering';
import { type ActionResult, fail, ok } from '@/lib/utils/result';
import { formDataToObject, repositoryFailure, validationFailure } from '@/lib/utils/form';

/**
 * Activity mutations.
 *
 * Reordering is computed by the same pure functions the UI uses to preview a
 * move, then persisted as a whole ordered list so the result cannot end up
 * half-applied.
 */

export async function createActivity(
  _previous: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const { session, repository } = await requireWorkspace();

  const parsed = activitySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const activity = await repository.createActivity(session.userId, parsed.data);
    revalidatePath('/activities');
    revalidatePath('/dashboard');
    return ok({ id: activity.id });
  } catch (error) {
    return repositoryFailure(error, 'We could not add that activity.');
  }
}

export async function updateActivity(
  _previous: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const { session, repository } = await requireWorkspace();

  const id = idSchema.safeParse(formData.get('activityId'));
  if (!id.success) return fail('That activity could not be found.');

  const parsed = activitySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    await repository.updateActivity(session.userId, id.data, parsed.data);
    revalidatePath('/activities');
    revalidatePath('/dashboard');
    return ok({ id: id.data });
  } catch (error) {
    return repositoryFailure(error, 'We could not save your changes.');
  }
}

export async function deleteActivity(activityId: string): Promise<ActionResult<undefined>> {
  const { session, repository } = await requireWorkspace();

  const id = idSchema.safeParse(activityId);
  if (!id.success) return fail('That activity could not be found.');

  try {
    await repository.deleteActivity(session.userId, id.data);
    revalidatePath('/activities');
    revalidatePath('/dashboard');
    return ok();
  } catch (error) {
    return repositoryFailure(error, 'We could not delete that activity.');
  }
}

export async function reorderActivity(
  activityId: string,
  direction: 'up' | 'down',
): Promise<ActionResult<undefined>> {
  const { session, repository } = await requireWorkspace();

  const parsed = activityReorderSchema.safeParse({ activityId, direction });
  if (!parsed.success) return fail('That activity could not be moved.');

  try {
    const activities = await repository.listActivities(session.userId);
    if (!activities.some((activity) => activity.id === parsed.data.activityId)) {
      return fail('That activity could not be found.');
    }

    const reordered =
      parsed.data.direction === 'up'
        ? moveUp(activities, parsed.data.activityId)
        : moveDown(activities, parsed.data.activityId);

    await repository.saveActivityOrder(
      session.userId,
      reordered.map((activity) => activity.id),
    );

    revalidatePath('/activities');
    return ok();
  } catch (error) {
    return repositoryFailure(error, 'We could not reorder your activities.');
  }
}
