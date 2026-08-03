'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireWorkspace } from '@/lib/data/factory';
import {
  essayDraftSchema,
  essayNotesSchema,
  essayRestoreSchema,
  essaySchema,
} from '@/lib/validation/schemas';
import { idSchema } from '@/lib/validation/common';
import { type ActionResult, fail, ok } from '@/lib/utils/result';
import {
  formDataToObject,
  repositoryFailure,
  toIsoInstant,
  validationFailure,
} from '@/lib/utils/form';

/**
 * Essay mutations.
 *
 * The rule this file exists to enforce: nothing except the student's own typing
 * ever changes `currentDraft`. AI output arrives as a suggestion in the UI and
 * is only applied if the student presses a button, which then goes through the
 * same `saveDraft` path any manual edit does.
 */

export async function createEssay(
  _previous: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const { session, repository } = await requireWorkspace();

  const profile = await repository.getProfile(session.userId);
  const timeZone = profile?.timeZone ?? 'UTC';

  const parsed = essaySchema.safeParse({
    ...formDataToObject(formData),
    dueAt: toIsoInstant(formData.get('dueAt'), timeZone),
  });
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const essay = await repository.createEssay(session.userId, {
      ...parsed.data,
      brainstormNotes: null,
      outline: null,
      currentDraft: '',
    });
    revalidatePath('/essays');
    revalidatePath('/dashboard');
    return ok({ id: essay.id });
  } catch (error) {
    return repositoryFailure(error, 'We could not create that essay.');
  }
}

export async function updateEssayDetails(
  _previous: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const { session, repository } = await requireWorkspace();

  const id = idSchema.safeParse(formData.get('essayId'));
  if (!id.success) return fail('That essay could not be found.');

  const profile = await repository.getProfile(session.userId);
  const timeZone = profile?.timeZone ?? 'UTC';

  const parsed = essaySchema.safeParse({
    ...formDataToObject(formData),
    dueAt: toIsoInstant(formData.get('dueAt'), timeZone),
  });
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    // Note the absence of `currentDraft` here: editing an essay's settings can
    // never touch the writing itself.
    await repository.updateEssay(session.userId, id.data, parsed.data);
    revalidatePath('/essays');
    revalidatePath(`/essays/${id.data}`);
    revalidatePath('/dashboard');
    return ok({ id: id.data });
  } catch (error) {
    return repositoryFailure(error, 'We could not save your changes.');
  }
}

/** Autosave dedupe window: identical consecutive autosaves are not re-versioned. */
const AUTOSAVE_MIN_GAP_MS = 90_000;

export async function saveDraft(input: {
  essayId: string;
  currentDraft: string;
  source?: 'autosave' | 'manual' | 'ai-assisted' | 'restored';
  note?: string | null;
}): Promise<ActionResult<{ savedAt: string; versionCreated: boolean }>> {
  const { session, repository } = await requireWorkspace();

  const parsed = essayDraftSchema.safeParse({
    essayId: input.essayId,
    currentDraft: input.currentDraft,
    source: input.source ?? 'autosave',
    note: input.note ?? '',
  });
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const essay = await repository.getEssay(session.userId, parsed.data.essayId);
    if (!essay) return fail('That essay could not be found.');

    const unchanged = essay.currentDraft === parsed.data.currentDraft;
    const versions = await repository.listEssayVersions(session.userId, essay.id);
    const latest = versions[0];

    /**
     * Versioning policy:
     *  - a manual save always creates a version, so a student can deliberately
     *    bookmark a moment;
     *  - autosave only creates one if the text actually changed and the last
     *    autosave was a while ago, so history stays readable instead of
     *    filling with one entry per keystroke burst.
     */
    let versionCreated = false;
    const isManual = parsed.data.source !== 'autosave';
    const lastWasRecentAutosave =
      latest?.source === 'autosave' &&
      Date.now() - new Date(latest.createdAt).getTime() < AUTOSAVE_MIN_GAP_MS;

    if (isManual || (!unchanged && !lastWasRecentAutosave)) {
      await repository.createEssayVersion(session.userId, {
        essayId: essay.id,
        content: parsed.data.currentDraft,
        source: parsed.data.source,
        note: parsed.data.note,
      });
      versionCreated = true;
    }

    if (!unchanged) {
      await repository.updateEssay(session.userId, essay.id, {
        currentDraft: parsed.data.currentDraft,
      });
    }

    revalidatePath(`/essays/${essay.id}`);
    revalidatePath('/essays');
    return ok({ savedAt: new Date().toISOString(), versionCreated });
  } catch (error) {
    return repositoryFailure(error, 'We could not save your draft.');
  }
}

/** Brainstorm and outline save separately from the draft. */
export async function saveEssayNotes(input: {
  essayId: string;
  brainstormNotes: string;
  outline: string;
}): Promise<ActionResult<{ savedAt: string }>> {
  const { session, repository } = await requireWorkspace();

  const parsed = essayNotesSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    await repository.updateEssay(session.userId, parsed.data.essayId, {
      brainstormNotes: parsed.data.brainstormNotes,
      outline: parsed.data.outline,
    });
    revalidatePath(`/essays/${parsed.data.essayId}`);
    return ok({ savedAt: new Date().toISOString() });
  } catch (error) {
    return repositoryFailure(error, 'We could not save your notes.');
  }
}

/**
 * Restores an earlier version.
 *
 * Restoring is additive: the current draft is first captured as its own
 * version, then the old text becomes the draft. Nothing in the history is
 * deleted, so a restore is always undoable.
 */
export async function restoreVersion(input: {
  essayId: string;
  versionId: string;
}): Promise<ActionResult<undefined>> {
  const { session, repository } = await requireWorkspace();

  const parsed = essayRestoreSchema.safeParse(input);
  if (!parsed.success) return fail('That version could not be found.');

  try {
    const [essay, version] = await Promise.all([
      repository.getEssay(session.userId, parsed.data.essayId),
      repository.getEssayVersion(session.userId, parsed.data.versionId),
    ]);
    if (!essay) return fail('That essay could not be found.');
    if (!version || version.essayId !== essay.id) return fail('That version could not be found.');

    if (essay.currentDraft !== version.content) {
      // Keep whatever is on screen right now before replacing it.
      await repository.createEssayVersion(session.userId, {
        essayId: essay.id,
        content: essay.currentDraft,
        source: 'manual',
        note: 'Saved automatically before restoring an earlier version',
      });

      await repository.updateEssay(session.userId, essay.id, {
        currentDraft: version.content,
      });

      await repository.createEssayVersion(session.userId, {
        essayId: essay.id,
        content: version.content,
        source: 'restored',
        note: `Restored from the version saved on ${new Date(version.createdAt).toISOString().slice(0, 10)}`,
      });
    }

    revalidatePath(`/essays/${essay.id}`);
    return ok();
  } catch (error) {
    return repositoryFailure(error, 'We could not restore that version.');
  }
}

export async function deleteEssay(essayId: string): Promise<ActionResult<undefined>> {
  const { session, repository } = await requireWorkspace();

  const id = idSchema.safeParse(essayId);
  if (!id.success) return fail('That essay could not be found.');

  try {
    await repository.deleteEssay(session.userId, id.data);
  } catch (error) {
    return repositoryFailure(error, 'We could not delete that essay.');
  }

  revalidatePath('/essays');
  revalidatePath('/dashboard');
  redirect('/essays');
}
