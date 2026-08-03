'use server';

import { revalidatePath } from 'next/cache';
import { requireWorkspace } from '@/lib/data/factory';
import type { ApplyPilotRepository } from '@/lib/data/repository';
import { scholarshipSchema } from '@/lib/validation/schemas';
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
 * Scholarship mutations.
 *
 * A scholarship deadline belongs to the organisation that set it, so it is
 * stored as an instant interpreted in the scholarship's own zone rather than the
 * student's. "Last verified" is the student's own record of when they checked
 * the official source, so that one is read in the student's zone.
 *
 * Essay links are read with `getAll` and the repository drops any id that is not
 * this user's, so a tampered form cannot attach someone else's essay.
 */

async function profileTimeZone(repository: ApplyPilotRepository, userId: string): Promise<string> {
  const profile = await repository.getProfile(userId);
  return profile?.timeZone ?? DEFAULT_TIME_ZONE;
}

function scholarshipPayload(formData: FormData, studentTimeZone: string): Record<string, unknown> {
  const deadlineTimeZone = emptyToNull(formData.get('deadlineTimeZone')) ?? studentTimeZone;
  return {
    ...formDataToObject(formData),
    deadlineTimeZone,
    deadlineAt: toIsoInstant(formData.get('deadlineAt'), deadlineTimeZone),
    lastVerifiedAt: toIsoInstant(formData.get('lastVerifiedAt'), studentTimeZone),
    essayIds: formData.getAll('essayIds').map((value) => String(value)),
  };
}

export async function createScholarship(
  _previous: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const { session, repository } = await requireWorkspace();
  const studentTimeZone = await profileTimeZone(repository, session.userId);

  const parsed = scholarshipSchema.safeParse(scholarshipPayload(formData, studentTimeZone));
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const scholarship = await repository.createScholarship(session.userId, parsed.data);
    revalidatePath('/scholarships');
    revalidatePath('/dashboard');
    return ok({ id: scholarship.id });
  } catch (error) {
    return repositoryFailure(error, 'We could not add that scholarship.');
  }
}

export async function updateScholarship(
  _previous: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const { session, repository } = await requireWorkspace();

  const id = idSchema.safeParse(formData.get('scholarshipId'));
  if (!id.success) return fail('That scholarship could not be found.');

  const studentTimeZone = await profileTimeZone(repository, session.userId);

  const parsed = scholarshipSchema.safeParse(scholarshipPayload(formData, studentTimeZone));
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    await repository.updateScholarship(session.userId, id.data, parsed.data);
    revalidatePath('/scholarships');
    revalidatePath('/dashboard');
    return ok({ id: id.data });
  } catch (error) {
    return repositoryFailure(error, 'We could not save your changes.');
  }
}

export async function deleteScholarship(scholarshipId: string): Promise<ActionResult<undefined>> {
  const { session, repository } = await requireWorkspace();

  const id = idSchema.safeParse(scholarshipId);
  if (!id.success) return fail('That scholarship could not be found.');

  try {
    await repository.deleteScholarship(session.userId, id.data);
    revalidatePath('/scholarships');
    revalidatePath('/dashboard');
    return ok();
  } catch (error) {
    return repositoryFailure(error, 'We could not delete that scholarship.');
  }
}
