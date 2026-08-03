'use client';

import * as React from 'react';
import type { CoachMode } from '@/lib/domain/types';

export interface CoachRequestBody {
  mode: CoachMode;
  message: string;
  includeDraft: boolean;
  essayId: string | null;
  activityId: string | null;
  collegeId: string | null;
}

export interface MaterialBlock {
  label: string;
  content: string;
}

export interface CoachPreview {
  provider: { name: string; offline: boolean };
  material: MaterialBlock[];
  includesVoiceNotes: boolean;
  missing: string[];
}

export interface CoachResponse<T = unknown> {
  mode: CoachMode;
  requestId: string;
  provider: { name: string; offline: boolean };
  result: T;
}

type Status = 'idle' | 'loading' | 'done' | 'error';

/**
 * Client-side hook for talking to `/api/coach`.
 *
 * The model is never called from here — this posts to our own route, which is
 * where the key lives. Errors always arrive as chosen copy from the server, so
 * there is nothing to sanitise before display.
 */
export function useCoach<T>() {
  const [status, setStatus] = React.useState<Status>('idle');
  const [result, setResult] = React.useState<CoachResponse<T> | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<CoachPreview | null>(null);

  const inFlight = React.useRef<AbortController | null>(null);

  const loadPreview = React.useCallback(async (body: CoachRequestBody) => {
    try {
      const response = await fetch('/api/coach', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        setPreview(null);
        return;
      }
      setPreview((await response.json()) as CoachPreview);
    } catch {
      setPreview(null);
    }
  }, []);

  const send = React.useCallback(async (body: CoachRequestBody) => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    setStatus('loading');
    setError(null);

    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          payload && typeof payload === 'object' && 'error' in payload
            ? String((payload as { error: unknown }).error)
            : 'The coach could not respond. Please try again.';
        setError(message);
        setStatus('error');
        return null;
      }

      const parsed = payload as CoachResponse<T>;
      setResult(parsed);
      setStatus('done');
      return parsed;
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return null;
      setError('We could not reach the coach. Check your connection and try again.');
      setStatus('error');
      return null;
    }
  }, []);

  const reset = React.useCallback(() => {
    inFlight.current?.abort();
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  React.useEffect(() => () => inFlight.current?.abort(), []);

  return { status, result, error, preview, send, loadPreview, reset };
}
