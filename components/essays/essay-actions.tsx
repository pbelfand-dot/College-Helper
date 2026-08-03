'use client';

import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import type { Application, College, Essay } from '@/lib/domain/types';
import { EssayForm } from './essay-form';
import { deleteEssay, updateEssayDetails } from '@/app/(app)/essays/actions';

export function EssayActions({
  essay,
  colleges,
  applications,
  timeZone,
}: {
  essay: Essay;
  colleges: College[];
  applications: Application[];
  timeZone: string;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [open, setOpen] = React.useState(false);

  async function remove() {
    const result = await deleteEssay(essay.id);
    if (result && !result.ok) notify(result.error, 'error');
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="secondary" size="sm">
            <Pencil aria-hidden="true" />
            Essay settings
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Essay settings</DialogTitle>
            <DialogDescription>
              The prompt, limit, links and status. Changing these never touches your draft.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <EssayForm
              action={updateEssayDetails}
              essay={essay}
              colleges={colleges}
              applications={applications}
              timeZone={timeZone}
              submitLabel="Save settings"
              onDone={() => {
                setOpen(false);
                notify('Essay settings saved.');
                router.refresh();
              }}
            />
          </DialogBody>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        trigger={
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm">
              <Trash2 aria-hidden="true" />
              Delete
            </Button>
          </DialogTrigger>
        }
        title={`Delete "${essay.title}"?`}
        description={
          <>
            <p>
              This deletes the essay <strong>and every saved version of it</strong>. There is no way
              to get the writing back afterwards.
            </p>
            <p className="mt-2">
              If you only want it out of the way, set its status to something else instead — or
              export it from Settings first.
            </p>
          </>
        }
        confirmLabel="Delete essay and all versions"
        onConfirm={remove}
      />
    </>
  );
}
