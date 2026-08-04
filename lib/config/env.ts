import 'server-only';

/**
 * Environment configuration, read once and never re-exported to the client.
 *
 * Only `NEXT_PUBLIC_*` values are safe in a browser bundle; everything else in
 * this file is server-only, which is why the module imports `server-only`.
 */

function readString(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

const supabaseUrl = readString(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = readString(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const anthropicApiKey = readString(process.env.ANTHROPIC_API_KEY);
const forcedDemo = readString(process.env.DEMO_MODE) === 'true';
const providerOverride = readString(process.env.AI_PROVIDER);

/**
 * Where records are stored.
 *
 * `file` is the desktop build: one student on one machine, everything in a JSON
 * file the Electron shell points at. It is opt-in through the environment
 * rather than inferred, because writing to somebody's disk should never be
 * something a deployment falls into by accident.
 */
const dataFile = readString(process.env.APPLYPILOT_DATA_FILE);
const fileStorage = readString(process.env.APPLYPILOT_STORAGE) === 'file' && Boolean(dataFile);

const storage: 'demo' | 'file' | 'supabase' = fileStorage
  ? 'file'
  : forcedDemo || !(supabaseUrl && supabaseAnonKey)
    ? 'demo'
    : 'supabase';

export const env = {
  appUrl: readString(process.env.NEXT_PUBLIC_APP_URL) ?? 'http://localhost:3000',

  supabase: {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    serviceRoleKey: readString(process.env.SUPABASE_SERVICE_ROLE_KEY),
    /** Both public values must be present before we try to use Supabase at all. */
    isConfigured: Boolean(supabaseUrl && supabaseAnonKey),
  },

  ai: {
    anthropicApiKey,
    model: readString(process.env.ANTHROPIC_MODEL) ?? 'claude-sonnet-4-5',
    /**
     * `AI_PROVIDER` wins when set. Otherwise we use Anthropic if a key exists
     * and the deterministic offline coach if it does not.
     */
    provider:
      providerOverride === 'mock'
        ? ('mock' as const)
        : providerOverride === 'anthropic'
          ? ('anthropic' as const)
          : anthropicApiKey
            ? ('anthropic' as const)
            : ('mock' as const),
  },

  storage,

  /** Absolute path to the desktop build's data file. Null in every other mode. */
  dataFile: storage === 'file' ? dataFile : null,

  /**
   * Demo mode: sample data, nothing durable, no account.
   *
   * The desktop build is explicitly *not* demo mode even though it also runs
   * without credentials — its records are the student's real ones, so the demo
   * banner and the "reset the sample data" control must stay off.
   */
  demoMode: storage === 'demo',
} as const;

/** Safe to send to the browser: booleans and names only, never key material. */
export interface PublicRuntimeConfig {
  demoMode: boolean;
  storageAdapter: 'demo' | 'file' | 'supabase';
  aiProvider: 'anthropic' | 'mock';
  aiConfigured: boolean;
}

export function publicRuntimeConfig(): PublicRuntimeConfig {
  return {
    demoMode: env.demoMode,
    storageAdapter: env.storage,
    aiProvider: env.ai.provider,
    aiConfigured: env.ai.provider === 'anthropic' && Boolean(env.ai.anthropicApiKey),
  };
}
