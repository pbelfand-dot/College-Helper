import type { Metadata } from 'next';
import { requireProfile } from '@/lib/data/factory';
import { publicRuntimeConfig } from '@/lib/config/env';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/page-header';
import { CoachWorkspace } from '@/components/coach/coach-workspace';

export const metadata: Metadata = { title: 'Coach' };

export default async function CoachPage() {
  const { session, repository } = await requireProfile();
  const runtime = publicRuntimeConfig();

  const [essays, activities, colleges] = await Promise.all([
    repository.listEssays(session.userId),
    repository.listActivities(session.userId),
    repository.listColleges(session.userId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Coach"
        description="Six ways to think out loud about your application. Every mode works from what you have already written — none of them will write it for you."
        actions={
          <Badge tone={runtime.aiConfigured ? 'accent' : 'neutral'}>
            {runtime.aiConfigured ? 'AI coach' : 'Offline coach'}
          </Badge>
        }
      />

      <div className="border-line bg-surface rounded-[var(--radius-lg)] border px-4 py-3.5">
        <h2 className="text-ink text-sm font-semibold">How to use this well</h2>
        <ul className="text-ink-muted mt-2 flex flex-col gap-1.5 text-sm">
          <li>
            Bring specifics. &ldquo;I volunteered a lot&rdquo; gets you generic questions; &ldquo;I
            sorted donations on Thursdays for two years and quit when work changed&rdquo; gets you
            something useful.
          </li>
          <li>
            Take what helps and ignore the rest. Nothing here is applied to your work unless you do
            it yourself.
          </li>
          <li>
            It cannot tell you where you will get in, and it will not pretend to. Anything it says
            about a college is a question for you to verify, not a fact.
          </li>
        </ul>
        {!runtime.aiConfigured ? (
          <p className="border-line text-ink-subtle mt-3 border-t pt-2.5 text-xs">
            No AI key is configured, so the offline coach is running. It builds its notes from your
            own text by rule — it reads structure, counts, repetition and vague phrasing. It is more
            limited than a model, and it cannot invent anything at all.
          </p>
        ) : null}
      </div>

      <CoachWorkspace essays={essays} activities={activities} colleges={colleges} />
    </div>
  );
}
