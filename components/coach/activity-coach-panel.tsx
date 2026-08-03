'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/input';
import { ErrorState, Skeleton } from '@/components/ui/states';
import type { ActivityCoachOutput } from '@/lib/ai/schemas';
import { CautionList, CoachDisclaimer, CoachSection, CopyButton } from './coach-output';
import { SendPreview } from './send-preview';
import { useCoach, type CoachRequestBody } from './use-coach';

/**
 * Activities Description Coach.
 *
 * The one rule that matters most here is enforced in the prompt and honoured by
 * the offline coach: it may cut and rearrange the student's words, but it may
 * never introduce a number, a headcount or a total the student did not write.
 */
export function ActivityCoachPanel({
  activityId,
  descriptionLimit,
}: {
  activityId: string;
  descriptionLimit: number;
}) {
  const [message, setMessage] = React.useState('');
  const coach = useCoach<ActivityCoachOutput>();

  const body: CoachRequestBody = React.useMemo(
    () => ({
      mode: 'activity-description',
      message,
      includeDraft: false,
      essayId: null,
      activityId,
      collegeId: null,
    }),
    [message, activityId],
  );

  const output = coach.result?.result;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-ink-muted">
        The coach works from what you already wrote for this activity. It will suggest shorter
        wordings and flag vague phrasing — it will not add hours, headcounts or totals you did not
        state.
      </p>

      <Field
        id="activity-coach-message"
        label="Anything specific you want help with?"
        description="Optional. For example: “this is 40 characters too long” or “does the verb do enough?”"
      >
        {(props) => (
          <Textarea
            {...props}
            rows={2}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        )}
      </Field>

      <SendPreview preview={coach.preview} onRefresh={() => void coach.loadPreview(body)} />

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void coach.send(body)} loading={coach.status === 'loading'}>
          Tighten this description
        </Button>
        {coach.status === 'done' ? (
          <Button variant="ghost" onClick={coach.reset}>
            Clear
          </Button>
        ) : null}
      </div>

      {coach.status === 'loading' ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : null}

      {coach.status === 'error' && coach.error ? (
        <ErrorState
          title="The coach could not respond"
          description={coach.error}
          onRetry={() => void coach.send(body)}
        />
      ) : null}

      {output ? (
        <div className="flex flex-col gap-5 rounded-[var(--radius-lg)] border border-line bg-surface px-4 py-4">
          {output.possibleVersions.length > 0 ? (
            <div>
              <h4 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                Shorter versions of your own wording
              </h4>
              <ul className="mt-2 flex flex-col gap-2">
                {output.possibleVersions.map((version, index) => {
                  const over = version.characterCount > descriptionLimit;
                  return (
                    <li
                      key={index}
                      className="rounded-[var(--radius)] border border-line bg-surface-muted px-3 py-2.5"
                    >
                      <p className="text-sm text-ink">{version.text}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={
                            over
                              ? 'text-xs font-medium text-warning'
                              : 'text-xs tabular-nums text-ink-muted'
                          }
                        >
                          {version.characterCount} / {descriptionLimit} characters
                          {over ? ' — still over your limit' : ''}
                        </span>
                        <CopyButton text={version.text} />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-xs text-ink-subtle">
                Copy one in if you like it. Nothing is changed in your activity unless you paste it
                yourself.
              </p>
            </div>
          ) : null}

          <CoachSection title="Verbs your own account supports" items={output.supportedActionVerbs} />
          <CoachSection title="What earns the space" items={output.detailsWorthPrioritising} />
          <CoachSection
            title="Vague wording"
            items={output.weakOrVagueWording}
            tone="warning"
          />
          <CautionList title="Check before you submit" items={output.unsupportedClaimWarnings} />

          <CoachDisclaimer offline={coach.result?.provider.offline ?? true} />
        </div>
      ) : null}
    </div>
  );
}
