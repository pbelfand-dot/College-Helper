'use client';

import { Lightbulb, MessageSquareText } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/input';
import { ErrorState, Skeleton } from '@/components/ui/states';
import type { EssayBrainstormOutput, EssayFeedbackOutput } from '@/lib/ai/schemas';
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

type Mode = 'essay-brainstorm' | 'essay-feedback';

/**
 * The coaching panel inside the essay editor.
 *
 * Two things it will not do: send the draft unless the student ticks the box,
 * and write into the draft on its own. `onApplySuggestion` is wired to an
 * explicit button and goes through the normal draft-save path, which means an
 * applied suggestion is versioned like any other edit and can be undone.
 */
export function EssayCoachPanel({
  essayId,
  hasDraft,
  onApplySuggestion,
}: {
  essayId: string;
  hasDraft: boolean;
  onApplySuggestion: (original: string, suggestion: string) => void;
}) {
  const [mode, setMode] = React.useState<Mode>('essay-brainstorm');
  const [message, setMessage] = React.useState('');
  const [includeDraft, setIncludeDraft] = React.useState(false);

  const coach = useCoach<EssayBrainstormOutput | EssayFeedbackOutput>();

  const body: CoachRequestBody = React.useMemo(
    () => ({
      mode,
      message,
      includeDraft: mode === 'essay-feedback' ? true : includeDraft,
      essayId,
      activityId: null,
      collegeId: null,
    }),
    [mode, message, includeDraft, essayId],
  );

  function switchMode(next: Mode) {
    setMode(next);
    coach.reset();
  }

  const needsDraft = mode === 'essay-feedback' && !hasDraft;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="coach-heading">
      <div>
        <h2 id="coach-heading" className="text-base font-semibold text-ink">
          Ask the coach
        </h2>
        <p className="mt-0.5 text-xs text-ink-muted">
          It asks questions and points at specifics. It will not write the essay for you, and it will
          never add an experience you have not described.
        </p>
      </div>

      <div role="radiogroup" aria-label="Coaching mode" className="flex flex-wrap gap-2">
        <ModeButton
          active={mode === 'essay-brainstorm'}
          onClick={() => switchMode('essay-brainstorm')}
          icon={Lightbulb}
          title="Brainstorm"
          description="Find what to write about"
        />
        <ModeButton
          active={mode === 'essay-feedback'}
          onClick={() => switchMode('essay-feedback')}
          icon={MessageSquareText}
          title="Feedback"
          description="Respond to what you wrote"
        />
      </div>

      <Field
        id="coach-message"
        label={mode === 'essay-brainstorm' ? 'What are you thinking about?' : 'What should I look at?'}
        description={
          mode === 'essay-brainstorm'
            ? 'Describe a real experience in your own words. The more concrete you are, the more useful the questions will be.'
            : 'Optional. For example: “the ending feels abrupt” or “is the second paragraph doing anything?”'
        }
      >
        {(props) => (
          <Textarea
            {...props}
            rows={4}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={
              mode === 'essay-brainstorm'
                ? 'I keep thinking about the Saturday mornings at the creek, and the semester I got the readings wrong…'
                : 'Tell me where it drags.'
            }
          />
        )}
      </Field>

      {mode === 'essay-brainstorm' ? (
        <label className="flex items-start gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={includeDraft}
            onChange={(event) => setIncludeDraft(event.target.checked)}
            disabled={!hasDraft}
            className="mt-0.5 size-4 accent-[hsl(var(--ap-accent))] disabled:opacity-50"
          />
          <span>
            Include my current draft
            <span className="block text-xs text-ink-muted">
              {hasDraft
                ? 'Off by default. Your draft stays private unless you tick this.'
                : 'You have not written a draft yet.'}
            </span>
          </span>
        </label>
      ) : (
        <p className="text-xs text-ink-muted">
          Feedback needs your draft, so it will be included in this request.
        </p>
      )}

      <SendPreview preview={coach.preview} onRefresh={() => void coach.loadPreview(body)} />

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => void coach.send(body)}
          loading={coach.status === 'loading'}
          disabled={needsDraft}
        >
          {mode === 'essay-brainstorm' ? 'Help me brainstorm' : 'Give me feedback'}
        </Button>
        {coach.status === 'done' ? (
          <Button variant="ghost" onClick={coach.reset}>
            Clear
          </Button>
        ) : null}
      </div>

      {needsDraft ? (
        <p className="text-xs text-warning">
          Write something in the draft tab first — feedback needs words to respond to.
        </p>
      ) : null}

      {coach.status === 'loading' ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
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
        <div className="flex flex-col gap-5 rounded-[var(--radius-lg)] border border-line bg-surface px-4 py-4">
          {mode === 'essay-brainstorm' ? (
            <BrainstormResult output={coach.result.result as EssayBrainstormOutput} />
          ) : (
            <FeedbackResult
              output={coach.result.result as EssayFeedbackOutput}
              onApply={onApplySuggestion}
            />
          )}
          <CoachDisclaimer offline={coach.result.provider.offline} />
        </div>
      ) : null}
    </section>
  );
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Lightbulb;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        'flex flex-1 items-start gap-2.5 rounded-[var(--radius)] border px-3 py-2.5 text-left transition-colors',
        active
          ? 'border-accent bg-accent-soft'
          : 'border-line bg-surface hover:border-line-strong',
      )}
    >
      <Icon
        className={cn('mt-0.5 size-4 shrink-0', active ? 'text-accent-text' : 'text-ink-muted')}
        aria-hidden="true"
      />
      <span>
        <span className={cn('block text-sm font-medium', active ? 'text-accent-text' : 'text-ink')}>
          {title}
        </span>
        <span className="block text-xs text-ink-muted">{description}</span>
      </span>
    </button>
  );
}

