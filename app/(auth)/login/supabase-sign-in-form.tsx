'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/states';
import { signInWithEmail } from './actions';

/** Magic-link sign-in, used when Supabase is configured. */
export function SupabaseSignInForm() {
  const [state, formAction] = useActionState(signInWithEmail, null);

  if (state?.ok) {
    return (
      <div className="border-success/35 bg-success-soft flex items-start gap-2.5 rounded-[var(--radius-lg)] border px-4 py-3.5">
        <CheckCircle2 className="text-success mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="text-ink text-sm">
          <p className="font-medium">Check your email.</p>
          <p className="text-ink-muted mt-1">
            If an account exists for that address, a sign-in link is on its way. The link expires
            shortly, so use it soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state && !state.ok ? (
        <ErrorState title="Could not sign in" description={state.error} />
      ) : null}

      <Field
        id="email"
        label="Email address"
        required
        error={state && !state.ok ? state.fieldErrors?.email : undefined}
      >
        {(props) => (
          <Input
            {...props}
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
          />
        )}
      </Field>

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" loading={pending} className="w-full">
      Email me a sign-in link
    </Button>
  );
}
