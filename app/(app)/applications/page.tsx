import type { Metadata } from 'next';
import { requireProfile } from '@/lib/data/factory';
import { summarizeApplications } from '@/lib/domain/progress';
import { PageHeader } from '@/components/layout/page-header';
import { ApplicationViews } from '@/components/applications/application-views';

export const metadata: Metadata = { title: 'Applications' };

export default async function ApplicationsPage() {
  const { session, repository, profile } = await requireProfile();

  const [colleges, applications, requirements] = await Promise.all([
    repository.listColleges(session.userId),
    repository.listApplications(session.userId),
    repository.listRequirements(session.userId),
  ]);

  const entries = summarizeApplications(applications, requirements).sort((a, b) =>
    (a.application.deadlineAt ?? '9999').localeCompare(b.application.deadlineAt ?? '9999'),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Applications"
        description="One row per application. “Checklist” is completed required items divided by total required items — the same number you can count yourself on each application page."
      />
      <ApplicationViews entries={entries} colleges={colleges} timeZone={profile.timeZone} />
    </div>
  );
}
