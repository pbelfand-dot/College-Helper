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

import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

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

dropImageOptimizer();

console.log('Standalone server ready to package.');

/**
 * Removes `sharp` and its libvips binaries from the traced server.
 *
 * Next traces the image optimizer into every standalone build whether or not
 * anything uses it. ApplyPilot renders no `next/image` — every graphic is an
 * inline SVG icon — so that is 33 MB of native binaries for a route nothing
 * links to. In a Windows package cross-built from Linux they are *Linux*
 * binaries, which could not have run there under any circumstances. They are
 * also the `sharp`/libvips advisories that `npm audit` reports against this
 * tree, so leaving them out removes a real finding instead of muting it.
 *
 * Guarded rather than unconditional: if anybody later adds a `next/image`, this
 * stops and says so, because a missing optimizer would then be a genuine
 * regression rather than dead weight.
 */
function dropImageOptimizer() {
  if (usesNextImage()) {
    console.log('next/image is in use — keeping sharp in the desktop build.');
    return;
  }

  const modules = join(standalone, 'node_modules');
  let freed = 0;

  for (const name of ['@img', 'sharp', 'detect-libc']) {
    const target = join(modules, name);
    if (!existsSync(target)) continue;
    freed += directorySize(target);
    rmSync(target, { recursive: true, force: true });
  }

  if (freed > 0) {
    console.log(`dropped the unused image optimizer (${Math.round(freed / 1024 / 1024)} MB)`);
  }
}

function usesNextImage() {
  const sources = ['app', 'components', 'lib'];
  const wanted = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);

  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (walk(full)) return true;
      } else if (wanted.has(extname(entry.name))) {
        if (/from\s+['"]next\/image['"]/.test(readFileSync(full, 'utf8'))) return true;
      }
    }
    return false;
  };

  return sources.filter((dir) => existsSync(join(root, dir))).some((dir) => walk(join(root, dir)));
}

function directorySize(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    total += entry.isDirectory() ? directorySize(full) : statSync(full).size;
  }
  return total;
}
