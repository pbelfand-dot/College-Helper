'use server';

import { revalidatePath } from 'next/cache';
import { requireWorkspace } from '@/lib/data/factory';
import type { ApplyPilotRepository } from '@/lib/data/repository';
import { recommenderSchema } from '@/lib/validation/schemas';
import { idSchema } from '@/lib/validation/common';
import { DEFAULT_TIME_ZONE } from '@/lib/dates/format';
import { type ActionResult, fail, ok } from '@/lib/utils/result';
import {
  formDataToObject,
  repositoryFailure,
  toIsoInstant,
  validationFailure,
} from '@/lib/utils/form';

/**
 * Recommender mutations.
 *
 * ApplyPilot tracks the *request*: who was asked, when it is due, whether a
 * thank-you went out. The letter itself is never stored — it is confidential
 * between the recommender and the college, and there is no field for it.
 *
 * The three dates arrive from `<input type="date">`, so they are interpreted as
 * wall time in the student's own zone before they become instants.
 */

/** The student's zone, used to read the date inputs. Falls back to a stable default. */
async function profileTimeZone(repository: ApplyPilotRepository, userId: string): Promise<string> {
  const profile = await repository.getProfile(userId);
  return profile?.timeZone ?? DEFAULT_TIME_ZONE;
}

function recommenderPayload(formData: FormData, timeZone: string): Record<string, unknown> {
  return {
    ...formDataToObject(formData),
    dateRequested: toIsoInstant(formData.get('dateRequested'), timeZone),
    dueAt: toIsoInstant(formData.get('dueAt'), timeZone),
    followUpAt: toIsoInstant(formData.get('followUpAt'), timeZone),
  };
}

export async function createRecommender(
  _previous: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const { session, repository } = await requireWorkspace();
  const timeZone = await profileTimeZone(repository, session.userId);

  const parsed = recommenderSchema.safeParse(recommenderPayload(formData, timeZone));
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const recommender = await repository.createRecommender(session.userId, parsed.data);
    revalidatePath('/recommendations');
    revalidatePath('/dashboard');
    return ok({ id: recommender.id });
  } catch (error) {
    return repositoryFailure(error, 'We could not add that recommender.');
  }
}

export async function updateRecommender(
  _previous: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const { session, repository } = await requireWorkspace();

  const id = idSchema.safeParse(formData.get('recommenderId'));
  if (!id.success) return fail('That recommender could not be found.');

  const timeZone = await profileTimeZone(repository, session.userId);

  const parsed = recommenderSchema.safeParse(recommenderPayload(formData, timeZone));
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    await repository.updateRecommender(session.userId, id.data, parsed.data);
    revalidatePath('/recommendations');
    revalidatePath('/dashboard');
    return ok({ id: id.data });
  } catch (error) {
    return repositoryFailure(error, 'We could not save your changes.');
  }
}

export async function deleteRecommender(recommenderId: string): Promise<ActionResult<undefined>> {
  const { session, repository } = await requireWorkspace();

  const id = idSchema.safeParse(recommenderId);
  if (!id.success) return fail('That recommender could not be found.');

  try {
    await repository.deleteRecommender(session.userId, id.data);
    revalidatePath('/recommendations');
    revalidatePath('/applications');
    revalidatePath('/dashboard');
    return ok();
  } catch (error) {
    return repositoryFailure(error, 'We could not delete that recommender.');
  }
}
