import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { env } from '@/lib/config/env';
import { getSession } from '@/lib/auth/session';
import { Logo } from '@/components/layout/logo';
import { AffiliationNotice } from '@/components/layout/affiliation-notice';
import { DemoSignInForm } from './demo-sign-in-form';
import { SupabaseSignInForm } from './supabase-sign-in-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect('/dashboard');

  const demo = env.demoMode;

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-line bg-surface px-5 py-3.5">
        <div className="mx-auto max-w-5xl">
          <Logo href="/" />
        </div>
      </header>

      <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {demo ? 'Open your demo workspace' : 'Sign in to ApplyPilot'}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {demo
            ? 'No account, no email, no credentials. You get a private sample workspace seeded with a fictional student, stored only for this browser session.'
            : 'Use the email address you signed up with. We will send you a link — there is no password to remember.'}
        </p>

        <div className="mt-7">{demo ? <DemoSignInForm /> : <SupabaseSignInForm />}</div>

        <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6">
          <AffiliationNotice />
          <p className="text-xs text-ink-subtle">
            Do not enter Social Security numbers, bank details or passwords for other services
            anywhere in ApplyPilot. We never ask for them.{' '}
            <Link href="/" className="underline underline-offset-2">
              Back to the overview
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
