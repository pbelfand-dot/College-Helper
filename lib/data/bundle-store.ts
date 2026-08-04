import 'server-only';

import type { UserDataBundle } from '@/lib/domain/types';

/**
 * Where a whole account's records live between calls.
 *
 * `BundleRepository` holds all the query, cascade and ordering logic and knows
 * nothing about durability; a `BundleStore` supplies the bundle and decides
 * whether changes survive the process. Demo mode uses server memory, the
 * desktop build uses a JSON file on disk, and neither needs its own copy of the
 * repository.
 */
export interface BundleStore {
  /**
   * The live bundle. Mutating what this returns mutates the store — the
   * repository edits records in place and then calls `commit`.
   */
  read(): UserDataBundle;

  /**
   * Throws the bundle away and starts again, seeded with the demo student's
   * records or completely empty. Backs the reset and delete-everything
   * controls in settings.
   */
  reset(seeded: boolean): void;

  /**
   * Records that the bundle changed.
   *
   * Implementations must treat this as "persist soon", not "persist exactly
   * what you can see right now" — writing may be debounced, and a caller is
   * allowed to call `commit` more often than it actually changes anything.
   */
  commit(): void;

  /** Waits for any pending write to finish. Resolves immediately if there is none. */
  flush(): Promise<void>;
}
