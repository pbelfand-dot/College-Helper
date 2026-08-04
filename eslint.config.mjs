import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      /*
       * A leading underscore marks a parameter that exists to satisfy an
       * interface rather than because the implementation needs it — for
       * example the demo repository's `userId`, which is kept so both storage
       * adapters present an identical signature.
       */
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    /*
     * The Electron main process and its preload run as CommonJS: the package
     * has no `"type": "module"`, and the main process is the one place in this
     * repository that is not bundled by Next. `require` is the correct call
     * there, not a leftover.
     */
    files: ['desktop/**/*.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Packaged desktop builds: 370MB of Electron runtime, none of it ours.
    'dist-desktop/**',
  ]),
]);

export default eslintConfig;
