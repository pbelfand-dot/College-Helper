'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireWorkspace } from '@/lib/data/factory';
import { onboardingSchema } from '@/lib/validation/schemas';
import { DEFAULT_TIME_ZONE } from '@/lib/dates/format';
import { type ActionResult, fail } from '@/lib/utils/result';

/**
 * Saves the onboarding answers.
 *
 * Note what is not asked for: no address, no date of birth, no test scores, no
 * demographic categories, no family financial detail. Only what the product
 * actually uses to organise deadlines and writing.
 */
export async function completeOnboarding(
  _previous: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const { session, repository } = await requireWorkspace();

  const parsed = onboardingSchema.safeParse({
    displayName: formData.get('displayName') ?? '',
    graduationYear: formData.get('graduationYear'),
    currentGrade: formData.get('currentGrade') || null,
    region: formData.get('region') ?? '',
    intendedMajors: formData.get('intendedMajors') ?? '',
    interests: formData.get('interests') ?? '',
    applicationSeason: formData.get('applicationSeason') ?? '',
    timeZone: formData.get('timeZone') || DEFAULT_TIME_ZONE,
    writingVoiceNotes: formData.get('writingVoiceNotes') ?? '',
  });

  if (!parsed.success) {
    return fail('Please check the highlighted fields.', z.flattenError(parsed.error).fieldErrors);
  }

  try {
    await repository.upsertProfile(session.userId, {
      ...parsed.data,
      onboardingCompleted: true,
    });
  } catch {
    return fail('We could not save your profile. Please try again.');
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}
