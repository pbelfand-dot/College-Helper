'use client';

import * as React from 'react';

export type SaveState =
  | { status: 'idle' }
  | { status: 'unsaved' }
  | { status: 'saving' }
  | { status: 'saved'; at: Date }
  | { status: 'error'; message: string };

/**
 * Debounced autosave.
 *
 * Deliberate behaviours:
 *  - the first render never triggers a save, so opening an essay does not
 *    create a spurious version;
 *  - a save in flight is not duplicated; the newest text is saved after it;
 *  - the state is exposed so the editor can always tell the student whether
 *    their words are safely stored.
 */
export function useAutosave({
  value,
  onSave,
  delayMs = 1500,
  enabled = true,
}: {
  value: string;
  onSave: (value: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  delayMs?: number;
  enabled?: boolean;
}): { state: SaveState; saveNow: () => Promise<void> } {
  const [state, setState] = React.useState<SaveState>({ status: 'idle' });

  const savedValue = React.useRef(value);
  const inFlight = React.useRef(false);
  const pendingValue = React.useRef<string | null>(null);
  const onSaveRef = React.useRef(onSave);
  onSaveRef.current = onSave;

  const flush = React.useCallback(async (next: string) => {
    if (inFlight.current) {
      pendingValue.current = next;
      return;
    }

    inFlight.current = true;
    setState({ status: 'saving' });

    const result = await onSaveRef.current(next);

    inFlight.current = false;
    if (result.ok) {
      savedValue.current = next;
      setState({ status: 'saved', at: new Date() });
    } else {
      setState({ status: 'error', message: result.error });
    }

    // Someone typed while we were saving — save that too.
    const queued = pendingValue.current;
    pendingValue.current = null;
    if (queued !== null && queued !== next) void flush(queued);
  }, []);

  React.useEffect(() => {
    if (!enabled) return;
    if (value === savedValue.current) return;

    setState((current) => (current.status === 'saving' ? current : { status: 'unsaved' }));
    const timer = setTimeout(() => void flush(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs, enabled, flush]);

  const saveNow = React.useCallback(async () => {
    await flush(value);
  }, [flush, value]);

  return { state, saveNow };
}

/** Human-readable status for the editor's save indicator. */
export function describeSaveState(state: SaveState): string {
  switch (state.status) {
    case 'idle':
      return 'All changes saved';
    case 'unsaved':
      return 'Unsaved changes';
    case 'saving':
      return 'Saving…';
    case 'saved':
      return `Saved at ${state.at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    case 'error':
      return state.message;
  }
}
