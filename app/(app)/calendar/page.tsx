import type { Metadata } from 'next';
import { requireProfile } from '@/lib/data/factory';
import { collectDeadlines } from '@/lib/domain/deadlines';
import { PageHeader } from '@/components/layout/page-header';
import { CalendarView } from '@/components/calendar/calendar-view';

export const metadata: Metadata = { title: 'Calendar' };

export default async function CalendarPage() {
  const { session, repository, profile } = await requireProfile();

  const [applications, colleges, essays, recommenders, scholarships, tasks] = await Promise.all([
    repository.listApplications(session.userId),
    repository.listColleges(session.userId),
    repository.listEssays(session.userId),
    repository.listRecommenders(session.userId),
    repository.listScholarships(session.userId),
    repository.listTasks(session.userId),
  ]);

  const items = collectDeadlines({
    applications,
    colleges,
    essays,
    recommenders,
    scholarships,
    tasks,
    fallbackTimeZone: profile.timeZone,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Calendar"
        description="Every deadline you have recorded, in one place. Dates always show their year, and each one keeps the time zone it was set in."
      />
      <CalendarView
        items={items}
        tasks={tasks}
        applications={applications}
        colleges={colleges}
        essays={essays}
        scholarships={scholarships}
        timeZone={profile.timeZone}
      />
    </div>
  );
}
