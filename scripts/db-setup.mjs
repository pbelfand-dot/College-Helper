#!/usr/bin/env node
/**
 * Prints the steps to set up ApplyPilot's Postgres schema on Supabase.
 *
 * Deliberately does not connect to anything: applying migrations needs
 * credentials this script has no business holding, and a student running the
 * demo should never be one command away from touching a real database.
 */

import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, '..', 'supabase', 'migrations');

const files = (await readdir(migrationsDir)).filter((name) => name.endsWith('.sql')).sort();

const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

console.log(`
ApplyPilot database setup
=========================

Supabase configured in this shell: ${configured ? 'yes' : 'no'}
${configured ? '' : '\nApplyPilot runs fine without it — you will get the seeded demo workspace.\n'}
Migrations to apply, in order:
${files.map((name, index) => `  ${index + 1}. supabase/migrations/${name}`).join('\n')}

Option A — Supabase CLI (recommended)
  1. npm install -g supabase
  2. supabase login
  3. supabase link --project-ref <your-project-ref>
  4. supabase db push

Option B — SQL editor
  1. Open your project at https://supabase.com/dashboard
  2. Go to SQL Editor
  3. Paste each file above in order and run it

After migrating
  - Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
  - Enable Email (magic link) sign-in under Authentication > Providers
  - Add <your app URL>/auth/callback to the allowed redirect URLs
  - Restart the dev server

Verifying row-level security
  Sign in as two different users and confirm that pasting one user's record id
  into the other's URL returns the not-found page. Every table has owner-only
  policies; 0002_policies.sql is what enforces that.

You do NOT need SUPABASE_SERVICE_ROLE_KEY for normal operation. The app reads
and writes as the signed-in user so that row-level security applies.
`);
