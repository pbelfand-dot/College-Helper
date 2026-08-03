import type { Metadata } from 'next';
import { requireProfile } from '@/lib/data/factory';
import { PageHeader } from '@/components/layout/page-header';
import { ActivityList } from '@/components/activities/activity-list';

export const metadata: Metadata = { title: 'Activities' };

export default async function ActivitiesPage() {
  const { session, repository, profile } = await requireProfile();
  const activities = await repository.listActivities(session.userId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Activities"
        description="How you actually spend your time. A part-time job and looking after a younger sibling belong here just as much as a club does — this is not a list of impressive things."
      />
      <ActivityList activities={activities} timeZone={profile.timeZone} />
    </div>
  );
}
