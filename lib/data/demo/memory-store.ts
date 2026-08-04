import 'server-only';

import type { UserDataBundle } from '@/lib/domain/types';
import type { BundleStore } from '../bundle-store';
import { clearWorkspace, getWorkspace, resetWorkspace } from './store';

/**
 * The demo store: a bundle in server memory, keyed by workspace id.
 *
 * `commit` does nothing because the bundle the repository mutated *is* the
 * stored one — there is nowhere else for it to go. Demo data is deliberately
 * not durable, so this is the whole implementation.
 */
export class MemoryBundleStore implements BundleStore {
  constructor(private readonly workspaceId: string) {}

  read(): UserDataBundle {
    return getWorkspace(this.workspaceId);
  }

  reset(seeded: boolean): void {
    if (seeded) resetWorkspace(this.workspaceId);
    else clearWorkspace(this.workspaceId);
  }

  commit(): void {}

  async flush(): Promise<void> {}
}
