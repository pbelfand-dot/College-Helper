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
    <div className="border-b border-info/25 bg-info-soft px-4 py-2 text-xs text-ink sm:px-6">
      <p className="mx-auto flex max-w-6xl items-start gap-2">
        <Info className="mt-0.5 size-3.5 shrink-0 text-info" aria-hidden="true" />
        <span>
          <strong className="font-semibold">Demo workspace.</strong> Everything here is sample data
          for a fictional student, stored only for this browser session. Deadlines and requirements
          on the example colleges are placeholders — always confirm them on the college&rsquo;s
          official website.{' '}
          <Link href="/settings" className="font-medium underline underline-offset-2">
            Reset or export the demo
          </Link>
          .
        </span>
      </p>
    </div>
  );
}
