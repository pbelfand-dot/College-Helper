/**
 * Test stub for the `server-only` package.
 *
 * `server-only` is a build-time guard: importing it from a client component
 * fails the Next.js build. That check has no meaning inside Vitest, where the
 * real package throws simply because the test environment is not a React
 * Server Component. Aliasing it to this empty module lets server modules be
 * unit-tested while the real guard still protects the actual build.
 */
export {};
