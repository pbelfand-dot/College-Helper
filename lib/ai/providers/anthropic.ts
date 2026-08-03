import 'server-only';

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { env } from '@/lib/config/env';
import {
  AI_TIMEOUT_MS,
  AIError,
  type AIProvider,
  type StructuredRequest,
  type TextRequest,
} from '../provider';

/**
 * Anthropic-backed coach.
 *
 * The API key is read from the server environment and never leaves it — this
 * module imports `server-only`, so a client component importing it fails the
 * build rather than shipping a key to a browser.
 *
 * Structured output is obtained with a forced tool call, then re-validated
 * against the zod schema on our side. The model's word is not taken for it.
 */
export class AnthropicAIProvider implements AIProvider {
  readonly providerName = 'anthropic';
  private client: Anthropic | null = null;

  isConfigured(): boolean {
    return Boolean(env.ai.anthropicApiKey);
  }

  private getClient(): Anthropic {
    if (!env.ai.anthropicApiKey) {
      throw new AIError('not-configured', 'AI coaching is not switched on for this installation.');
    }
    this.client ??= new Anthropic({
      apiKey: env.ai.anthropicApiKey,
      timeout: AI_TIMEOUT_MS,
      maxRetries: 1,
    });
    return this.client;
  }

  async generateStructuredResponse<T>(request: StructuredRequest<T>): Promise<T> {
    const client = this.getClient();

    let response: Anthropic.Message;
    try {
      response = await client.messages.create(
        {
          model: env.ai.model,
          max_tokens: request.maxTokens ?? 2048,
          system: request.system,
          messages: [{ role: 'user', content: request.user }],
          tools: [
            {
              name: request.schemaName,
              description: `Return the coaching response as ${request.schemaName}.`,
              input_schema: toJsonSchema(request.schema, request.schemaName),
            },
          ],
          tool_choice: { type: 'tool', name: request.schemaName },
        },
        { signal: request.signal },
      );
    } catch (error) {
      throw translateError(error, request.requestId);
    }

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    );
    if (!toolUse) {
      // The model declined to produce the structured shape.
      throw new AIError(
        'refused',
        'The coach could not respond to that. Try rephrasing what you are asking for.',
        `no tool_use block [${request.requestId}]`,
      );
    }

    const parsed = request.schema.safeParse(toolUse.input);
    if (!parsed.success) {
      throw new AIError(
        'invalid-output',
        'The coach sent back something we could not read. Please try again.',
        `schema mismatch [${request.requestId}]`,
      );
    }
    return parsed.data;
  }

  async generateText(request: TextRequest): Promise<string> {
    const client = this.getClient();

    try {
      const response = await client.messages.create(
        {
          model: env.ai.model,
          max_tokens: request.maxTokens ?? 1024,
          system: request.system,
          messages: [{ role: 'user', content: request.user }],
        },
        { signal: request.signal },
      );

      return response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
        .trim();
    } catch (error) {
      throw translateError(error, request.requestId);
    }
  }
}

/**
 * Maps SDK failures onto our own reasons.
 *
 * Only the request id — which is random and content-free — is ever logged. No
 * prompt, no draft, no profile detail, no key.
 */
function translateError(error: unknown, requestId: string): AIError {
  if (error instanceof Anthropic.APIError) {
    console.error(`[ai] provider error status=${error.status ?? 'unknown'} request=${requestId}`);

    if (error.status === 429) {
      return new AIError(
        'rate-limited',
        'The coach is busy right now. Wait a moment and try again.',
      );
    }
    if (error.status === 401 || error.status === 403) {
      return new AIError(
        'not-configured',
        'AI coaching is not configured correctly on this server.',
      );
    }
    return new AIError(
      'unavailable',
      'The coach is unavailable right now. Please try again shortly.',
    );
  }

  if (error instanceof Error && error.name === 'AbortError') {
    console.error(`[ai] request aborted request=${requestId}`);
    return new AIError(
      'timeout',
      'That took too long. Try again, or shorten what you are sending.',
    );
  }

  console.error(`[ai] unexpected provider failure request=${requestId}`);
  return new AIError(
    'unavailable',
    'The coach is unavailable right now. Please try again shortly.',
  );
}

/**
 * Converts a zod schema to the JSON Schema the tool API expects.
 *
 * Zod 4 can emit JSON Schema directly; the cast is because the SDK types the
 * field as its own loose record shape.
 */
function toJsonSchema(schema: z.ZodType<unknown>, name: string): Anthropic.Tool.InputSchema {
  const generated = z.toJSONSchema(schema, { target: 'draft-7', io: 'output' }) as Record<
    string,
    unknown
  >;
  return { ...generated, type: 'object', title: name } as Anthropic.Tool.InputSchema;
}
