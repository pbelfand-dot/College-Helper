import 'server-only';

import type { UserDataBundle } from '@/lib/domain/types';
import { buildDemoBundle, buildEmptyBundle } from './seed';

/**
 * Server-side store for demo workspaces.
 *
 * Each demo visitor gets their own bundle keyed by an opaque workspace id held
 * in an httpOnly cookie, so two people hitting the same deployed demo never see
 * each other's edits. The data is intentionally in-memory: a demo workspace is
 * disposable, and keeping it out of any database means demo activity can never
 * touch production rows.
 *
 * The store survives hot reloads by hanging off `globalThis`.
 */

interface DemoStore {
  workspaces: Map<string, UserDataBundle>;
  lastTouched: Map<string, number>;
}

const STORE_KEY = Symbol.for('applypilot.demo.store');

type GlobalWithStore = typeof globalThis & { [STORE_KEY]?: DemoStore };

function store(): DemoStore {
  const globalScope = globalThis as GlobalWithStore;
  if (!globalScope[STORE_KEY]) {
    globalScope[STORE_KEY] = { workspaces: new Map(), lastTouched: new Map() };
  }
  return globalScope[STORE_KEY];
}

/** Long enough for a real demo session, short enough to bound memory. */
const MAX_WORKSPACES = 500;
const WORKSPACE_TTL_MS = 12 * 60 * 60 * 1000;

function evictStale(): void {
  const { workspaces, lastTouched } = store();
  const now = Date.now();

  for (const [id, touched] of lastTouched) {
    if (now - touched > WORKSPACE_TTL_MS) {
      workspaces.delete(id);
      lastTouched.delete(id);
    }
  }

  // Hard cap: drop the least recently used workspaces if we are still over.
  if (workspaces.size > MAX_WORKSPACES) {
    const ordered = [...lastTouched.entries()].sort((a, b) => a[1] - b[1]);
    for (const [id] of ordered.slice(0, workspaces.size - MAX_WORKSPACES)) {
      workspaces.delete(id);
      lastTouched.delete(id);
    }
  }
}

/** Returns the workspace for this id, seeding it on first use. */
export function getWorkspace(workspaceId: string, seeded = true): UserDataBundle {
  const { workspaces, lastTouched } = store();
  evictStale();

  let bundle = workspaces.get(workspaceId);
  if (!bundle) {
    bundle = seeded ? buildDemoBundle() : buildEmptyBundle();
    workspaces.set(workspaceId, bundle);
  }
  lastTouched.set(workspaceId, Date.now());
  return bundle;
}

export function resetWorkspace(workspaceId: string, seeded = true): UserDataBundle {
  const { workspaces, lastTouched } = store();
  const bundle = seeded ? buildDemoBundle() : buildEmptyBundle();
  workspaces.set(workspaceId, bundle);
  lastTouched.set(workspaceId, Date.now());
  return bundle;
}

export function clearWorkspace(workspaceId: string): void {
  const { workspaces, lastTouched } = store();
  workspaces.set(workspaceId, buildEmptyBundle());
  lastTouched.set(workspaceId, Date.now());
}

export function deleteWorkspace(workspaceId: string): void {
  const { workspaces, lastTouched } = store();
  workspaces.delete(workspaceId);
  lastTouched.delete(workspaceId);
}
