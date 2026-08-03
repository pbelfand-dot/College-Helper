'use client';

import { useRouter } from 'next/navigation';
import { CheckCheck, Pencil, Trash2 } from 'lucide-react';
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
import type { College } from '@/lib/domain/types';
import { CollegeForm } from './college-form';
import { deleteCollege, markCollegeVerified, updateCollege } from '@/app/(app)/colleges/actions';

/** Edit, verify and delete controls for a single college. */
export function CollegeActions({ college }: { college: College }) {
  const router = useRouter();
  const { notify } = useToast();
  const [editOpen, setEditOpen] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);

  async function verify() {
    setVerifying(true);
    const result = await markCollegeVerified(college.id);
    setVerifying(false);
    if (result.ok) {
      notify('Marked as verified today.');
      router.refresh();
    } else {
      notify(result.error, 'error');
    }
  }

  async function remove() {
    const result = await deleteCollege(college.id);
    // A successful delete redirects, so only a failure returns here.
    if (result && !result.ok) notify(result.error, 'error');
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={verify} loading={verifying}>
        <CheckCheck aria-hidden="true" />
        Verified today
      </Button>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger asChild>
          <Button variant="secondary" size="sm">
            <Pencil aria-hidden="true" />
            Edit
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit {college.name}</DialogTitle>
            <DialogDescription>Update your notes, links and list status.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <CollegeForm
              action={updateCollege}
              college={college}
              submitLabel="Save changes"
              onDone={() => {
                setEditOpen(false);
                notify('College updated.');
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
        title={`Delete ${college.name}?`}
        description={
          <>
            <p>
              This removes the college, its applications and their requirement checklists from your
              workspace.
            </p>
            <p className="mt-2">
              Your essays are <strong>not</strong> deleted — they stay on the Essays page and simply
              become unlinked.
            </p>
          </>
        }
        confirmLabel="Delete college"
        onConfirm={remove}
      />
    </>
  );
}
