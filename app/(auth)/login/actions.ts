'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { env } from '@/lib/config/env';
import { clearedDemoCookie, newDemoCookie } from '@/lib/auth/session';
import { getWorkspace, resetWorkspace } from '@/lib/data/demo/store';
import { type ActionResult, fail, ok } from '@/lib/utils/result';

const startDemoSchema = z.object({
  /** "seeded" gives the sample student; "empty" starts from a blank workspace. */
  variant: z.enum(['seeded', 'empty']).default('seeded'),
});

/** Creates a fresh demo workspace and signs the visitor into it. */
export async function startDemoSession(formData: FormData): Promise<void> {
  if (!env.demoMode) redirect('/login');

  const parsed = startDemoSchema.safeParse({ variant: formData.get('variant') ?? 'seeded' });
  const variant = parsed.success ? parsed.data.variant : 'seeded';

  const cookie = newDemoCookie();
  const store = await cookies();
  store.set(cookie.name, cookie.value, cookie.options);

  // Materialise the workspace now so the dashboard has data on first render.
  const workspaceId = cookie.value.slice(0, cookie.value.lastIndexOf('.'));
  resetWorkspace(workspaceId, variant === 'seeded');

  redirect(variant === 'seeded' ? '/dashboard' : '/onboarding');
}

const emailSchema = z.object({
  email: z.email('Enter a valid email address.'),
});

/** Sends a Supabase magic link. Only reachable when Supabase is configured. */
export async function signInWithEmail(
  _previous: ActionResult<{ sent: true }> | null,
  formData: FormData,
): Promise<ActionResult<{ sent: true }>> {
  if (env.demoMode) {
    return fail('ApplyPilot is running in demo mode, so email sign-in is disabled.');
  }

  const parsed = emailSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return fail('Please check the form.', z.flattenError(parsed.error).fieldErrors);
  }

  const { createServerSupabaseClient } = await import('@/lib/data/supabase/server-client');
  const supabase = await createServerSupabaseClient();
  if (!supabase) return fail('Sign-in is not available right now.');

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${env.appUrl}/auth/callback` },
  });

  if (error) {
    // Never log the address itself.
    console.error('[auth] magic link request failed');
    return fail('We could not send that link. Please try again in a moment.');
  }

  return ok({ sent: true } as const);
}

export async function signOut(): Promise<void> {
  // Nothing to sign out of on the desktop: there is one account, it is the
  // person using the computer, and the button is not rendered there.
  if (env.storage === 'file') redirect('/dashboard');

  const store = await cookies();

  if (env.demoMode) {
    // Leave the workspace in memory so a refresh does not resurrect it, but
    // drop the cookie so this browser can no longer reach it.
    const raw = store.get(clearedDemoCookie.name)?.value;
    if (raw) {
      const workspaceId = raw.slice(0, raw.lastIndexOf('.'));
      if (workspaceId) getWorkspace(workspaceId);
    }
    store.set(clearedDemoCookie.name, clearedDemoCookie.value, clearedDemoCookie.options);
  } else {
    const { createServerSupabaseClient } = await import('@/lib/data/supabase/server-client');
    const supabase = await createServerSupabaseClient();
    await supabase?.auth.signOut();
  }

  redirect('/');
}
