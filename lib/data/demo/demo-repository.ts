import 'server-only';

import { BundleRepository } from '../bundle-repository';
import { MemoryBundleStore } from './memory-store';

/**
 * The repository backing demo mode.
 *
 * All of the behaviour lives in `BundleRepository`; the only thing demo mode
 * decides is that the bundle sits in server memory and is thrown away when the
 * workspace expires.
 */
export class DemoRepository extends BundleRepository {
  constructor(workspaceId: string) {
    super('demo', new MemoryBundleStore(workspaceId));
  }
}
