import 'server-only';

import { env } from '@/lib/config/env';
import type { AIProvider } from './provider';
import { MockAIProvider } from './providers/mock';

/**
 * Chooses the provider.
 *
 * Falls back to the offline coach whenever Anthropic is not properly
 * configured, so a missing key degrades the product rather than breaking it.
 */
let cached: AIProvider | null = null;

export async function getAIProvider(): Promise<AIProvider> {
  if (cached) return cached;

  if (env.ai.provider === 'anthropic' && env.ai.anthropicApiKey) {
    const { AnthropicAIProvider } = await import('./providers/anthropic');
    const provider = new AnthropicAIProvider();
    if (provider.isConfigured()) {
      cached = provider;
      return cached;
    }
  }

  cached = new MockAIProvider();
  return cached;
}

/** Test seam. */
export function setAIProvider(provider: AIProvider | null): void {
  cached = provider;
}

/** Safe for the client: says which coach is running, never how to reach it. */
export function describeProvider(): { name: string; offline: boolean } {
  const offline = !(env.ai.provider === 'anthropic' && env.ai.anthropicApiKey);
  return { name: offline ? 'offline coach' : 'Anthropic', offline };
}
