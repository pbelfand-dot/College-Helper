'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Select, Textarea } from '@/components/ui/input';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { coachModeDescriptions, coachModeLabels } from '@/lib/domain/labels';
import {
  COACH_MODES,
  type CoachMode,
  type Activity,
  type College,
  type Essay,
} from '@/lib/domain/types';
import type {
  ActivityCoachOutput,
  CollegeResearchOutput,
  DeadlinePlanOutput,
  EssayBrainstormOutput,
  EssayFeedbackOutput,
  ProfileCoachOutput,
} from '@/lib/ai/schemas';
import { cn } from '@/lib/utils/cn';
import {
  CautionList,
  CoachDisclaimer,
  CoachSection,
  CopyButton,
  SentenceSuggestion,
} from './coach-output';
import { SendPreview } from './send-preview';
import { useCoach, type CoachRequestBody } from './use-coach';

type AnyOutput =
  | ProfileCoachOutput
  | CollegeResearchOutput
  | EssayBrainstormOutput
  | EssayFeedbackOutput
  | ActivityCoachOutput
  | DeadlinePlanOutput;

/** Which record each mode needs attached, if any. */
const ATTACHMENT: Record<CoachMode, 'essay' | 'activity' | 'college' | null> = {
  profile: null,
  'college-research': 'college',
  'essay-brainstorm': 'essay',
  'essay-feedback': 'essay',
  'activity-description': 'activity',
  'deadline-planning': null,
};

const PLACEHOLDERS: Record<CoachMode, string> = {
  profile: 'What am I missing from my activities list?',
  'college-research': 'What should I still check before I decide about this one?',
  'essay-brainstorm': 'I keep coming back to the Saturday mornings at the creek…',
  'essay-feedback': 'Does the ending land, or does it just stop?',
  'activity-description': 'This is about 30 characters too long.',
  'deadline-planning': 'What should I do first this week?',
};

/**
 * The standalone coach page.
 *
 * All six modes in one place. Which of the student's records get attached is
 * explicit and visible, and the response is rendered per-mode with copy buttons
 * so a student can take what is useful without anything being applied for them.
 */
