'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { env } from '@/lib/config/env';
import { requireWorkspace } from '@/lib/data/factory';
import { clearedDemoCookie } from '@/lib/auth/session';
import { deleteConfirmationSchema, profileSchema } from '@/lib/validation/schemas';
import { DEFAULT_TIME_ZONE } from '@/lib/dates/format';
import { type ActionResult, fail, ok } from '@/lib/utils/result';
import { formDataToObject, repositoryFailure, validationFailure } from '@/lib/utils/form';

export async function updateProfile(
  _previous: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const { session, repository } = await requireWorkspace();

  const parsed = profileSchema.safeParse({
    ...formDataToObject(formData),
    timeZone: formData.get('timeZone') || DEFAULT_TIME_ZONE,
  });
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    await repository.upsertProfile(session.userId, { ...parsed.data, onboardingCompleted: true });
    revalidatePath('/', 'layout');
    return ok();
  } catch (error) {
    return repositoryFailure(error, 'We could not save your profile.');
  }
}

/** Puts the demo workspace back to its seeded starting point. */
export async function resetDemoWorkspace(): Promise<ActionResult<undefined>> {
  if (!env.demoMode) {
    return fail('Demo data can only be reset while ApplyPilot is running in demo mode.');
  }

  const { session, repository } = await requireWorkspace();

  try {
    await repository.resetDemoData(session.userId);
    revalidatePath('/', 'layout');
    return ok();
  } catch (error) {
    return repositoryFailure(error, 'We could not reset the demo data.');
  }
}

/**
 * Deletes everything the student has stored.
 *
 * Requires typing DELETE, and in Supabase mode signs the account out
 * afterwards so no stale page keeps rendering removed records.
 */
export async function deleteAllData(
  _previous: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const { session, repository } = await requireWorkspace();

  const parsed = deleteConfirmationSchema.safeParse({ confirmation: formData.get('confirmation') });
  if (!parsed.success) {
    return fail('Type DELETE exactly to confirm.', { confirmation: ['Type DELETE exactly.'] });
  }

  try {
    await repository.deleteAllUserData(session.userId);
  } catch (error) {
    return repositoryFailure(error, 'We could not delete your data.');
  }

  if (env.storage === 'demo') {
    const store = await cookies();
    store.set(clearedDemoCookie.name, clearedDemoCookie.value, clearedDemoCookie.options);
  } else if (env.storage === 'supabase') {
    const { createServerSupabaseClient } = await import('@/lib/data/supabase/server-client');
    const supabase = await createServerSupabaseClient();
    await supabase?.auth.signOut();
  }
  // File storage has no session to end. The data file is now empty, so the
  // redirect below lands on onboarding.

  revalidatePath('/', 'layout');
  redirect('/');
}
