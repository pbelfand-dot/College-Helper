import type { Metadata } from 'next';
import { requireWorkspace } from '@/lib/data/factory';
import { env, publicRuntimeConfig } from '@/lib/config/env';
import { PageHeader } from '@/components/layout/page-header';
import { AffiliationNotice } from '@/components/layout/affiliation-notice';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { ProfileSettingsForm } from '@/components/settings/profile-settings-form';
import { ExportMenu } from '@/components/settings/export-menu';
import { DangerZone } from '@/components/settings/danger-zone';
import { SignOutButton } from '@/components/settings/sign-out-button';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const { session, repository } = await requireWorkspace();
  const profile = await repository.getProfile(session.userId);
  const runtime = publicRuntimeConfig();

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <PageHeader
        title="Settings"
        description="Your profile, how the app looks, and what happens to your data."
      />

      <Section
        title="Profile"
        description="Used to organise your deadlines and to keep your writing sounding like you."
      >
        {profile ? <ProfileSettingsForm profile={profile} /> : null}
      </Section>

      <Section title="Appearance">
        <ThemeToggle />
        <p className="text-ink-muted mt-2 text-xs">
          Saved in this browser only. &ldquo;System&rdquo; follows your device setting.
        </p>
      </Section>

      <Section title="AI coaching" description="What the coach can see, and what it cannot do.">
        <dl className="grid gap-3 sm:grid-cols-2">
          <Detail label="Coach">
            {runtime.aiConfigured
              ? 'AI coach (Anthropic), configured on the server'
              : 'Offline coach — no AI key is configured'}
          </Detail>
          <Detail label="Where model calls happen">
            Server only. No key ever reaches your browser.
          </Detail>
        </dl>

        <ul className="text-ink-muted mt-4 flex flex-col gap-2 text-sm">
          <li>
            Nothing is sent to a model unless you press a coaching button. Your essay draft is
            attached only when that specific request needs it, and you can see exactly what will be
            sent before you send it.
          </li>
          <li>
            The coach will not write an essay as you, invent an experience you did not describe, or
            comment on your chances of admission.
          </li>
          <li>
            {runtime.aiConfigured
              ? 'Requests are rate limited per account.'
              : 'The offline coach builds its notes from your own text by rule, so it cannot invent anything at all.'}
          </li>
          <li>
            Do not enter Social Security numbers, bank details or passwords anywhere in ApplyPilot.
          </li>
        </ul>
      </Section>

      <Section
        title="Export your data"
        description="Everything you have stored, in formats you can actually open. Exports contain only your own records."
      >
        <ExportMenu />
      </Section>

      <Section title="Privacy">
        <ul className="text-ink-muted flex flex-col gap-2 text-sm">
          <li>
            <strong className="text-ink">What is stored:</strong> the colleges, applications,
            requirements, essays, activities, recommender requests, scholarships and tasks you
            enter.
          </li>
          <li>
            <strong className="text-ink">What is never stored:</strong> Social Security numbers,
            bank or payment details, government id numbers, test-score records, demographic
            profiling, or the text of any recommendation letter.
          </li>
          <li>
            <strong className="text-ink">Who can see it:</strong> only you.{' '}
            {runtime.storageAdapter === 'demo'
              ? 'In demo mode your workspace lives in server memory, tied to a cookie in this browser, and is discarded after about half a day.'
              : runtime.storageAdapter === 'file'
                ? 'Everything is stored in a single file on this computer. Nothing is uploaded, there is no account, and no server outside this machine ever sees it.'
                : 'Every database row is tied to your account and protected by row-level security, so another signed-in user cannot read your records even if they knew a record id.'}
          </li>
          <li>
            <strong className="text-ink">Logging:</strong> server logs record that a request
            happened and whether it failed. They never contain essay text, profile details, or the
            contents of a coaching request.
          </li>
        </ul>
        <AffiliationNotice className="mt-4" />
      </Section>

      {runtime.storageAdapter === 'file' ? (
        <Section title="Where your data lives">
          <p className="text-ink-muted text-sm">
            This copy of ApplyPilot runs entirely on this computer and stores everything in one
            file. There is no account to sign in or out of — whoever can use this user account on
            this machine can open the app. Use the export above to keep a backup somewhere else.
          </p>
        </Section>
      ) : (
        <Section title="Session">
          <SignOutButton />
        </Section>
      )}

      <DangerZone demoMode={env.demoMode} />
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-ink text-base font-semibold">{title}</h2>
        {description ? <p className="text-ink-muted mt-0.5 text-sm">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-line bg-surface rounded-[var(--radius)] border px-3 py-2.5">
      <dt className="text-ink-muted text-xs">{label}</dt>
      <dd className="text-ink mt-0.5 text-sm">{children}</dd>
    </div>
  );
}
