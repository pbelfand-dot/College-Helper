'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { startDemoSession } from './actions';

/**
 * Demo entry.
 *
 * Two deliberate choices: the seeded workspace is the primary action (so every
 * screen has something to show), and starting empty is offered right next to it
 * for anyone who wants to plan for real.
 */
export function DemoSignInForm() {
  return (
    <div className="flex flex-col gap-4">
      <form action={startDemoSession} className="flex flex-col gap-2.5">
        <input type="hidden" name="variant" value="seeded" />
        <SubmitButton label="Enter the demo with sample data" />
      </form>

      <form action={startDemoSession}>
        <input type="hidden" name="variant" value="empty" />
        <SubmitButton label="Start with an empty workspace" variant="secondary" />
      </form>

      <ul className="text-ink-muted mt-1 flex flex-col gap-1.5 text-xs">
        <li>• Your workspace is private to this browser and is not shared with other visitors.</li>
        <li>• It is held in memory only and clears itself after about half a day.</li>
        <li>• You can reset it or export everything from Settings at any time.</li>
      </ul>
    </div>
  );
}

function SubmitButton({
  label,
  variant = 'primary',
}: {
  label: string;
  variant?: 'primary' | 'secondary';
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" variant={variant} loading={pending} className="w-full">
      {label}
    </Button>
  );
}
