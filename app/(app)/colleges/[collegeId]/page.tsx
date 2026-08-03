import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink, Plus } from 'lucide-react';
import { requireProfile } from '@/lib/data/factory';
import { formatDate } from '@/lib/dates/format';
import { applicationRoundLabels, institutionTypeLabels } from '@/lib/domain/labels';
import { calculateChecklistCompletion } from '@/lib/domain/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DeadlineBadge } from '@/components/ui/deadline-badge';
import { ProgressBar } from '@/components/ui/progress-bar';
import { EmptyState } from '@/components/ui/states';
import { ApplicationStatusBadge, ListStatusBadge } from '@/components/ui/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { CollegeActions } from '@/components/colleges/college-actions';
import { NewApplicationButton } from '@/components/applications/new-application-button';

export const metadata: Metadata = { title: 'College' };

export default async function CollegeDetailPage({
  params,
}: {
  params: Promise<{ collegeId: string }>;
}) {
  const { collegeId } = await params;
  const { session, repository, profile } = await requireProfile();

  const college = await repository.getCollege(session.userId, collegeId);
  if (!college) notFound();

  const [allApplications, allRequirements, essays, colleges] = await Promise.all([
    repository.listApplications(session.userId),
    repository.listRequirements(session.userId),
    repository.listEssays(session.userId),
    repository.listColleges(session.userId),
  ]);

  const applications = allApplications.filter((a) => a.collegeId === college.id);
  const applicationIds = new Set(applications.map((a) => a.id));
  const relatedEssays = essays.filter(
    (essay) => essay.collegeId === college.id || (essay.applicationId && applicationIds.has(essay.applicationId)),
  );

  const location = [college.city, college.stateOrRegion, college.country].filter(Boolean).join(', ');

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        breadcrumbs={[
          { label: 'Colleges', href: '/colleges' },
          { label: college.name },
        ]}
        title={college.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <ListStatusBadge status={college.listStatus} />
            {college.institutionType ? (
              <Badge tone="neutral">{institutionTypeLabels[college.institutionType]}</Badge>
            ) : null}
            {location ? <span className="text-sm text-ink-muted">{location}</span> : null}
          </span>
        }
        actions={
          <CollegeActions college={college} />
        }
      />

      <section className="rounded-[var(--radius-lg)] border border-line bg-surface px-4 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-ink">Information you have saved here</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {college.lastVerifiedAt
                ? `You last verified this against official sources on ${formatDate(college.lastVerifiedAt, profile.timeZone)}.`
                : 'You have not recorded a verification date yet. Deadlines and requirements change — check the official site.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {college.admissionsUrl ? (
              <Button asChild variant="secondary" size="sm">
                <a href={college.admissionsUrl} target="_blank" rel="noopener noreferrer">
                  Admissions site
                  <ExternalLink aria-hidden="true" />
                </a>
              </Button>
            ) : null}
            {college.financialAidUrl ? (
              <Button asChild variant="secondary" size="sm">
                <a href={college.financialAidUrl} target="_blank" rel="noopener noreferrer">
                  Financial aid
                  <ExternalLink aria-hidden="true" />
                </a>
              </Button>
            ) : null}
            {college.websiteUrl ? (
              <Button asChild variant="ghost" size="sm">
                <a href={college.websiteUrl} target="_blank" rel="noopener noreferrer">
                  Website
                  <ExternalLink aria-hidden="true" />
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-ink">Applications</h2>
          <NewApplicationButton
            colleges={colleges}
            defaultCollegeId={college.id}
            defaultTimeZone={profile.timeZone}
            label="Add application"
            size="sm"
            variant="secondary"
          />
        </div>

        {applications.length === 0 ? (
          <EmptyState
            title="No application yet for this college"
            description="Create one to start a requirement checklist, set a deadline and link your essays."
            action={
              <NewApplicationButton
                colleges={colleges}
                defaultCollegeId={college.id}
                defaultTimeZone={profile.timeZone}
                label="Create an application"
              />
            }
          />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {applications.map((application) => {
              const owned = allRequirements.filter((r) => r.applicationId === application.id);
              const completion = calculateChecklistCompletion(owned);
              return (
                <li key={application.id}>
                  <Link
                    href={`/applications/${application.id}`}
                    className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-line bg-surface px-4 py-3.5 transition-colors hover:border-line-strong sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-ink">
                          {applicationRoundLabels[application.applicationRound]}
                        </span>
                        <ApplicationStatusBadge status={application.status} />
                      </div>
                      <div className="mt-1.5">
                        <DeadlineBadge
                          dueAt={application.deadlineAt}
                          timeZone={application.deadlineTimeZone}
                        />
                      </div>
                    </div>
                    <div className="w-full shrink-0 sm:w-44">
                      <ProgressBar
                        percent={completion.percent}
                        completed={completion.completed}
                        total={completion.total}
                        size="sm"
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-ink">Essays for this college</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/essays">
              <Plus aria-hidden="true" />
              Manage essays
            </Link>
          </Button>
        </div>

        {relatedEssays.length === 0 ? (
          <p className="rounded-[var(--radius-lg)] border border-dashed border-line-strong px-4 py-5 text-sm text-ink-muted">
            No essays are linked to this college yet. Create one from the Essays page and choose this
            college, or link an existing essay to one of its applications.
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
            {relatedEssays.map((essay) => (
              <li key={essay.id}>
                <Link
                  href={`/essays/${essay.id}`}
                  className="block px-4 py-3 transition-colors hover:bg-surface-muted"
                >
                  <p className="text-sm font-medium text-ink">{essay.title}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {essay.limitType === 'none'
                      ? 'No limit set'
                      : `${essay.limitValue ?? 0} ${essay.limitType}`}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <NoteBlock title="Why this college interests you" body={college.fitNotes} />
        <NoteBlock title="Academic notes" body={college.academicNotes} />
        <NoteBlock title="Campus and life" body={college.campusNotes} />
        <NoteBlock
          title="Cost and aid questions"
          body={college.costNotes}
          footer="ApplyPilot does not give financial advice. Use the college's own net price calculator and talk to their financial aid office."
        />
        <NoteBlock
          title="Where your information came from"
          body={college.sourceNotes}
          footer="Requirements, deadlines and costs differ between colleges and change between years."
          className="sm:col-span-2"
        />
      </section>
    </div>
  );
}

function NoteBlock({
  title,
  body,
  footer,
  className,
}: {
  title: string;
  body: string | null;
  footer?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {body ? (
        <p className="mt-1.5 text-sm whitespace-pre-wrap text-ink-muted">{body}</p>
      ) : (
        <p className="mt-1.5 text-sm text-ink-subtle italic">Nothing written here yet.</p>
      )}
      {footer ? <p className="mt-2 text-xs text-ink-subtle">{footer}</p> : null}
    </div>
  );
}
