import Link from 'next/link';
import { Info } from 'lucide-react';

/**
 * Demo-mode banner.
 *
 * Always visible in demo mode. The point is that a student can never mistake
 * the sample workspace for their real one, and never mistake the seeded college
 * records for current admissions information.
 */
export function DemoBanner() {
  return (
    <div className="border-info/25 bg-info-soft text-ink border-b px-4 py-2 text-xs sm:px-6">
      <p className="mx-auto flex max-w-6xl items-start gap-2">
        <Info className="text-info mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>
          {/*
            The space after </strong> is written as an explicit expression followed by an
            element. A bare space in JSX text is dropped here, and a bare {' '} followed by
            text gets collapsed back into one by the formatter.
          */}
          <strong className="font-semibold">Demo workspace.</strong>{' '}
          <span>
            Everything here is sample data for a fictional student, stored only for this browser
            session. Deadlines and requirements on the example colleges are placeholders — always
            confirm them on the college&rsquo;s official website.
          </span>{' '}
          <Link href="/settings" className="font-medium underline underline-offset-2">
            Reset or export the demo
          </Link>
          .
        </span>
      </p>
    </div>
  );
}
