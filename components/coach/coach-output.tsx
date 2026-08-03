'use client';

import { Copy, Check } from 'lucide-react';
import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

/**
 * Rendering for coach output.
 *
 * Everything here renders as text nodes. There is no `dangerouslySetInnerHTML`
 * anywhere in this file or anywhere else that touches model output — whatever a
 * model returns is displayed as characters, never parsed as markup.
 */

export function CoachSection({
  title,
  items,
  tone = 'neutral',
  emptyNote,
}: {
  title: string;
  items: string[];
  tone?: 'neutral' | 'warning';
  emptyNote?: string;
}) {
  if (items.length === 0) {
    return emptyNote ? (
      <div>
        <h4 className="text-ink-muted text-xs font-semibold tracking-wide uppercase">{title}</h4>
        <p className="text-ink-subtle mt-1 text-sm italic">{emptyNote}</p>
      </div>
    ) : null;
  }

  return (
    <div>
      <h4 className="text-ink-muted text-xs font-semibold tracking-wide uppercase">{title}</h4>
      <ul
        className={cn(
          'mt-1.5 flex flex-col gap-1.5 text-sm',
          tone === 'warning' ? 'text-warning' : 'text-ink',
        )}
      >
        {items.map((item, index) => (
          <li key={index} className="flex gap-2">
            <span aria-hidden="true" className="text-ink-subtle">
              •
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CautionList({
  title,
  items,
}: {
  title: string;
  items: { claim: string; why: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="text-warning text-xs font-semibold tracking-wide uppercase">{title}</h4>
      <ul className="mt-1.5 flex flex-col gap-2">
        {items.map((item, index) => (
          <li
            key={index}
            className="border-warning/35 bg-warning-soft rounded-[var(--radius)] border px-3 py-2 text-sm"
          >
            <p className="text-ink font-medium">{item.claim}</p>
            <p className="text-ink-muted mt-0.5">{item.why}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * A suggested rewrite of one sentence.
 *
 * Copy and Apply are separate, and Apply is always the student's explicit
 * choice — nothing here writes to the draft on its own.
 */
export function SentenceSuggestion({
  original,
  suggestion,
  why,
  onApply,
}: {
  original: string;
  suggestion: string;
  why: string;
  onApply?: (original: string, suggestion: string) => void;
}) {
  return (
    <li className="border-line bg-surface rounded-[var(--radius)] border px-3 py-2.5">
      <p className="text-ink-subtle text-xs">You wrote</p>
      <p className="text-ink-muted decoration-ink-subtle/50 mt-0.5 text-sm line-through">
        {original}
      </p>

      <p className="text-ink-subtle mt-2.5 text-xs">One option</p>
      <p className="text-ink mt-0.5 text-sm">{suggestion}</p>

      <p className="text-ink-muted mt-2 text-xs">{why}</p>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <CopyButton text={suggestion} />
        {onApply ? (
          <Button variant="secondary" size="sm" onClick={() => onApply(original, suggestion)}>
            Replace in my draft
          </Button>
        ) : null}
      </div>
    </li>
  );
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={copy}>
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      {copied ? 'Copied' : label}
    </Button>
  );
}

/** Footer shown under every coach response. */
export function CoachDisclaimer({ offline }: { offline: boolean }) {
  return (
    <div className="border-line text-ink-muted flex flex-col gap-1.5 border-t pt-3 text-xs">
      <p className="flex flex-wrap items-center gap-2">
        <Badge tone={offline ? 'neutral' : 'accent'}>
          {offline ? 'Offline coach' : 'AI coach'}
        </Badge>
        {offline
          ? 'No AI key is configured, so these notes are built from your own text by rule, not by a model.'
          : 'These are suggestions from a language model.'}
      </p>
      <p>
        Nothing here is a prediction about admission, and none of it should be treated as fact about
        a college. The writing stays yours — take what is useful and ignore the rest.
      </p>
    </div>
  );
}
