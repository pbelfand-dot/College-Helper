'use client';

import { CheckCircle2, X, AlertCircle } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Minimal success/error feedback.
 *
 * Messages go into an `aria-live` region so a screen reader announces "Saved"
 * the same moment a sighted user sees it.
 */

type ToastTone = 'success' | 'error';

interface ToastMessage {
  id: number;
  tone: ToastTone;
  text: string;
}

interface ToastContextValue {
  notify: (text: string, tone?: ToastTone) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = React.useState<ToastMessage[]>([]);
  const nextId = React.useRef(0);

  const notify = React.useCallback((text: string, tone: ToastTone = 'success') => {
    const id = nextId.current++;
    setMessages((current) => [...current, { id, tone, text }]);
    setTimeout(() => {
      setMessages((current) => current.filter((message) => message.id !== id));
    }, 5000);
  }, []);

  const dismiss = React.useCallback((id: number) => {
    setMessages((current) => current.filter((message) => message.id !== id));
  }, []);

  const value = React.useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:right-4 sm:left-auto sm:items-end"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-[var(--radius)] border px-3.5 py-2.5 text-sm shadow-[var(--shadow-raised)]',
              message.tone === 'success'
                ? 'border-success/35 bg-success-soft text-ink'
                : 'border-danger/40 bg-danger-soft text-ink',
            )}
          >
            {message.tone === 'success' ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
            )}
            <span className="flex-1">{message.text}</span>
            <button
              type="button"
              onClick={() => dismiss(message.id)}
              className="rounded p-0.5 text-ink-subtle transition-colors hover:text-ink"
              aria-label="Dismiss notification"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside a ToastProvider.');
  return context;
}
