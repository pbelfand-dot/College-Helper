'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { TimeZoneField } from '@/components/ui/time-zone-field';
import { ErrorState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { currentGradeLabels } from '@/lib/domain/labels';
import { CURRENT_GRADES, type UserProfile } from '@/lib/domain/types';
import { updateProfile } from '@/app/(app)/settings/actions';
import type { ActionResult } from '@/lib/utils/result';

export function ProfileSettingsForm({ profile }: { profile: UserProfile }) {
  const { notify } = useToast();

  const [state, formAction] = useActionState(
    async (previous: ActionResult<undefined> | null, formData: FormData) => {
      const result = await updateProfile(previous, formData);
      if (result.ok) notify('Profile saved.');
      return result;
    },
    null,
  );

  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state && !state.ok ? <ErrorState title="Could not save" description={state.error} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="settings-displayName" label="Name" required error={errors?.displayName}>
          {(props) => <Input {...props} name="displayName" defaultValue={profile.displayName} />}
        </Field>

        <Field id="settings-region" label="Region" error={errors?.region}>
          {(props) => <Input {...props} name="region" defaultValue={profile.region ?? ''} />}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="settings-currentGrade" label="Current year" error={errors?.currentGrade}>
          {(props) => (
            <Select {...props} name="currentGrade" defaultValue={profile.currentGrade ?? ''}>
              <option value="">Prefer not to say</option>
              {CURRENT_GRADES.map((grade) => (
                <option key={grade} value={grade}>
                  {currentGradeLabels[grade]}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field id="settings-graduationYear" label="Graduation year" error={errors?.graduationYear}>
          {(props) => (
            <Input
              {...props}
              name="graduationYear"
              type="number"
              min={2000}
              max={2100}
              defaultValue={profile.graduationYear ?? ''}
            />
          )}
        </Field>

        <Field
          id="settings-applicationSeason"
          label="Application season"
          error={errors?.applicationSeason}
        >
          {(props) => (
            <Input
              {...props}
              name="applicationSeason"
              defaultValue={profile.applicationSeason ?? ''}
            />
          )}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="settings-intendedMajors"
          label="Possible majors"
          description="Comma separated."
          error={errors?.intendedMajors}
        >
          {(props) => (
            <Input
              {...props}
              name="intendedMajors"
              defaultValue={profile.intendedMajors.join(', ')}
            />
          )}
        </Field>

        <Field
          id="settings-interests"
          label="Interests"
          description="Comma separated."
          error={errors?.interests}
        >
          {(props) => (
            <Input {...props} name="interests" defaultValue={profile.interests.join(', ')} />
          )}
        </Field>
      </div>

      <TimeZoneField
        id="settings-timeZone"
        name="timeZone"
        label="Default time zone"
        description="Used for your own dates. Each application and scholarship deadline keeps the zone you recorded for it."
        defaultValue={profile.timeZone}
        error={errors?.timeZone}
      />

      <Field
        id="settings-writingVoiceNotes"
        label="How you write"
        description="Given to the essay coach so it does not flatten how you sound. Your words, describing your own voice."
        error={errors?.writingVoiceNotes}
      >
        {(props) => (
          <Textarea
            {...props}
            name="writingVoiceNotes"
            rows={3}
            defaultValue={profile.writingVoiceNotes ?? ''}
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
    <Button type="submit" loading={pending} className="sm:self-start">
      Save profile
    </Button>
  );
}
