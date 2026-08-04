import 'server-only';

import { BundleRepository } from '../bundle-repository';
import type { BundleStore } from '../bundle-store';
import { FileBundleStore } from './file-store';

/**
 * The repository backing the desktop build: one student, one file, no server.
 *
 * The store is shared for the whole process. Two requests arriving together
 * must edit the same in-memory bundle — if each built its own store they would
 * both load the file, then overwrite each other's changes on the way out.
 */
const STORE_KEY = Symbol.for('applypilot.local.stores');

type GlobalWithStores = typeof globalThis & { [STORE_KEY]?: Map<string, BundleStore> };

export function getFileStore(filePath: string): BundleStore {
  const scope = globalThis as GlobalWithStores;
  if (!scope[STORE_KEY]) scope[STORE_KEY] = new Map();

  let store = scope[STORE_KEY].get(filePath);
  if (!store) {
    store = new FileBundleStore(filePath);
    scope[STORE_KEY].set(filePath, store);
  }
  return store;
}

export class LocalRepository extends BundleRepository {
  constructor(filePath: string) {
    super('file', getFileStore(filePath));
  }
}
