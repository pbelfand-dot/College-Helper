#!/usr/bin/env node

/**
 * Assembles the standalone server so it can actually serve itself.
 *
 * `next build` with `output: 'standalone'` writes a server and the node_modules
 * it traced, but it does not copy the static assets that server needs to hand
 * out: `.next/static` (the JS, CSS and the self-hosted Inter font) and `public`.
 * Without this step the desktop app opens a window onto an unstyled page.
 *
 * Everything here is a copy into `.next/standalone`, so it is safe to re-run.
 */

import { cpSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const standalone = join(root, '.next', 'standalone');

if (!existsSync(join(standalone, 'server.js'))) {
  console.error(
    'No standalone server found. Run `npm run build` first, and check that\n' +
      "next.config.ts still sets `output: 'standalone'`.",
  );
  process.exit(1);
}

for (const [from, to] of [
  [join(root, '.next', 'static'), join(standalone, '.next', 'static')],
  [join(root, 'public'), join(standalone, 'public')],
]) {
  if (!existsSync(from)) continue;
  // Remove first: a rebuild renames hashed chunks, and copying over the top
  // would leave the previous build's files behind to be packaged as well.
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
  console.log(`copied ${from.slice(root.length + 1)} -> ${to.slice(root.length + 1)}`);
}

console.log('Standalone server ready to package.');
