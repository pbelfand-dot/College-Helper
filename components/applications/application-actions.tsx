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
import type { Application, College } from '@/lib/domain/types';
import { ApplicationForm } from './application-form';
import { deleteApplication, updateApplication } from '@/app/(app)/applications/actions';

export function ApplicationActions({
  application,
  colleges,
  collegeName,
  defaultTimeZone,
}: {
  application: Application;
  colleges: College[];
  collegeName: string;
  defaultTimeZone: string;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [editOpen, setEditOpen] = React.useState(false);

  async function remove() {
    const result = await deleteApplication(application.id);
    if (result && !result.ok) notify(result.error, 'error');
  }

  return (
    <>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger asChild>
          <Button variant="secondary" size="sm">
            <Pencil aria-hidden="true" />
            Edit application
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit application</DialogTitle>
            <DialogDescription>
              Update the round, deadline, status and outcome. ApplyPilot records what you tell it — it
              never submits anything on your behalf.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <ApplicationForm
              action={updateApplication}
              colleges={colleges}
              application={application}
              defaultTimeZone={defaultTimeZone}
              submitLabel="Save changes"
              showOutcomeFields
              onDone={() => {
                setEditOpen(false);
                notify('Application updated.');
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
        title="Delete this application?"
        description={
          <>
            <p>
              The application to <strong>{collegeName}</strong> and its requirement checklist will be
              removed.
            </p>
            <p className="mt-2">
              The college stays on your list, and any linked essays are kept — they simply become
              unlinked.
            </p>
          </>
        }
        confirmLabel="Delete application"
        onConfirm={remove}
      />
    </>
  );
}
