import 'server-only';

import { cookies } from 'next/headers';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/config/env';
import { DEMO_USER_ID } from '@/lib/data/demo/seed';

/**
 * Session resolution.
 *
 * Demo mode: an httpOnly cookie carries an opaque workspace id, signed with an
 * HMAC so a visitor cannot hand-edit it to reach somebody else's workspace. The
 * id is random and contains nothing about the person.
 *
 * Supabase mode: the Supabase session cookie is the source of truth and the
 * user id comes from the verified JWT, never from anything client-supplied.
 */

export const DEMO_COOKIE = 'applypilot_demo';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12;

/**
 * Signing secret for the demo cookie. In demo mode there is nothing private
 * behind the signature — it only stops one demo visitor from typing another
 * visitor's workspace id — so a per-process random secret is appropriate and
 * avoids requiring configuration for the zero-credential path.
 */
function demoSecret(): string {
  const key = Symbol.for('applypilot.demo.secret');
  const scope = globalThis as typeof globalThis & { [key]?: string };
  if (!scope[key]) scope[key] = randomUUID() + randomUUID();
  return scope[key];
}

function sign(workspaceId: string): string {
  return createHmac('sha256', demoSecret()).update(workspaceId).digest('base64url');
}

function verify(value: string): string | null {
  const separator = value.lastIndexOf('.');
  if (separator <= 0) return null;

  const workspaceId = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  const expected = sign(workspaceId);

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return workspaceId;
}

export function encodeDemoCookie(workspaceId: string): string {
  return `${workspaceId}.${sign(workspaceId)}`;
}

export interface Session {
  userId: string;
  /** Which storage adapter this session reads and writes through. */
  mode: 'demo' | 'file' | 'supabase';
  /** Demo only: which in-memory workspace this visitor owns. */
  workspaceId: string | null;
  email: string | null;
}

/**
 * The single account the desktop build runs as.
 *
 * A fixed id rather than a random one, because it has to match the ids already
 * written into the data file the last time the app ran.
 */
export const LOCAL_USER_ID = '00000000-0000-4000-8000-000000000001';

export const LOCAL_SESSION: Session = {
  userId: LOCAL_USER_ID,
  mode: 'file',
  workspaceId: null,
  email: null,
};

/** Returns the active session, or null when nobody is signed in. */
export async function getSession(): Promise<Session | null> {
  /*
   * The desktop build has no sign-in and does not pretend to. The server is
   * bound to 127.0.0.1, the data file sits in the operating system's per-user
   * application directory, and the boundary around a student's records is the
   * one their computer already provides. A login form over a local-only server
   * would add a password to remember and protect nothing that the OS account
   * does not already protect.
   */
  if (env.storage === 'file') return LOCAL_SESSION;
  if (env.demoMode) return getDemoSession();
  return getSupabaseSession();
}

async function getDemoSession(): Promise<Session | null> {
  const store = await cookies();
  const raw = store.get(DEMO_COOKIE)?.value;
  if (!raw) return null;

  const workspaceId = verify(raw);
  if (!workspaceId) return null;

  return { userId: DEMO_USER_ID, mode: 'demo', workspaceId, email: null };
}

async function getSupabaseSession(): Promise<Session | null> {
  // Imported lazily so the Supabase client is never pulled into demo-mode builds.
  const { createServerSupabaseClient } = await import('@/lib/data/supabase/server-client');
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  // getUser() revalidates the token with Supabase rather than trusting the cookie.
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  return {
    userId: data.user.id,
    mode: 'supabase',
    workspaceId: null,
    email: data.user.email ?? null,
  };
}

/** Creates a fresh demo workspace and returns the cookie options to set. */
export function newDemoCookie(): { name: string; value: string; options: CookieOptions } {
  const workspaceId = randomUUID();
  return {
    name: DEMO_COOKIE,
    value: encodeDemoCookie(workspaceId),
    options: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: COOKIE_MAX_AGE_SECONDS,
    },
  };
}

export interface CookieOptions {
  httpOnly: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  secure: boolean;
  path: string;
  maxAge: number;
}

export const clearedDemoCookie = {
  name: DEMO_COOKIE,
  value: '',
  options: {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  },
};
