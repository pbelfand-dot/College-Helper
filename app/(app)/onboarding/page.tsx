import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireWorkspace } from '@/lib/data/factory';
import { OnboardingForm } from './onboarding-form';

export const metadata: Metadata = { title: 'Get set up' };

export default async function OnboardingPage() {
  const { session, repository } = await requireWorkspace();
  const profile = await repository.getProfile(session.userId);

  if (profile?.onboardingCompleted) redirect('/dashboard');

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-ink text-2xl font-semibold tracking-tight">
        Let&rsquo;s set up your workspace
      </h1>
      <p className="text-ink-muted mt-2 text-sm">
        Six quick questions. Only your name is required — everything else can be filled in later,
        and all of it is editable from Settings.
      </p>

      <OnboardingForm className="mt-8" />
    </div>
  );
}
