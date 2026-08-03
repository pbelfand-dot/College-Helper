import { cn } from '@/lib/utils/cn';

/**
 * Independence notice.
 *
 * Shown on the landing page, the login page and in settings. ApplyPilot is a
 * personal planning tool; implying an official relationship with an application
 * platform or a college would be misleading, so we say the opposite plainly.
 */
export function AffiliationNotice({ className }: { className?: string }) {
  return (
    <p className={cn('text-ink-muted text-xs', className)}>
      ApplyPilot is an independent planning tool. It is not affiliated with, endorsed by, or
      connected to the Common Application, the Coalition Application, any college, or any other
      admissions organisation. It cannot submit an application on your behalf and never signs in to
      an admissions system for you.
    </p>
  );
}
