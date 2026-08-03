'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { RotateCcw } from 'lucide-react';
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
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { deleteAllData, resetDemoWorkspace } from '@/app/(app)/settings/actions';

/**
 * Reset and delete.
 *
 * Both are irreversible, so both require an explicit confirmation step, and the
 * delete flow requires typing DELETE rather than clicking one button.
 */
export function DangerZone({ demoMode }: { demoMode: boolean }) {
  const router = useRouter();
  const { notify } = useToast();
  const [resetting, setResetting] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  async function reset() {
    setResetting(true);
    const result = await resetDemoWorkspace();
    setResetting(false);

    if (result.ok) {
      notify('Demo workspace reset to its starting point.');
      router.refresh();
    } else {
      notify(result.error, 'error');
    }
  }

  return (
    <section className="border-danger/30 bg-danger-soft/40 flex flex-col gap-4 rounded-[var(--radius-lg)] border px-5 py-4">
      <div>
        <h2 className="text-ink text-base font-semibold">Data controls</h2>
        <p className="text-ink-muted mt-0.5 text-sm">
          These cannot be undone. Export first if there is anything you want to keep.
        </p>
      </div>

      {demoMode ? (
        <div className="border-line bg-surface flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border px-4 py-3">
          <div>
            <p className="text-ink text-sm font-medium">Reset the demo workspace</p>
            <p className="text-ink-muted text-xs">
              Discards your changes and restores the seeded sample student.
            </p>
          </div>
          <ConfirmDialog
            trigger={
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm" loading={resetting}>
                  <RotateCcw aria-hidden="true" />
                  Reset demo
                </Button>
              </DialogTrigger>
            }
            title="Reset the demo workspace?"
            description="Everything you have added or edited in this demo will be discarded and the sample data restored. This cannot be undone."
            confirmLabel="Reset the demo"
            onConfirm={reset}
          />
        </div>
      ) : null}

      <div className="border-line bg-surface flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border px-4 py-3">
        <div>
          <p className="text-ink text-sm font-medium">
            {demoMode ? 'Delete everything in this workspace' : 'Delete all of my data'}
          </p>
          <p className="text-ink-muted text-xs">
            Removes every college, application, essay, version, activity, recommender, scholarship
            and task you have stored.
          </p>
        </div>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger asChild>
            <Button variant="danger" size="sm">
              Delete my data
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete everything?</DialogTitle>
              <DialogDescription>
                This permanently removes all of your records, including every essay draft and every
                saved version. It cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              <DeleteForm />
            </DialogBody>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}

function DeleteForm() {
  const [state, formAction] = useActionState(deleteAllData, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state && !state.ok ? (
        <ErrorState title="Could not delete" description={state.error} />
      ) : null}

      <p className="text-ink-muted text-sm">
        If you might want any of this later, close this dialog and export a backup first.
      </p>

      <Field
        id="delete-confirmation"
        label="Type DELETE to confirm"
        required
        error={errors?.confirmation}
      >
        {(props) => (
          <Input {...props} name="confirmation" autoComplete="off" placeholder="DELETE" />
        )}
      </Field>

      <DeleteButton />
    </form>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="danger" loading={pending}>
      Permanently delete everything
    </Button>
  );
}
