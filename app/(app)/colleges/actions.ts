'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireWorkspace } from '@/lib/data/factory';
import { collegeSchema } from '@/lib/validation/schemas';
import { idSchema } from '@/lib/validation/common';
import { type ActionResult, fail, ok } from '@/lib/utils/result';
import { formDataToObject, repositoryFailure, validationFailure } from '@/lib/utils/form';

/**
 * College mutations.
 *
 * Every action resolves the session first and passes that user id to the
 * repository. A college id from the form is never trusted on its own.
 */

export async function createCollege(
  _previous: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const { session, repository } = await requireWorkspace();

  const parsed = collegeSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const college = await repository.createCollege(session.userId, parsed.data);
    revalidatePath('/colleges');
    revalidatePath('/dashboard');
    return ok({ id: college.id });
  } catch (error) {
    return repositoryFailure(error, 'We could not save that college.');
  }
}

export async function updateCollege(
  _previous: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const { session, repository } = await requireWorkspace();

  const id = idSchema.safeParse(formData.get('collegeId'));
  if (!id.success) return fail('That college could not be found.');

  const parsed = collegeSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    await repository.updateCollege(session.userId, id.data, parsed.data);
    revalidatePath('/colleges');
    revalidatePath(`/colleges/${id.data}`);
    revalidatePath('/dashboard');
    return ok({ id: id.data });
  } catch (error) {
    return repositoryFailure(error, 'We could not save your changes.');
  }
}

export async function deleteCollege(collegeId: string): Promise<ActionResult<undefined>> {
  const { session, repository } = await requireWorkspace();

  const id = idSchema.safeParse(collegeId);
  if (!id.success) return fail('That college could not be found.');

  try {
    await repository.deleteCollege(session.userId, id.data);
  } catch (error) {
    return repositoryFailure(error, 'We could not delete that college.');
  }

  revalidatePath('/colleges');
  revalidatePath('/applications');
  revalidatePath('/dashboard');
  redirect('/colleges');
}

/** Quick status change from the list view. */
export async function setCollegeListStatus(
  collegeId: string,
  listStatus: string,
): Promise<ActionResult<undefined>> {
  const { session, repository } = await requireWorkspace();

  const id = idSchema.safeParse(collegeId);
  if (!id.success) return fail('That college could not be found.');

  const status = collegeSchema.shape.listStatus.safeParse(listStatus);
  if (!status.success) return fail('That is not a valid list status.');

  try {
    await repository.updateCollege(session.userId, id.data, { listStatus: status.data });
    revalidatePath('/colleges');
    revalidatePath(`/colleges/${id.data}`);
    return ok();
  } catch (error) {
    return repositoryFailure(error, 'We could not update that college.');
  }
}

/** Records that the student re-checked this college's facts today. */
export async function markCollegeVerified(collegeId: string): Promise<ActionResult<undefined>> {
  const { session, repository } = await requireWorkspace();

  const id = idSchema.safeParse(collegeId);
  if (!id.success) return fail('That college could not be found.');

  try {
    await repository.updateCollege(session.userId, id.data, {
      lastVerifiedAt: new Date().toISOString(),
    });
    revalidatePath(`/colleges/${id.data}`);
    revalidatePath('/dashboard');
    return ok();
  } catch (error) {
    return repositoryFailure(error, 'We could not update that college.');
  }
}
