import 'server-only';

import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { env } from '@/lib/config/env';
import type { Database } from './database.types';

export type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Request-scoped Supabase client.
 *
 * Uses the *anon* key plus the user's session cookie, so every query runs as
 * that user and row-level security applies. The service-role key is never used
 * here — it would bypass RLS, which is exactly the protection we rely on.
 *
 * Returns null when Supabase is not configured, which is how the app falls back
 * to demo mode instead of crashing.
 */
export async function createServerSupabaseClient(): Promise<TypedSupabaseClient | null> {
  if (!env.supabase.isConfigured) return null;

  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabase.url as string, env.supabase.anonKey as string, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a server component, where cookies are read-only.
          // Middleware refreshes the session instead; nothing to do here.
        }
      },
    },
  });
}
