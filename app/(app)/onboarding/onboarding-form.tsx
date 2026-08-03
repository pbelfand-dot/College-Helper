'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Field, FieldSet } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { TimeZoneField } from '@/components/ui/time-zone-field';
import { ErrorState } from '@/components/ui/states';
import { currentGradeLabels } from '@/lib/domain/labels';
import { CURRENT_GRADES } from '@/lib/domain/types';
import { completeOnboarding } from './actions';

export function OnboardingForm({ className }: { className?: string }) {
  const [state, formAction] = useActionState(completeOnboarding, null);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const currentYear = new Date().getFullYear();

  return (
    <form action={formAction} className={className}>
      <div className="flex flex-col gap-8">
        {state && !state.ok ? (
          <ErrorState title="Could not save" description={state.error} />
        ) : null}

        <FieldSet legend="About you">
          <Field
            id="displayName"
            label="What should we call you?"
            description="A first name or nickname is fine. This only appears in your own workspace."
            required
            error={fieldErrors?.displayName}
          >
            {(props) => (
              <Input {...props} name="displayName" autoComplete="given-name" placeholder="Riley" />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="currentGrade" label="Current year" error={fieldErrors?.currentGrade}>
              {(props) => (
                <Select {...props} name="currentGrade" defaultValue="12">
                  <option value="">Prefer not to say</option>
                  {CURRENT_GRADES.map((grade) => (
                    <option key={grade} value={grade}>
                      {currentGradeLabels[grade]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field id="graduationYear" label="Graduation year" error={fieldErrors?.graduationYear}>
              {(props) => (
                <Input
                  {...props}
                  name="graduationYear"
                  type="number"
                  min={2000}
                  max={2100}
                  defaultValue={currentYear + 1}
                />
              )}
            </Field>
          </div>

          <Field
            id="region"
            label="Where are you applying from?"
            description="Optional. A state, province or country is plenty — we do not need your address."
            error={fieldErrors?.region}
          >
            {(props) => <Input {...props} name="region" placeholder="Michigan" />}
          </Field>
        </FieldSet>

        <FieldSet legend="What you are interested in">
          <Field
            id="intendedMajors"
            label="Possible majors"
            description="Separate with commas. “Not sure yet” is a completely normal answer — leave it blank."
            error={fieldErrors?.intendedMajors}
          >
            {(props) => (
              <Input
                {...props}
                name="intendedMajors"
                placeholder="Environmental science, public policy"
              />
            )}
          </Field>

          <Field
            id="interests"
            label="Things you care about"
            description="Separate with commas. The coach uses these to ask better questions — it will never turn them into claims about you."
            error={fieldErrors?.interests}
          >
            {(props) => (
              <Input {...props} name="interests" placeholder="water quality, teaching, robotics" />
            )}
          </Field>
        </FieldSet>

        <FieldSet legend="Planning preferences">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="applicationSeason"
              label="Application season"
              error={fieldErrors?.applicationSeason}
            >
              {(props) => (
                <Input
                  {...props}
                  name="applicationSeason"
                  defaultValue={`${currentYear}–${currentYear + 1}`}
                />
              )}
            </Field>

            <TimeZoneField error={fieldErrors?.timeZone} />
          </div>

          <Field
            id="writingVoiceNotes"
            label="How do you write?"
            description="Optional, but useful. Describe your own voice in your own words — the essay coach uses this to avoid flattening how you sound."
            error={fieldErrors?.writingVoiceNotes}
          >
            {(props) => (
              <Textarea
                {...props}
                name="writingVoiceNotes"
                rows={3}
                placeholder="Short sentences. I make jokes when something matters to me."
              />
            )}
          </Field>
        </FieldSet>

        <div className="border-line flex flex-col gap-3 border-t pt-6">
          <SubmitButton />
          <p className="text-ink-subtle text-xs">
            You can change any of this later in Settings, export it, or delete it entirely.
          </p>
        </div>
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" loading={pending} className="sm:self-start">
      Save and open my dashboard
    </Button>
  );
}
