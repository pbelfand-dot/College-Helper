import 'server-only';

import {
  closeSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  writeSync,
} from 'node:fs';
import { dirname } from 'node:path';
import type { UserDataBundle } from '@/lib/domain/types';
import { buildDemoBundle, buildEmptyBundle } from '../demo/seed';
import type { BundleStore } from '../bundle-store';

/**
 * A `BundleStore` backed by one JSON file on the machine the app runs on.
 *
 * This is what makes the desktop build worth having: the demo store keeps
 * everything in a `Map` with a twelve-hour lifetime, so a student who closed
 * the window would lose their college list. Here the bundle is loaded once,
 * kept in memory, and written back after changes.
 *
 * Writes are debounced, because a single server action can touch several
 * records and typing in an essay autosaves, and they are atomic — a temp file
 * plus `rename`, so a crash or a power cut halfway through can leave the old
 * file or the new one, never a half-written one.
 */

/** Long enough to coalesce a burst of edits, short enough to be invisible. */
const WRITE_DEBOUNCE_MS = 150;

export class FileBundleStore implements BundleStore {
  private bundle: UserDataBundle | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: Promise<void> | null = null;
  private resolvePending: (() => void) | null = null;

  constructor(private readonly filePath: string) {}

  read(): UserDataBundle {
    if (!this.bundle) this.bundle = this.load();
    return this.bundle;
  }

  reset(seeded: boolean): void {
    /*
     * Written straight through rather than debounced. This backs "delete
     * everything", and a student who has just asked for their records to be
     * gone should not have them sitting on disk for another moment.
     */
    this.bundle = seeded ? buildDemoBundle() : buildEmptyBundle();
    this.savePending();
  }

  commit(): void {
    if (!this.bundle) return;

    if (!this.pending) {
      this.pending = new Promise<void>((resolve) => {
        this.resolvePending = resolve;
      });
    }
    unsaved.add(this);
    installExitHooks();

    // Restart the timer so a burst of edits produces one write at the end of
    // the burst rather than one write per edit.
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.savePending(), WRITE_DEBOUNCE_MS);
    // A queued save must never be the reason the process stays alive.
    this.timer.unref?.();
  }

  async flush(): Promise<void> {
    this.savePending();
    await this.pending;
  }

  // --- Reading --------------------------------------------------------------

  private load(): UserDataBundle {
    let raw: string;
    try {
      raw = readFileSync(this.filePath, 'utf8');
    } catch {
      // No file yet: first run. Start empty so the student lands on onboarding
      // rather than inheriting a fictional person's college list.
      return buildEmptyBundle();
    }

    try {
      return normalise(JSON.parse(raw));
    } catch {
      /*
       * The file exists but is not usable. Never overwrite it in place — it may
       * be the only copy of somebody's essays, and a corrupt parse is often a
       * truncation that a person could still recover text from by hand. Move it
       * aside under a name that says what happened, then start clean.
       */
      const salvage = `${this.filePath}.unreadable-${Date.now()}`;
      try {
        renameSync(this.filePath, salvage);
        console.warn(`ApplyPilot: could not read the data file; kept a copy at ${salvage}`);
      } catch {
        console.warn('ApplyPilot: could not read the data file and could not move it aside.');
      }
      return buildEmptyBundle();
    }
  }

  // --- Writing --------------------------------------------------------------

  /**
   * Writes whatever is in memory, now, synchronously.
   *
   * Called by the debounce timer, by `flush`, and by the exit hooks below —
   * which is why it has to be synchronous: an `exit` listener cannot await
   * anything.
   */
  savePending(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    unsaved.delete(this);

    const bundle = this.bundle;
    const done = this.resolvePending;
    this.pending = null;
    this.resolvePending = null;

    if (bundle) {
      try {
        writeBundleSync(this.filePath, bundle);
      } catch (error) {
        // Never throw out of a background save: a failed write must not take
        // down the request that happened to trigger it. The in-memory bundle is
        // still correct, and the next commit tries again.
        console.error('ApplyPilot: could not save the data file.', describe(error));
      }
    }

    done?.();
  }
}

/**
 * Saving on the way out.
 *
 * Between a change and its debounced write there is a window in which quitting
 * would lose the last edit — most likely the sentence someone typed just before
 * closing the app. These handlers close that window. They are installed once
 * per process, not once per store, and only after something is actually waiting
 * to be written.
 */
const unsaved = new Set<FileBundleStore>();
let exitHooked = false;

function installExitHooks(): void {
  if (exitHooked) return;
  exitHooked = true;

  const saveAll = () => {
    for (const store of [...unsaved]) store.savePending();
  };

  process.on('exit', saveAll);
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
    process.on(signal, () => {
      saveAll();
      process.exit(0);
    });
  }
}

/** Temp file, fsync, rename: the reader sees either the old file or the new one. */
function writeBundleSync(filePath: string, bundle: UserDataBundle): void {
  mkdirSync(dirname(filePath), { recursive: true });

  const temp = `${filePath}.tmp`;
  const handle = openSync(temp, 'w');
  try {
    writeSync(handle, JSON.stringify(bundle, null, 2));
    // Force the bytes to disk before the rename, so the rename cannot land
    // first and leave an empty file behind after a power cut.
    fsyncSync(handle);
  } finally {
    closeSync(handle);
  }
  renameSync(temp, filePath);
}

/**
 * Squares a parsed file with the shape the repository expects.
 *
 * The file is the student's own, on their own machine, so this is not a trust
 * boundary in the way an HTTP body is. It is a *compatibility* boundary: a file
 * written by an older build can be missing a collection that a newer one reads,
 * and `undefined.filter` is a much worse failure than an empty list. Anything
 * that is not an array of the right name is replaced by an empty one.
 */
function normalise(parsed: unknown): UserDataBundle {
  if (typeof parsed !== 'object' || parsed === null) throw new Error('not an object');
  const source = parsed as Record<string, unknown>;
  const empty = buildEmptyBundle();

  const bundle = { ...empty } as Record<string, unknown>;
  for (const key of Object.keys(empty) as (keyof UserDataBundle)[]) {
    const value = source[key];
    if (key === 'profile') {
      bundle[key] = typeof value === 'object' && value !== null ? value : null;
    } else if (Array.isArray(value)) {
      bundle[key] = value;
    }
  }
  return bundle as unknown as UserDataBundle;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
