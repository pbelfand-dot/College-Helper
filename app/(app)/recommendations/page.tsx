import type { Metadata } from 'next';
import { requireProfile } from '@/lib/data/factory';
import { PageHeader } from '@/components/layout/page-header';
import { RecommenderList } from '@/components/recommendations/recommender-list';

export const metadata: Metadata = { title: 'Recommendations' };

export default async function RecommendationsPage() {
  const { session, repository, profile } = await requireProfile();

  const [recommenders, applications, colleges, applicationRecommenders] = await Promise.all([
    repository.listRecommenders(session.userId),
    repository.listApplications(session.userId),
    repository.listColleges(session.userId),
    repository.listApplicationRecommenders(session.userId),
  ]);

  // Only the two ids cross into the browser: the link rows also carry a user id
  // the client has no use for.
  const links = applicationRecommenders.map((link) => ({
    applicationId: link.applicationId,
    recommenderId: link.recommenderId,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Recommendations"
        description="Who you asked, when it is due, and whether you have said thank you. ApplyPilot never stores the letter itself — that is confidential between your recommender and the college. Only the request is tracked here."
      />
      <RecommenderList
        recommenders={recommenders}
        links={links}
        applications={applications}
        colleges={colleges}
        timeZone={profile.timeZone}
      />
    </div>
  );
}
