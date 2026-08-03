'use client';

import { useRouter } from 'next/navigation';
import { History, RotateCcw } from 'lucide-react';
import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DialogTrigger } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { countWords } from '@/lib/domain/counting';
import { formatDate } from '@/lib/dates/format';
import type { EssayVersion, VersionSource } from '@/lib/domain/types';
import { restoreVersion } from '@/app/(app)/essays/actions';

const sourceLabels: Record<VersionSource, string> = {
  autosave: 'Autosaved',
  manual: 'Saved by you',
  'ai-assisted': 'After applying a suggestion',
  restored: 'Restored',
};

/**
 * Version history.
 *
 * Restoring is presented as additive, and it is: the current draft is saved
 * first, so nothing a student wrote can be lost by pressing Restore.
 */
export function VersionHistory({
  versions,
  essayId,
  timeZone,
  currentDraft,
}: {
  versions: EssayVersion[];
  essayId: string;
  timeZone: string;
  currentDraft: string;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [previewId, setPreviewId] = React.useState<string | null>(null);

  async function restore(version: EssayVersion) {
    const result = await restoreVersion({ essayId, versionId: version.id });
    if (result.ok) {
      notify('Restored. Your previous draft was saved as its own version first.');
      router.refresh();
    } else {
      notify(result.error, 'error');
    }
  }

  if (versions.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No saved versions yet"
        description="Versions are created as you write, and whenever you press Save a version. You can always come back to an earlier draft."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-ink-muted">
        Restoring an old version never deletes a newer one. Your current draft is saved first, so you
        can always go back again.
      </p>

      <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
        {versions.map((version) => {
          const isCurrent = version.content === currentDraft;
          const expanded = previewId === version.id;

          return (
            <li key={version.id} className="px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-ink">
                      {formatDate(version.createdAt, timeZone)}
                    </span>
                    <Badge tone={version.source === 'manual' ? 'accent' : 'neutral'}>
                      {sourceLabels[version.source]}
                    </Badge>
                    {isCurrent ? <Badge tone="success">Matches current draft</Badge> : null}
                  </div>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {countWords(version.content)} words
                    {version.note ? ` · ${version.note}` : ''}
                  </p>
                </div>

                <div className="flex shrink-0 gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewId(expanded ? null : version.id)}
                    aria-expanded={expanded}
                  >
                    {expanded ? 'Hide' : 'Preview'}
                  </Button>

                  {isCurrent ? null : (
                    <ConfirmDialog
                      trigger={
                        <DialogTrigger asChild>
                          <Button variant="secondary" size="sm">
                            <RotateCcw aria-hidden="true" />
                            Restore
                          </Button>
                        </DialogTrigger>
                      }
                      title="Restore this version?"
                      description={
                        <>
                          <p>
                            Your current draft will be saved as its own version first, then this
                            older text becomes your working draft.
                          </p>
                          <p className="mt-2">
                            Nothing is deleted. Every version, including the one you are looking at
                            now, stays in this list.
                          </p>
                        </>
                      }
                      confirmLabel="Restore this version"
                      destructive={false}
                      onConfirm={() => restore(version)}
                    />
                  )}
                </div>
              </div>

              {expanded ? (
                <div className="mt-3 max-h-64 overflow-y-auto rounded-[var(--radius)] border border-line bg-surface-muted px-3 py-2.5">
                  <p className="text-sm whitespace-pre-wrap text-ink">
                    {version.content || <span className="text-ink-subtle italic">Empty draft</span>}
                  </p>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
