'use client';

import { Download, FileJson, FileSpreadsheet, FileText, ListChecks } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

/**
 * Export downloads.
 *
 * Each button hits `/api/export/[kind]`, which builds the file from the
 * signed-in student's own bundle. The filename comes from the server's
 * Content-Disposition header, so nothing user-supplied lands in a path.
 */

const EXPORTS = [
  {
    kind: 'json',
    icon: FileJson,
    title: 'Complete backup (JSON)',
    description: 'Everything, in one machine-readable file. Keep this somewhere safe.',
  },
  {
    kind: 'checklist',
    icon: ListChecks,
    title: 'Application checklist (Markdown)',
    description:
      'A readable summary of where every application stands, with your requirement lists.',
  },
  {
    kind: 'essays',
    icon: FileText,
    title: 'Essays (Markdown)',
    description: 'Every essay with its prompt, draft, outline and notes.',
  },
  {
    kind: 'activities',
    icon: FileSpreadsheet,
    title: 'Activities (CSV)',
    description: 'Your activities list in order, with hours and character counts.',
  },
] as const;

export function ExportMenu() {
  const { notify } = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);

  async function download(kind: string, title: string) {
    setBusy(kind);
    try {
      const response = await fetch(`/api/export/${kind}`);
      if (!response.ok) {
        notify('We could not build that export. Please try again.', 'error');
        return;
      }

      const disposition = response.headers.get('Content-Disposition') ?? '';
      const match = /filename="([^"]+)"/.exec(disposition);
      const filename = match ? match[1] : `applypilot-${kind}`;

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      notify(`${title} downloaded.`);
    } catch {
      notify('We could not build that export. Please try again.', 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      {EXPORTS.map((entry) => (
        <div
          key={entry.kind}
          className="border-line bg-surface flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border px-4 py-3"
        >
          <div className="flex min-w-0 items-start gap-3">
            <span className="bg-surface-muted text-ink-muted mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[var(--radius)]">
              <entry.icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-ink text-sm font-medium">{entry.title}</p>
              <p className="text-ink-muted text-xs">{entry.description}</p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            loading={busy === entry.kind}
            onClick={() => void download(entry.kind, entry.title)}
          >
            <Download aria-hidden="true" />
            Download
          </Button>
        </div>
      ))}
    </div>
  );
}
