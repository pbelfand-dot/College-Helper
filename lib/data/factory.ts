import 'server-only';

import { redirect } from 'next/navigation';
import { env } from '@/lib/config/env';
import { getSession, type Session } from '@/lib/auth/session';
import { DemoRepository } from './demo/demo-repository';
import type { ApplyPilotRepository } from './repository';

/**
 * Chooses the storage adapter for a session.
 *
 * The rest of the app only ever sees `ApplyPilotRepository`, so switching a
 * deployment from demo storage to Supabase is a configuration change, not a
 * code change.
 */
export async function getRepositoryForSession(session: Session): Promise<ApplyPilotRepository> {
  if (session.mode === 'demo') {
    if (!session.workspaceId) {
      throw new Error('Demo session is missing its workspace.');
    }
    return new DemoRepository(session.workspaceId);
  }

  if (session.mode === 'file') {
    if (!env.dataFile) {
      throw new Error('File storage is selected but APPLYPILOT_DATA_FILE is not set.');
    }
    const { LocalRepository } = await import('./local/local-repository');
    return new LocalRepository(env.dataFile);
  }

  const { SupabaseRepository } = await import('./supabase/supabase-repository');
  const { createServerSupabaseClient } = await import('./supabase/server-client');
  const client = await createServerSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured.');
  }
  return new SupabaseRepository(client);
}

export interface Workspace {
  session: Session;
  repository: ApplyPilotRepository;
}

/**
 * The standard entry point for every authenticated page and server action.
 * Redirects to the login page when there is no session, so no caller has to
 * remember to check.
 */
export async function requireWorkspace(): Promise<Workspace> {
  const session = await getSession();
  if (!session) redirect('/login');
  return { session, repository: await getRepositoryForSession(session) };
}

/**
 * Like `requireWorkspace`, but also insists the student has finished
 * onboarding. Pages that need a profile (a time zone, a display name) use this
 * so they never have to handle a half-configured account.
 */
export async function requireProfile() {
  const { session, repository } = await requireWorkspace();
  const profile = await repository.getProfile(session.userId);
  if (!profile?.onboardingCompleted) redirect('/onboarding');
  return { session, repository, profile };
}

/** Same as `requireWorkspace`, but returns null instead of redirecting. */
export async function optionalWorkspace(): Promise<Workspace | null> {
  const session = await getSession();
  if (!session) return null;
  return { session, repository: await getRepositoryForSession(session) };
}

export function isDemoMode(): boolean {
  return env.demoMode;
}
