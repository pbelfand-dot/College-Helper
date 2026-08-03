import type { Metadata } from 'next';
import { requireProfile } from '@/lib/data/factory';
import { PageHeader } from '@/components/layout/page-header';
import { EssayList } from '@/components/essays/essay-list';

export const metadata: Metadata = { title: 'Essays' };

export default async function EssaysPage() {
  const { session, repository, profile } = await requireProfile();

  const [essays, colleges, applications] = await Promise.all([
    repository.listEssays(session.userId),
    repository.listColleges(session.userId),
    repository.listApplications(session.userId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Essays"
        description="Every essay has a brainstorm space, an outline, a draft that autosaves, and a full version history. Nothing you write is sent anywhere unless you ask for coaching on it."
      />
      <EssayList
        essays={essays}
        colleges={colleges}
        applications={applications}
        timeZone={profile.timeZone}
      />
    </div>
  );
}
