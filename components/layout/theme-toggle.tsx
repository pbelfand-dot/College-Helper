'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import { subscribeToStorage, useClientValue } from '@/lib/utils/use-client-value';

type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'applypilot-theme';

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system';
}

function readStoredTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

function applyTheme(theme: Theme): void {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle(
    'dark',
    theme === 'dark' || (theme === 'system' && prefersDark),
  );
}

const options: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function ThemeToggle() {
  /**
   * The stored preference is browser state, so it is read through
   * `useSyncExternalStore` rather than copied into React state in an effect.
   * A change in another tab updates this one.
   */
  const [version, setVersion] = React.useState(0);
  const subscribe = React.useCallback((onChange: () => void) => subscribeToStorage(onChange), []);
  const getStored = React.useCallback(() => {
    void version; // re-read after this tab writes a new value
    return readStoredTheme();
  }, [version]);

  const theme = useClientValue<Theme>(getStored, 'system', subscribe);

  // Keep the document class in step with the OS setting while "system" is active.
  React.useEffect(() => {
    if (theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => applyTheme('system');
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [theme]);

  function choose(next: Theme) {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // A blocked localStorage should not stop the theme changing for this page.
    }
    applyTheme(next);
    setVersion((current) => current + 1);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="border-line-strong inline-flex gap-1 rounded-[var(--radius)] border p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={theme === option.value}
          onClick={() => choose(option.value)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-[calc(var(--radius)-2px)] px-2.5 py-1.5 text-xs transition-colors',
            theme === option.value
              ? 'bg-accent-soft text-accent-text font-medium'
              : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
          )}
        >
          <option.icon className="size-3.5" aria-hidden="true" />
          {option.label}
        </button>
      ))}
    </div>
  );
}
