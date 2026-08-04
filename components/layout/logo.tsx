import Link from 'next/link';
import { Compass } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function Logo({ className, href = '/dashboard' }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn('text-ink inline-flex items-center gap-2 rounded', className)}
      aria-label="ApplyPilot home"
    >
      <span className="bg-accent text-accent-contrast flex size-7 items-center justify-center rounded-[var(--radius)]">
        <Compass className="size-4" aria-hidden="true" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">ApplyPilot</span>
    </Link>
  );
}
