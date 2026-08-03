import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';

/**
 * Shown when a record id does not resolve — either because it was deleted, or
 * because it belongs to somebody else. The wording is the same in both cases on
 * purpose: it should not be possible to probe for the existence of another
 * user's records.
 */
export default function AppNotFound() {
  return (
    <EmptyState
      icon={FileQuestion}
      title="We could not find that"
      description="This page does not exist, or the record was removed. It may also have been a link to something outside your workspace."
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/colleges">Your college list</Link>
          </Button>
        </div>
      }
    />
  );
}
