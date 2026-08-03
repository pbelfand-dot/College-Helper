'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/states';

/**
 * Route-level error boundary.
 *
 * The user sees a fixed, generic message. The `digest` is a server-generated
 * identifier with no request content in it, shown only so a report can be
 * matched to a log line — the underlying error message is never rendered.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <ErrorState
        title="Something went wrong on this page"
        description="Your saved work is not affected. Try again, and if it keeps happening, reload the page."
      />
      <div className="flex flex-wrap gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Reload the page
        </Button>
      </div>
      {error.digest ? (
        <p className="text-xs text-ink-subtle">Reference: {error.digest}</p>
      ) : null}
    </div>
  );
}
