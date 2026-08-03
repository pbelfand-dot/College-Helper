'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
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
import { ApplicationForm } from './application-form';
import { createApplication } from '@/app/(app)/applications/actions';

/**
 * "New application" trigger, shared by the applications list and each college
 * page. Disabled with an explanation when the student has no colleges yet,
 * rather than opening a form that cannot be submitted.
 */
export function NewApplicationButton({
  colleges,
  defaultCollegeId,
  defaultTimeZone,
  label = 'New application',
  size = 'md',
  variant = 'primary',
}: {
  colleges: College[];
  defaultCollegeId?: string;
  defaultTimeZone: string;
  label?: string;
  size?: 'sm' | 'md';
  variant?: 'primary' | 'secondary';
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [open, setOpen] = React.useState(false);

  if (colleges.length === 0) {
    return (
      <Button variant="secondary" size={size} asChild>
        <Link href="/colleges">Add a college first</Link>
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size} variant={variant}>
          <Plus aria-hidden="true" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New application</DialogTitle>
          <DialogDescription>
            We will start you off with three common checklist items. Edit or delete them and add
            what this college actually asks for.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <ApplicationForm
            action={createApplication}
            colleges={colleges}
            defaultCollegeId={defaultCollegeId}
            defaultTimeZone={defaultTimeZone}
            submitLabel="Create application"
            onDone={(id) => {
              setOpen(false);
              notify('Application created.');
              router.push(`/applications/${id}`);
            }}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
