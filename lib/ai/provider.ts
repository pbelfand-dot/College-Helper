import 'server-only';

import type { z } from 'zod';

/**
 * The AI provider seam.
 *
 * Everything the product knows about models goes through this interface, which
 * only ever runs on the server. Adding a second provider means adding one file
 * here; it does not mean touching a single component.
 */

export interface StructuredRequest<T> {
  /** Instructions describing the coach's role and hard limits. */
  system: string;
  /** The student-supplied material, already assembled and bounded. */
  user: string;
  /** The shape the response must satisfy before the UI is allowed to see it. */
  schema: z.ZodType<T>;
  /** Name of the shape, used in the prompt and in provider-side tool calls. */
  schemaName: string;
  /** Opaque, content-free id used only to correlate logs. */
  requestId: string;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface TextRequest {
  system: string;
  user: string;
  requestId: string;
  maxTokens?: number;
  signal?: AbortSignal;
}

export type AIFailureReason =
  | 'not-configured'
  | 'rate-limited'
  | 'timeout'
  | 'invalid-output'
  | 'refused'
  | 'unavailable';

export class AIError extends Error {
  readonly reason: AIFailureReason;
  /** Copy that is safe to show a student. Never contains provider internals. */
  readonly userMessage: string;

  constructor(reason: AIFailureReason, userMessage: string, technical?: string) {
    super(technical ?? reason);
    this.name = 'AIError';
    this.reason = reason;
    this.userMessage = userMessage;
  }
}

export interface AIProvider {
  readonly providerName: string;
  /** False when the provider has no credentials and should not be selected. */
  isConfigured(): boolean;
  generateStructuredResponse<T>(request: StructuredRequest<T>): Promise<T>;
  generateText(request: TextRequest): Promise<string>;
}

/** How long any single model call is allowed to take. */
export const AI_TIMEOUT_MS = 45_000;
