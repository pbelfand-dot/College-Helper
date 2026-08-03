'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { RecommenderStatusBadge } from '@/components/ui/status-badge';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/dates/format';
import type { Recommender } from '@/lib/domain/types';
import {
  linkRecommenderToApplication,
  unlinkRecommenderFromApplication,
} from '@/app/(app)/applications/actions';

/**
 * Which recommenders this application needs.
 *
 * Only the request is tracked. The letter itself is confidential between the
 * recommender and the college, and ApplyPilot has nowhere to put one.
 */
export function ApplicationRecommenders({
  applicationId,
  recommenders,
  linkedIds,
  timeZone,
}: {
  applicationId: string;
  recommenders: Recommender[];
  linkedIds: string[];
  timeZone: string;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const linked = new Set(linkedIds);

  async function toggle(recommender: Recommender, shouldLink: boolean) {
    setPendingId(recommender.id);
    const result = shouldLink
      ? await linkRecommenderToApplication(applicationId, recommender.id)
      : await unlinkRecommenderFromApplication(applicationId, recommender.id);
    setPendingId(null);

    if (result.ok) {
      notify(shouldLink ? `${recommender.name} linked.` : `${recommender.name} unlinked.`);
      router.refresh();
    } else {
      notify(result.error, 'error');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">Recommenders</h2>
        <Button asChild variant="ghost" size="sm">
          <Link href="/recommendations">Manage</Link>
        </Button>
      </div>

      {recommenders.length === 0 ? (
        <p className="rounded-[var(--radius-lg)] border border-dashed border-line-strong px-4 py-5 text-sm text-ink-muted">
          You have not added any recommenders yet. Add them on the{' '}
          <Link href="/recommendations" className="underline underline-offset-2">
            Recommendations page
          </Link>
          , then link the ones this college needs.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
          {recommenders.map((recommender) => {
            const isLinked = linked.has(recommender.id);
            return (
              <li
                key={recommender.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{recommender.name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <span>{recommender.organizationOrSubject ?? recommender.role ?? 'Recommender'}</span>
                    {recommender.dueAt ? <span>· due {formatDate(recommender.dueAt, timeZone)}</span> : null}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <RecommenderStatusBadge status={recommender.status} />
                  <Button
                    variant={isLinked ? 'ghost' : 'secondary'}
                    size="sm"
                    loading={pendingId === recommender.id}
                    onClick={() => toggle(recommender, !isLinked)}
                  >
                    {isLinked ? 'Unlink' : 'Link'}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-ink-subtle">
        ApplyPilot tracks that you asked and when it is due. It never stores the letter — that stays
        between your recommender and the college.
      </p>
    </div>
  );
}
