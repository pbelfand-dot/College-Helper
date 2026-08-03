'use client';

import * as React from 'react';

/**
 * Reads a value that only exists in the browser (localStorage, `Intl`,
 * `matchMedia`) without triggering a hydration mismatch and without the
 * setState-inside-an-effect pattern.
 *
 * On the server, and on the very first client render, `serverValue` is used;
 * React then re-renders with the real client value. `getClientValue` must
 * return a primitive, or the same reference each call, because React compares
 * snapshots by identity.
 */
export function useClientValue<T>(
  getClientValue: () => T,
  serverValue: T,
  subscribe: (onChange: () => void) => () => void = () => () => {},
): T {
  const getSnapshot = React.useCallback(() => getClientValue(), [getClientValue]);
  const getServerSnapshot = React.useCallback(() => serverValue, [serverValue]);
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Subscribes to `storage` events so another tab's change is picked up. */
export function subscribeToStorage(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}
