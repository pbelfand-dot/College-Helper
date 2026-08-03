import type { Metadata } from 'next';
import { requireProfile } from '@/lib/data/factory';
import { PageHeader } from '@/components/layout/page-header';
import { CollegeList } from '@/components/colleges/college-list';

export const metadata: Metadata = { title: 'Colleges' };

export default async function CollegesPage() {
  const { session, repository } = await requireProfile();
  const colleges = await repository.listColleges(session.userId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Your college list"
        description="Colleges you are exploring, considering, or applying to — with your own notes, tags and links. Nothing here is ranked, and nothing predicts your chances."
      />
      <CollegeList colleges={colleges} />
    </div>
  );
}
