import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireProfile } from '@/lib/data/factory';
import { formatDate, formatDeadline } from '@/lib/dates/format';
import {
  applicationRoundHints,
  applicationRoundLabels,
  decisionResultLabels,
  feeWaiverStatusLabels,
  testingPlanLabels,
  transcriptStatusLabels,
} from '@/lib/domain/labels';
import { Badge } from '@/components/ui/badge';
import { DeadlineBadge } from '@/components/ui/deadline-badge';
import { ApplicationStatusBadge, DecisionBadge } from '@/components/ui/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { RequirementChecklist } from '@/components/applications/requirement-checklist';
import { ApplicationActions } from '@/components/applications/application-actions';
import { ApplicationRecommenders } from '@/components/applications/application-recommenders';

export const metadata: Metadata = { title: 'Application' };

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const { session, repository, profile } = await requireProfile();

  const application = await repository.getApplication(session.userId, applicationId);
  if (!application) notFound();

  const [college, colleges, requirements, essays, recommenders, links] = await Promise.all([
    repository.getCollege(session.userId, application.collegeId),
    repository.listColleges(session.userId),
    repository.listRequirements(session.userId, application.id),
    repository.listEssays(session.userId),
    repository.listRecommenders(session.userId),
    repository.listApplicationRecommenders(session.userId),
  ]);

  const linkedEssays = essays.filter((essay) => essay.applicationId === application.id);
  const linkedRecommenderIds = new Set(
    links.filter((link) => link.applicationId === application.id).map((link) => link.recommenderId),
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        breadcrumbs={[
          { label: 'Applications', href: '/applications' },
          { label: college?.name ?? 'Application' },
        ]}
        title={college?.name ?? 'Application'}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{applicationRoundLabels[application.applicationRound]}</Badge>
            <ApplicationStatusBadge status={application.status} />
            <DecisionBadge result={application.decisionResult} />
          </span>
        }
        actions={
          <ApplicationActions
            application={application}
            colleges={colleges}
            collegeName={college?.name ?? 'this college'}
            defaultTimeZone={profile.timeZone}
          />
        }
      />

      <section className="border-line bg-surface grid gap-4 rounded-[var(--radius-lg)] border px-4 py-4 sm:grid-cols-2">
        <div>
          <h2 className="text-ink-muted text-xs font-semibold tracking-wide uppercase">Deadline</h2>
          <p className="text-ink mt-1 text-sm">
            {application.deadlineAt
              ? formatDeadline(application.deadlineAt, application.deadlineTimeZone)
              : 'No deadline recorded yet.'}
          </p>
          <div className="mt-1.5">
            <DeadlineBadge
              dueAt={application.deadlineAt}
              timeZone={application.deadlineTimeZone}
              showDate={false}
            />
          </div>
          <p className="text-ink-subtle mt-2 text-xs">
            {applicationRoundHints[application.applicationRound]} Confirm the exact date and time on
            the college&rsquo;s official site.
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Detail label="Fee">
            {application.feeAmount === null
              ? 'Not recorded'
              : `$${application.feeAmount.toFixed(2)}`}
          </Detail>
          <Detail label="Fee waiver">{feeWaiverStatusLabels[application.feeWaiverStatus]}</Detail>
          <Detail label="Testing plan">{testingPlanLabels[application.testingPlan]}</Detail>
          <Detail label="Transcript">{transcriptStatusLabels[application.transcriptStatus]}</Detail>
          <Detail label="Submitted">
            {application.submittedAt
              ? formatDate(application.submittedAt, application.deadlineTimeZone)
              : 'Not yet'}
          </Detail>
          <Detail label="Decision">
            {decisionResultLabels[application.decisionResult]}
            {application.decisionAt
              ? ` · ${formatDate(application.decisionAt, application.deadlineTimeZone)}`
              : ''}
          </Detail>
        </dl>
      </section>

      <RequirementChecklist
        applicationId={application.id}
        requirements={requirements}
        timeZone={application.deadlineTimeZone}
      />

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h2 className="text-ink text-base font-semibold">Linked essays</h2>
          {linkedEssays.length === 0 ? (
            <p className="border-line-strong text-ink-muted rounded-[var(--radius-lg)] border border-dashed px-4 py-5 text-sm">
              No essays are linked to this application. Open an essay from the{' '}
              <Link href="/essays" className="underline underline-offset-2">
                Essays page
              </Link>{' '}
              and choose this application to connect them.
            </p>
          ) : (
            <ul className="divide-line border-line bg-surface divide-y overflow-hidden rounded-[var(--radius-lg)] border">
              {linkedEssays.map((essay) => (
                <li key={essay.id}>
                  <Link
                    href={`/essays/${essay.id}`}
                    className="hover:bg-surface-muted block px-4 py-3 transition-colors"
                  >
                    <p className="text-ink text-sm font-medium">{essay.title}</p>
                    <p className="text-ink-muted mt-0.5 text-xs">
                      {essay.dueAt
                        ? `Due ${formatDate(essay.dueAt, profile.timeZone)}`
                        : 'No due date'}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <ApplicationRecommenders
          applicationId={application.id}
          recommenders={recommenders}
          linkedIds={[...linkedRecommenderIds]}
          timeZone={profile.timeZone}
        />
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="text-ink text-sm font-semibold">Financial aid checklist</h2>
          <p className="text-ink-muted mt-1.5 text-sm">
            Aid tasks live in the requirement checklist above — add them with the type “Financial
            aid” so they count towards this application&rsquo;s progress.
          </p>
          <p className="text-ink-subtle mt-2 text-xs">
            ApplyPilot does not give financial or legal advice. Aid rules are specific to each
            college and to your situation; use the college&rsquo;s official forms and their
            financial aid office.
          </p>
        </div>

        <div>
          <h2 className="text-ink text-sm font-semibold">Your notes</h2>
          {application.notes ? (
            <p className="text-ink-muted mt-1.5 text-sm whitespace-pre-wrap">{application.notes}</p>
          ) : (
            <p className="text-ink-subtle mt-1.5 text-sm italic">Nothing written here yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-ink-muted text-xs">{label}</dt>
      <dd className="text-ink mt-0.5">{children}</dd>
    </div>
  );
}