function BrainstormResult({ output }: { output: EssayBrainstormOutput }) {
  return (
    <>
      <CoachSection
        title="Possible themes, from what you described"
        items={output.possibleThemes}
        emptyNote="Nothing yet — describe an experience in more detail and try again."
      />
      <CoachSection title="Questions worth answering" items={output.reflectionQuestions} />
      <CoachSection title="Moments that could be scenes" items={output.scenesToExplore} />
      <CoachSection title="Where something shifts" items={output.tensionsOrChanges} />
      <CoachSection title="What this suggests you value" items={output.valuesDemonstrated} />
      <CoachSection
        title="Clichés to steer around"
        items={output.clichesToAvoid}
        tone="warning"
      />
    </>
  );
}

function FeedbackResult({
  output,
  onApply,
}: {
  output: EssayFeedbackOutput;
  onApply: (original: string, suggestion: string) => void;
}) {
  return (
    <>
      <div>
        <h4 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
          Reading it through
        </h4>
        <p className="mt-1.5 text-sm text-ink">{output.overallReading}</p>
        <div className="mt-2">
          <CopyButton text={output.overallReading} label="Copy this note" />
        </div>
      </div>

      <CoachSection title="What lands" items={output.whatIsMemorable} />
      <CoachSection title="What is unclear" items={output.whatIsUnclear} />
      <CoachSection title="Where it stays general" items={output.specificityIssues} />
      <CoachSection title="Structure" items={output.structureObservations} />
      <CoachSection title="Voice" items={output.voiceObservations} />
      <CoachSection title="Repetition" items={output.repetition} />
      <CoachSection title="Possible cuts" items={output.possibleCuts} />
      <CoachSection title="If you only do three things" items={output.revisionPriorities} />

      {output.sentenceSuggestions.length > 0 ? (
        <div>
          <h4 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
            Sentence-level options
          </h4>
          <p className="mt-1 text-xs text-ink-muted">
            These replace one sentence at a time, and only if you press the button. Your draft is
            versioned, so you can undo any of it.
          </p>
          <ul className="mt-2 flex flex-col gap-2.5">
            {output.sentenceSuggestions.map((suggestion, index) => (
              <SentenceSuggestion
                key={index}
                original={suggestion.original}
                suggestion={suggestion.suggestion}
                why={suggestion.why}
                onApply={onApply}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

/** Re-exported so the activities coach can reuse the caution styling. */
export { CautionList };