export function CoachWorkspace({
  essays,
  activities,
  colleges,
}: {
  essays: Essay[];
  activities: Activity[];
  colleges: College[];
}) {
  const [mode, setMode] = React.useState<CoachMode>('profile');
  const [message, setMessage] = React.useState('');
  const [includeDraft, setIncludeDraft] = React.useState(false);
  const [essayId, setEssayId] = React.useState<string>(essays[0]?.id ?? '');
  const [activityId, setActivityId] = React.useState<string>(activities[0]?.id ?? '');
  const [collegeId, setCollegeId] = React.useState<string>(colleges[0]?.id ?? '');

  const coach = useCoach<AnyOutput>();
  const attachment = ATTACHMENT[mode];

  const body: CoachRequestBody = React.useMemo(
    () => ({
      mode,
      message,
      includeDraft: mode === 'essay-feedback' ? true : includeDraft,
      essayId: attachment === 'essay' && essayId ? essayId : null,
      activityId: attachment === 'activity' && activityId ? activityId : null,
      collegeId: attachment === 'college' && collegeId ? collegeId : null,
    }),
    [mode, message, includeDraft, attachment, essayId, activityId, collegeId],
  );

  function switchMode(next: CoachMode) {
    setMode(next);
    coach.reset();
  }

  const missingAttachment =
    (attachment === 'essay' && essays.length === 0) ||
    (attachment === 'activity' && activities.length === 0) ||
    (attachment === 'college' && colleges.length === 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
      <nav aria-label="Coaching modes" className="flex flex-col gap-2">
        {COACH_MODES.map((value) => (
          <button
            key={value}
            type="button"
            aria-current={mode === value ? 'true' : undefined}
            onClick={() => switchMode(value)}
            className={cn(
              'rounded-[var(--radius)] border px-3.5 py-3 text-left transition-colors',
              mode === value
                ? 'border-accent bg-accent-soft'
                : 'border-line bg-surface hover:border-line-strong',
            )}
          >
            <span
              className={cn(
                'block text-sm font-medium',
                mode === value ? 'text-accent-text' : 'text-ink',
              )}
            >
              {coachModeLabels[value]}
            </span>
            <span className="text-ink-muted mt-0.5 block text-xs">
              {coachModeDescriptions[value]}
            </span>
          </button>
        ))}
      </nav>

      <div className="flex flex-col gap-5">
        <div className="border-line bg-surface rounded-[var(--radius-lg)] border px-4 py-4">
          <h2 className="text-ink text-base font-semibold">{coachModeLabels[mode]}</h2>
          <p className="text-ink-muted mt-1 text-sm">{coachModeDescriptions[mode]}</p>
          <p className="text-ink-subtle mt-2 text-xs">
            {attachment === null
              ? mode === 'deadline-planning'
                ? 'This mode reads your recorded deadlines so it can order them. It does not read your essays.'
                : 'This mode reads your profile and your activities list. It does not read your essay drafts.'
              : `This mode reads the ${attachment} you choose below, and nothing else from your workspace.`}
          </p>
        </div>

        {attachment ? (
          <Field
            id="coach-attachment"
            label={
              attachment === 'essay' ? 'Essay' : attachment === 'activity' ? 'Activity' : 'College'
            }
            description="Only this record is attached to the request."
          >
            {(props) =>
              attachment === 'essay' ? (
                <Select
                  {...props}
                  value={essayId}
                  onChange={(event) => setEssayId(event.target.value)}
                  disabled={essays.length === 0}
                >
                  {essays.length === 0 ? <option value="">No essays yet</option> : null}
                  {essays.map((essay) => (
                    <option key={essay.id} value={essay.id}>
                      {essay.title}
                    </option>
                  ))}
                </Select>
              ) : attachment === 'activity' ? (
                <Select
                  {...props}
                  value={activityId}
                  onChange={(event) => setActivityId(event.target.value)}
                  disabled={activities.length === 0}
                >
                  {activities.length === 0 ? <option value="">No activities yet</option> : null}
                  {activities.map((activity) => (
                    <option key={activity.id} value={activity.id}>
                      {activity.organization}
                      {activity.role ? ` — ${activity.role}` : ''}
                    </option>
                  ))}
                </Select>
              ) : (
                <Select
                  {...props}
                  value={collegeId}
                  onChange={(event) => setCollegeId(event.target.value)}
                  disabled={colleges.length === 0}
                >
                  {colleges.length === 0 ? <option value="">No colleges yet</option> : null}
                  {colleges.map((college) => (
                    <option key={college.id} value={college.id}>
                      {college.name}
                    </option>
                  ))}
                </Select>
              )
            }
          </Field>
        ) : null}

        <Field id="coach-message" label="What do you want to ask?">
          {(props) => (
            <Textarea
              {...props}
              rows={4}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={PLACEHOLDERS[mode]}
            />
          )}
        </Field>

        {mode === 'essay-brainstorm' ? (
          <label className="text-ink flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={includeDraft}
              onChange={(event) => setIncludeDraft(event.target.checked)}
              className="mt-0.5 size-4 accent-[hsl(var(--ap-accent))]"
            />
            <span>
              Include the essay draft
              <span className="text-ink-muted block text-xs">
                Off by default. Brainstorming works from your notes unless you add the draft.
              </span>
            </span>
          </label>
        ) : null}

        <SendPreview preview={coach.preview} onRefresh={() => void coach.loadPreview(body)} />

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => void coach.send(body)}
            loading={coach.status === 'loading'}
            disabled={missingAttachment}
          >
            Ask the coach
          </Button>
          {coach.status === 'done' ? (
            <Button variant="ghost" onClick={coach.reset}>
              Clear
            </Button>
          ) : null}
        </div>

        {missingAttachment ? (
          <p className="text-warning text-xs">
            Add{' '}
            {attachment === 'essay'
              ? 'an essay'
              : attachment === 'activity'
                ? 'an activity'
                : 'a college'}{' '}
            first — this mode needs something of yours to read.
          </p>
        ) : null}

        {coach.status === 'loading' ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : null}

        {coach.status === 'error' && coach.error ? (
          <ErrorState
            title="The coach could not respond"
            description={coach.error}
            onRetry={() => void coach.send(body)}
          />
        ) : null}

        {coach.status === 'done' && coach.result ? (
          <div className="border-line bg-surface flex flex-col gap-5 rounded-[var(--radius-lg)] border px-4 py-4">
            <CoachResult mode={mode} output={coach.result.result} />
            <CoachDisclaimer offline={coach.result.provider.offline} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Renders whichever shape came back.
 *
 * The cast is safe because the server validated the response against exactly
 * this mode's schema before returning it.
 */
function CoachResult({ mode, output }: { mode: CoachMode; output: AnyOutput }) {
  switch (mode) {
    case 'profile': {
      const value = output as ProfileCoachOutput;
      return (
        <>
          <CoachSection
            title="What your own words already support"
            items={value.strengthsAlreadySupported}
            emptyNote="Nothing to draw on yet — fill in a few activities and try again."
          />
          <CoachSection title="Details worth adding" items={value.missingDetails} />
          <CoachSection title="Questions to sit with" items={value.reflectionQuestions} />
          <CoachSection title="Small next steps" items={value.suggestedNextSteps} />
          <CautionList title="Check before you claim it" items={value.cautionFlags} />
        </>
      );
    }

    case 'college-research': {
      const value = output as CollegeResearchOutput;
      return (
        <>
          <CoachSection title="What you have written down" items={value.factsYouProvided} />
          <CoachSection
            title="Verify these on official sources"
            items={value.questionsToVerifyOnOfficialSources}
            tone="warning"
          />
          <CoachSection title="Academic fit" items={value.academicFitConsiderations} />
          <CoachSection title="Campus and life" items={value.campusAndLifestyleConsiderations} />
          <CoachSection title="Cost and aid questions" items={value.costAndAidQuestions} />
          <CoachSection title="Pages to check" items={value.sourceChecklist} />
        </>
      );
    }

    case 'essay-brainstorm': {
      const value = output as EssayBrainstormOutput;
      return (
        <>
          <CoachSection title="Possible themes" items={value.possibleThemes} />
          <CoachSection title="Questions worth answering" items={value.reflectionQuestions} />
          <CoachSection title="Moments that could be scenes" items={value.scenesToExplore} />
          <CoachSection title="Where something shifts" items={value.tensionsOrChanges} />
          <CoachSection title="What this suggests you value" items={value.valuesDemonstrated} />
          <CoachSection
            title="Clichés to steer around"
            items={value.clichesToAvoid}
            tone="warning"
          />
        </>
      );
    }

    case 'essay-feedback': {
      const value = output as EssayFeedbackOutput;
      return (
        <>
          <div>
            <h4 className="text-ink-muted text-xs font-semibold tracking-wide uppercase">
              Reading it through
            </h4>
            <p className="text-ink mt-1.5 text-sm">{value.overallReading}</p>
            <div className="mt-2">
              <CopyButton text={value.overallReading} label="Copy this note" />
            </div>
          </div>
          <CoachSection title="What lands" items={value.whatIsMemorable} />
          <CoachSection title="What is unclear" items={value.whatIsUnclear} />
          <CoachSection title="Where it stays general" items={value.specificityIssues} />
          <CoachSection title="Structure" items={value.structureObservations} />
          <CoachSection title="Voice" items={value.voiceObservations} />
          <CoachSection title="Repetition" items={value.repetition} />
          <CoachSection title="Possible cuts" items={value.possibleCuts} />
          <CoachSection title="If you only do three things" items={value.revisionPriorities} />
          {value.sentenceSuggestions.length > 0 ? (
            <div>
              <h4 className="text-ink-muted text-xs font-semibold tracking-wide uppercase">
                Sentence-level options
              </h4>
              <p className="text-ink-muted mt-1 text-xs">
                Copy anything useful. To apply a suggestion directly to a draft, open the essay and
                use its Coach tab.
              </p>
              <ul className="mt-2 flex flex-col gap-2.5">
                {value.sentenceSuggestions.map((suggestion, index) => (
                  <SentenceSuggestion
                    key={index}
                    original={suggestion.original}
                    suggestion={suggestion.suggestion}
                    why={suggestion.why}
                  />
                ))}
              </ul>
            </div>
          ) : null}
        </>
      );
    }

    case 'activity-description': {
      const value = output as ActivityCoachOutput;
      return (
        <>
          {value.possibleVersions.length > 0 ? (
            <div>
              <h4 className="text-ink-muted text-xs font-semibold tracking-wide uppercase">
                Shorter versions of your own wording
              </h4>
              <ul className="mt-2 flex flex-col gap-2">
                {value.possibleVersions.map((version, index) => (
                  <li
                    key={index}
                    className="border-line bg-surface-muted rounded-[var(--radius)] border px-3 py-2.5"
                  >
                    <p className="text-ink text-sm">{version.text}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-ink-muted text-xs tabular-nums">
                        {version.characterCount} characters
                      </span>
                      <CopyButton text={version.text} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <CoachSection title="Verbs your account supports" items={value.supportedActionVerbs} />
          <CoachSection title="What earns the space" items={value.detailsWorthPrioritising} />
          <CoachSection title="Vague wording" items={value.weakOrVagueWording} tone="warning" />
          <CautionList title="Check before you submit" items={value.unsupportedClaimWarnings} />
        </>
      );
    }

    case 'deadline-planning': {
      const value = output as DeadlinePlanOutput;
      return (
        <>
          <CoachSection title="In this order" items={value.prioritisedTasks} />
          {value.recommendedWorkSessions.length > 0 ? (
            <div>
              <h4 className="text-ink-muted text-xs font-semibold tracking-wide uppercase">
                Suggested work sessions
              </h4>
              <ul className="text-ink mt-1.5 flex flex-col gap-1.5 text-sm">
                {value.recommendedWorkSessions.map((session, index) => (
                  <li key={index} className="flex gap-2">
                    <span aria-hidden="true" className="text-ink-subtle">
                      •
                    </span>
                    <span>
                      <strong className="font-medium">{session.when}</strong> — {session.focus}{' '}
                      (about {session.approximateMinutes} minutes)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <CoachSection title="What depends on what" items={value.dependencies} />
          <CoachSection title="Where to leave slack" items={value.bufferSuggestions} />
          <CoachSection title="Days carrying a lot" items={value.overloadedDates} tone="warning" />
          <CoachSection
            title="Confirm these yourself"
            items={value.tasksNeedingVerification}
            tone="warning"
          />
          <p className="text-ink-subtle text-xs">
            This is a suggested order of work, not a promise that everything will get done. Adjust
            it to fit your actual week.
          </p>
        </>
      );
    }
  }
}
