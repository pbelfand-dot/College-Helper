import type { Metadata } from 'next';
import { requireProfile } from '@/lib/data/factory';
import { PageHeader } from '@/components/layout/page-header';
import { ScholarshipList } from '@/components/scholarships/scholarship-list';

export const metadata: Metadata = { title: 'Scholarships' };

export default async function ScholarshipsPage() {
  const { session, repository, profile } = await requireProfile();

  const [scholarships, essays] = await Promise.all([
    repository.listScholarships(session.userId),
    repository.listEssays(session.userId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Scholarships"
        description="What you found, what it asks for, and when you last checked it. Scholarship listings change and close without notice, so keep the official link and confirm the details there before you rely on them."
      />
      <ScholarshipList scholarships={scholarships} essays={essays} timeZone={profile.timeZone} />
    </div>
  );
}
