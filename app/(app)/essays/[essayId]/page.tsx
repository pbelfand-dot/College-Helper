import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireProfile } from '@/lib/data/factory';
import { formatDate } from '@/lib/dates/format';
import { essayStatusLabels } from '@/lib/domain/labels';
import { Badge } from '@/components/ui/badge';
import { EssayStatusBadge } from '@/components/ui/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { EssayEditor } from '@/components/essays/essay-editor';
import { EssayActions } from '@/components/essays/essay-actions';

export const metadata: Metadata = { title: 'Essay' };

export default async function EssayDetailPage({
  params,
}: {
  params: Promise<{ essayId: string }>;
}) {
  const { essayId } = await params;
  const { session, repository, profile } = await requireProfile();

  const essay = await repository.getEssay(session.userId, essayId);
  if (!essay) notFound();

  const [versions, colleges, applications] = await Promise.all([
    repository.listEssayVersions(session.userId, essay.id),
    repository.listColleges(session.userId),
    repository.listApplications(session.userId),
  ]);

  const college = essay.collegeId
    ? colleges.find((entry) => entry.id === essay.collegeId)
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'Essays', href: '/essays' }, { label: essay.title }]}
        title={essay.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <EssayStatusBadge status={essay.status} />
            {college ? <Badge tone="neutral">{college.name}</Badge> : null}
            {essay.dueAt ? (
              <span className="text-sm text-ink-muted">
                Your due date: {formatDate(essay.dueAt, profile.timeZone)}
              </span>
            ) : null}
          </span>
        }
        actions={
          <EssayActions
            essay={essay}
            colleges={colleges}
            applications={applications}
            timeZone={profile.timeZone}
          />
        }
      />

      {essay.prompt ? (
        <section className="rounded-[var(--radius-lg)] border border-line bg-surface px-4 py-3.5">
          <h2 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">The prompt</h2>
          <p className="mt-1.5 text-sm whitespace-pre-wrap text-ink">{essay.prompt}</p>
          <p className="mt-2 text-xs text-ink-subtle">
            Check this against the official application site — prompts and limits change between
            years. The limit shown in the editor is the one you entered ({' '}
            {essay.limitType === 'none'
              ? 'no limit set'
              : `${essay.limitValue ?? 0} ${essay.limitType}`}
            ).
          </p>
        </section>
      ) : null}

      <EssayEditor essay={essay} versions={versions} timeZone={profile.timeZone} />

      <p className="text-xs text-ink-subtle">
        Status: {essayStatusLabels[essay.status]}. Your writing is stored only in your own workspace,
        and nothing is sent to an AI model unless you ask for it on a specific request.
      </p>
    </div>
  );
}
