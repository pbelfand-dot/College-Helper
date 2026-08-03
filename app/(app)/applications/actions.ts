'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireWorkspace } from '@/lib/data/factory';
import {
  applicationSchema,
  requirementSchema,
  requirementStatusUpdateSchema,
} from '@/lib/validation/schemas';
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
 * Application and requirement mutations.
 *
 * Deadlines are stored as instants but entered as wall time in a chosen zone,
 * so "November 1, 11:59pm Eastern" survives the trip through the database
 * regardless of where the student happens to be sitting.
 */

function applicationPayload(formData: FormData) {
  const timeZone = emptyToNull(formData.get('deadlineTimeZone')) ?? DEFAULT_TIME_ZONE;
  return {
    ...formDataToObject(formData),
    deadlineTimeZone: timeZone,
    deadlineAt: toIsoInstant(formData.get('deadlineAt'), timeZone),
    submittedAt: toIsoInstant(formData.get('submittedAt'), timeZone),
    decisionAt: toIsoInstant(formData.get('decisionAt'), timeZone),
  };
}

export async function createApplication(
  _previous: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const { session, repository } = await requireWorkspace();

  const parsed = applicationSchema.safeParse(applicationPayload(formData));
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const application = await repository.createApplication(session.userId, parsed.data);

    // Seed a starting checklist. Every item is editable and deletable — this is
    // a starting point the student confirms, not a claim about what this
    // particular college requires.
    const starters: { type: 'application-form' | 'transcript' | 'fee'; title: string }[] = [
      { type: 'application-form', title: 'Complete the application form' },
      { type: 'transcript', title: 'Request your transcript' },
      { type: 'fee', title: 'Application fee or fee waiver' },
    ];
    for (const [index, starter] of starters.entries()) {
      await repository.createRequirement(session.userId, {
        applicationId: application.id,
        type: starter.type,
        title: starter.title,
        description: 'Confirm what this college actually requires on their official site.',
        required: true,
        status: 'not-started',
        dueAt: null,
        sourceUrl: null,
        sortOrder: index,
      });
    }

    revalidatePath('/applications');
    revalidatePath('/dashboard');
    revalidatePath(`/colleges/${parsed.data.collegeId}`);
    return ok({ id: application.id });
  } catch (error) {
    return repositoryFailure(error, 'We could not create that application.');
  }
}

export async function updateApplication(
  _previous: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const { session, repository } = await requireWorkspace();

  const id = idSchema.safeParse(formData.get('applicationId'));
  if (!id.success) return fail('That application could not be found.');

  const parsed = applicationSchema.safeParse(applicationPayload(formData));
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    await repository.updateApplication(session.userId, id.data, parsed.data);
    revalidatePath('/applications');
    revalidatePath(`/applications/${id.data}`);
    revalidatePath('/dashboard');
    return ok({ id: id.data });
  } catch (error) {
    return repositoryFailure(error, 'We could not save your changes.');
  }
}

export async function deleteApplication(applicationId: string): Promise<ActionResult<undefined>> {
  const { session, repository } = await requireWorkspace();

  const id = idSchema.safeParse(applicationId);
  if (!id.success) return fail('That application could not be found.');

  try {
    await repository.deleteApplication(session.userId, id.data);
  } catch (error) {
    return repositoryFailure(error, 'We could not delete that application.');
  }

  revalidatePath('/applications');
  revalidatePath('/dashboard');
  redirect('/applications');
}

// --- Requirements -----------------------------------------------------------

export async function createRequirement(
  _previous: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const { session, repository } = await requireWorkspace();

  const applicationId = idSchema.safeParse(formData.get('applicationId'));
  if (!applicationId.success) return fail('That application could not be found.');

  const application = await repository.getApplication(session.userId, applicationId.data);
  if (!application) return fail('That application could not be found.');

  const parsed = requirementSchema.safeParse({
    ...formDataToObject(formData),
    dueAt: toIsoInstant(formData.get('dueAt'), application.deadlineTimeZone),
  });
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const requirement = await repository.createRequirement(session.userId, parsed.data);
    revalidatePath(`/applications/${applicationId.data}`);
    revalidatePath('/applications');
    revalidatePath('/dashboard');
    return ok({ id: requirement.id });
  } catch (error) {
    return repositoryFailure(error, 'We could not add that requirement.');
  }
}

/** Checkbox toggle on the checklist. */
export async function setRequirementStatus(
  requirementId: string,
  status: string,
): Promise<ActionResult<undefined>> {
  const { session, repository } = await requireWorkspace();

  const parsed = requirementStatusUpdateSchema.safeParse({ requirementId, status });
  if (!parsed.success) return fail('That requirement could not be updated.');

  try {
    const requirement = await repository.updateRequirement(
      session.userId,
      parsed.data.requirementId,
      { status: parsed.data.status },
    );
    revalidatePath(`/applications/${requirement.applicationId}`);
    revalidatePath('/applications');
    revalidatePath('/dashboard');
    return ok();
  } catch (error) {
    return repositoryFailure(error, 'We could not update that requirement.');
  }
}

export async function deleteRequirement(requirementId: string): Promise<ActionResult<undefined>> {
  const { session, repository } = await requireWorkspace();

  const id = idSchema.safeParse(requirementId);
  if (!id.success) return fail('That requirement could not be found.');

  try {
    const requirement = await repository.getRequirement(session.userId, id.data);
    if (!requirement) return fail('That requirement could not be found.');

    await repository.deleteRequirement(session.userId, id.data);
    revalidatePath(`/applications/${requirement.applicationId}`);
    revalidatePath('/applications');
    revalidatePath('/dashboard');
    return ok();
  } catch (error) {
    return repositoryFailure(error, 'We could not delete that requirement.');
  }
}

// --- Recommender links ------------------------------------------------------

export async function linkRecommenderToApplication(
  applicationId: string,
  recommenderId: string,
): Promise<ActionResult<undefined>> {
  const { session, repository } = await requireWorkspace();

  const ids = idSchema.array().length(2).safeParse([applicationId, recommenderId]);
  if (!ids.success) return fail('That link could not be created.');

  try {
    await repository.linkRecommender(session.userId, applicationId, recommenderId);
    revalidatePath(`/applications/${applicationId}`);
    revalidatePath('/recommendations');
    return ok();
  } catch (error) {
    return repositoryFailure(error, 'We could not link that recommender.');
  }
}

export async function unlinkRecommenderFromApplication(
  applicationId: string,
  recommenderId: string,
): Promise<ActionResult<undefined>> {
  const { session, repository } = await requireWorkspace();

  const ids = idSchema.array().length(2).safeParse([applicationId, recommenderId]);
  if (!ids.success) return fail('That link could not be removed.');

  try {
    await repository.unlinkRecommender(session.userId, applicationId, recommenderId);
    revalidatePath(`/applications/${applicationId}`);
    revalidatePath('/recommendations');
    return ok();
  } catch (error) {
    return repositoryFailure(error, 'We could not unlink that recommender.');
  }
}
