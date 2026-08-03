import { NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/lib/config/env';

/**
 * Supabase magic-link landing point.
 *
 * Exchanges the one-time code for a session cookie, then redirects. Only used
 * when Supabase is configured; in demo mode this route reports that it is not
 * in use rather than pretending to work.
 */

const codeSchema = z.string().min(1).max(512);

/** Only same-origin relative paths, so `next` cannot become an open redirect. */
function safeNextPath(value: string | null): string {
  if (!value) return '/dashboard';
  if (!value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  return value;
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const next = safeNextPath(url.searchParams.get('next'));

  if (!env.supabase.isConfigured) {
    return NextResponse.redirect(new URL('/login', url.origin));
  }

  const code = codeSchema.safeParse(url.searchParams.get('code'));
  if (!code.success) {
    return NextResponse.redirect(new URL('/login?error=link', url.origin));
  }

  const { createServerSupabaseClient } = await import('@/lib/data/supabase/server-client');
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.redirect(new URL('/login', url.origin));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code.data);
  if (error) {
    // Never log the code or the address it belonged to.
    console.error('[auth] code exchange failed');
    return NextResponse.redirect(new URL('/login?error=link', url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
