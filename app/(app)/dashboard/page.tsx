import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, FileText, GraduationCap, ListChecks, Plus, Users } from 'lucide-react';
import { requireProfile } from '@/lib/data/factory';
import { buildDashboardSummary } from '@/lib/domain/dashboard';
import { formatDate } from '@/lib/dates/format';
import { applicationRoundLabels } from '@/lib/domain/labels';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/progress-bar';
import { EmptyState } from '@/components/ui/states';
import { PageHeader } from '@/components/layout/page-header';
import { DashboardSection, StatTile } from '@/components/dashboard/section';
import { UpcomingDeadlineList } from '@/components/dashboard/upcoming-deadlines';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const { session, repository, profile } = await requireProfile();
  const userId = session.userId;

  const [
    colleges,
    applications,
    requirements,
    essays,
    activities,
    recommenders,
    scholarships,
    tasks,
  ] = await Promise.all([
    repository.listColleges(userId),
    repository.listApplications(userId),
    repository.listRequirements(userId),
    repository.listEssays(userId),
    repository.listActivities(userId),
    repository.listRecommenders(userId),
    repository.listScholarships(userId),
    repository.listTasks(userId),
  ]);

  const now = new Date();
  const summary = buildDashboardSummary({
    profile,
    colleges,
    applications,
    requirements,
    essays,
    activities,
    recommenders,
    scholarships,
    tasks,
    now,
  });

  const collegeNames = new Map(colleges.map((college) => [college.id, college.name]));
  const isNewWorkspace = colleges.length === 0 && essays.length === 0 && activities.length === 0;
  const soonest = [
    ...summary.deadlines.overdue,
    ...summary.deadlines.next7,
    ...summary.deadlines.next14,
  ];

  return (
    <div className="flex flex-col gap-9">
      <PageHeader
        title={`Hi ${profile.displayName}`}
        description={
          isNewWorkspace
            ? 'Your workspace is empty. Adding one college is a good first step — everything else hangs off that.'
            : summarySentence(summary.deadlines.next7.length, summary.deadlines.overdue.length)
        }
        actions={
          <>
            <Button asChild variant="secondary" size="sm">
              <Link href="/calendar">
                <Plus aria-hidden="true" />
                Add task
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/colleges">
                <Plus aria-hidden="true" />
                Add college
              </Link>
            </Button>
          </>
        }
      />

      {isNewWorkspace ? (
        <EmptyState
          icon={GraduationCap}
          title="Start with one college"
          description="Add a college you are considering. From there you can create an application, build its requirement checklist, and link essays to it."
          action={
            <Button asChild>
              <Link href="/colleges">Add your first college</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="Due in the next 7 days"
              value={summary.deadlines.next7.length}
              hint={`${summary.deadlines.next30.length + summary.deadlines.next14.length + summary.deadlines.next7.length} in the next 30`}
              href="/calendar"
              tone={summary.deadlines.next7.length > 0 ? 'accent' : 'neutral'}
            />
            <StatTile
              label="Past their deadline"
              value={summary.deadlines.overdue.length}
              hint={
                summary.deadlines.overdue.length > 0
                  ? 'Worth a look — some may be fine'
                  : 'Nothing overdue'
              }
              href="/calendar"
              tone={summary.deadlines.overdue.length > 0 ? 'warning' : 'neutral'}
            />
            <StatTile
              label="Applications in progress"
              value={summary.needsAttention.length}
              hint="With required items left"
              href="/applications"
            />
            <StatTile
              label="Open tasks"
              value={summary.openTaskCount}
              hint={`${tasks.length} total`}
              href="/calendar"
            />
          </div>

          <DashboardSection
            title="Coming up"
            description="Every deadline shows its year and time zone."
            href="/calendar"
            linkLabel="Open calendar"
          >
            <UpcomingDeadlineList
              items={soonest}
              now={now}
              max={6}
              emptyTitle="Nothing in the next two weeks"
              emptyDescription="You are clear for now. Deadlines further out are on the calendar."
            />
          </DashboardSection>

          <DashboardSection
            title="Applications needing attention"
            description="Checklist completion is simply your completed required items divided by your total required items."
            href="/applications"
          >
            {summary.needsAttention.length === 0 ? (
              <EmptyState
                icon={ListChecks}
                title="No outstanding required items"
                description="Every application you are working on has its required checklist items complete. Add more requirements as you confirm them on each college's website."
              />
            ) : (
              <ul className="flex flex-col gap-2.5">
                {summary.needsAttention.slice(0, 4).map((entry) => (
                  <li key={entry.application.id}>
                    <Link
                      href={`/applications/${entry.application.id}`}
                      className="border-line bg-surface hover:border-line-strong flex flex-col gap-3 rounded-[var(--radius-lg)] border px-4 py-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-ink text-sm font-medium">
                            {collegeNames.get(entry.application.collegeId) ?? 'Application'}
                          </span>
                          <Badge tone="neutral">
                            {applicationRoundLabels[entry.application.applicationRound]}
                          </Badge>
                        </div>
                        <p className="text-ink-muted mt-1 text-xs">
                          {entry.missing.length} required{' '}
                          {entry.missing.length === 1 ? 'item' : 'items'} left
                          {entry.application.deadlineAt
                            ? ` · due ${formatDate(entry.application.deadlineAt, entry.application.deadlineTimeZone)}`
                            : ''}
                        </p>
                      </div>
                      <div className="w-full shrink-0 sm:w-44">
                        <ProgressBar
                          percent={entry.completion.percent}
                          completed={entry.completion.completed}
                          total={entry.completion.total}
                          size="sm"
                        />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </DashboardSection>

          <div className="grid gap-9 lg:grid-cols-2">
            <DashboardSection title="Essays" href="/essays">
              <div className="border-line bg-surface rounded-[var(--radius-lg)] border px-4 py-4">
                <ProgressBar
                  percent={summary.essayProgress.percentFinished}
                  label="Essays marked final"
                  completed={summary.essayProgress.finished}
                  total={summary.essayProgress.total}
                />
                <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <Stat label="Not started" value={summary.essayProgress.notStarted} />
                  <Stat label="In progress" value={summary.essayProgress.inProgress} />
                  <Stat label="Final" value={summary.essayProgress.finished} />
                </dl>
                {summary.essaysDueSoon.length > 0 ? (
                  <div className="border-line mt-4 border-t pt-3">
                    <p className="text-ink text-xs font-medium">Due within two weeks</p>
                    <ul className="mt-1.5 flex flex-col gap-1">
                      {summary.essaysDueSoon.slice(0, 3).map((essay) => (
                        <li key={essay.id}>
                          <Link
                            href={`/essays/${essay.id}`}
                            className="group text-ink-muted hover:text-ink flex items-center gap-1 text-xs"
                          >
                            <span className="truncate">{essay.title}</span>
                            <ArrowUpRight
                              className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                              aria-hidden="true"
                            />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </DashboardSection>

            <DashboardSection title="Activities" href="/activities">
              <div className="border-line bg-surface rounded-[var(--radius-lg)] border px-4 py-4">
                <dl className="grid grid-cols-3 gap-3 text-center">
                  <Stat label="On your list" value={summary.activities.total} />
                  <Stat label="No description" value={summary.activities.missingDescription} />
                  <Stat label="Over the limit" value={summary.activities.overLimit} />
                </dl>
                <p className="text-ink-muted mt-3.5 text-xs">
                  Character limits are yours to set per activity. ApplyPilot does not assume any
                  particular application&rsquo;s current limit.
                </p>
                {summary.activities.total === 0 ? (
                  <Button asChild variant="secondary" size="sm" className="mt-3">
                    <Link href="/activities">
                      <FileText aria-hidden="true" />
                      Add an activity
                    </Link>
                  </Button>
                ) : null}
              </div>
            </DashboardSection>
          </div>

          <div className="grid gap-9 lg:grid-cols-2">
            <DashboardSection title="Recommendation follow-ups" href="/recommendations">
              {summary.recommendationFollowUps.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No follow-ups due"
                  description="When you set a follow-up date on a recommender, it will appear here — once, not as a nag."
                />
              ) : (
                <ul className="divide-line border-line bg-surface divide-y overflow-hidden rounded-[var(--radius-lg)] border">
                  {summary.recommendationFollowUps.slice(0, 4).map((recommender) => (
                    <li key={recommender.id} className="px-4 py-3">
                      <p className="text-ink text-sm font-medium">{recommender.name}</p>
                      <p className="text-ink-muted text-xs">
                        {recommender.organizationOrSubject ?? 'Recommender'}
                        {recommender.followUpAt
                          ? ` · follow up ${formatDate(recommender.followUpAt, profile.timeZone)}`
                          : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </DashboardSection>

            <DashboardSection title="Research to refresh" href="/colleges">
              {summary.staleResearch.length === 0 ? (
                <EmptyState
                  icon={GraduationCap}
                  title="Your college notes look current"
                  description="Colleges appear here when they have no notes yet, or when you last verified them more than 30 days ago."
                />
              ) : (
                <ul className="divide-line border-line bg-surface divide-y overflow-hidden rounded-[var(--radius-lg)] border">
                  {summary.staleResearch.slice(0, 4).map((college) => (
                    <li key={college.id}>
                      <Link
                        href={`/colleges/${college.id}`}
                        className="hover:bg-surface-muted block px-4 py-3 transition-colors"
                      >
                        <p className="text-ink text-sm font-medium">{college.name}</p>
                        <p className="text-ink-muted text-xs">
                          {college.lastVerifiedAt
                            ? `Last verified ${formatDate(college.lastVerifiedAt, profile.timeZone)}`
                            : 'Never marked as verified'}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </DashboardSection>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-ink-muted text-xs">{label}</dt>
      <dd className="text-ink text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

/** Calm, factual framing. No exclamation marks, no urgency manufacturing. */
function summarySentence(dueSoon: number, overdue: number): string {
  if (overdue > 0 && dueSoon > 0) {
    return `${overdue} ${overdue === 1 ? 'deadline has' : 'deadlines have'} passed and ${dueSoon} ${dueSoon === 1 ? 'is' : 'are'} coming up this week. Here is where things stand.`;
  }
  if (overdue > 0) {
    return `${overdue} ${overdue === 1 ? 'deadline has' : 'deadlines have'} passed — some may be fine, but worth checking.`;
  }
  if (dueSoon > 0) {
    return `${dueSoon} ${dueSoon === 1 ? 'deadline is' : 'deadlines are'} coming up in the next seven days.`;
  }
  return 'Nothing is due in the next seven days. Here is where things stand.';
}
