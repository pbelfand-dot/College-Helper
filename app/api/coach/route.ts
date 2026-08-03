import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getRepositoryForSession } from '@/lib/data/factory';
import { coachRequestSchema } from '@/lib/validation/schemas';
import { buildCoachContext } from '@/lib/ai/context';
import { getAIProvider, describeProvider } from '@/lib/ai/factory';
import { buildPrompt } from '@/lib/ai/prompts';
import { schemaForMode, schemaNames } from '@/lib/ai/schemas';
import { AIError, AI_TIMEOUT_MS } from '@/lib/ai/provider';
import { getRateLimiter, AI_RATE_LIMIT } from '@/lib/ai/rate-limit';
import { newRequestId } from '@/lib/utils/id';

/**
 * The only route that talks to a model.
 *
 * Order of operations, all of it server-side:
 *   authenticate → validate → rate-limit → assemble only consented material
 *   (scoped to this user) → prompt → call → validate the response → return.
 *
 * Nothing here logs prompt content, draft text, profile detail or the user id.
 * The request id is random and carries no information about the student.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const requestId = newRequestId();

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'We could not read that request.' }, { status: 400 });
  }

  const parsed = coachRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'That request was not valid. Try shortening your message.' },
      { status: 400 },
    );
  }

  const limit = await getRateLimiter().check(`coach:${session.userId}`);
  if (!limit.allowed) {
    const seconds = Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000));
    return NextResponse.json(
      {
        error: `You have used all ${AI_RATE_LIMIT.limit} coaching requests for now. Try again in about ${Math.ceil(seconds / 60)} minute(s).`,
      },
      { status: 429, headers: { 'Retry-After': String(seconds) } },
    );
  }

  const repository = await getRepositoryForSession(session);
  const { mode } = parsed.data;

  const context = await buildCoachContext({
    mode,
    userId: session.userId,
    repository,
    includeDraft: parsed.data.includeDraft,
    essayId: parsed.data.essayId,
    activityId: parsed.data.activityId,
    collegeId: parsed.data.collegeId,
  });

  if (context.missing.length > 0) {
    return NextResponse.json(
      { error: `We could not find ${context.missing.join(' and ')}.` },
      { status: 404 },
    );
  }

  const prompt = buildPrompt({
    mode,
    message: parsed.data.message,
    material: context.material,
    voiceNotes: context.voiceNotes,
  });

  const provider = await getAIProvider();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const result = await provider.generateStructuredResponse({
      system: prompt.system,
      user: prompt.user,
      schema: schemaForMode(mode),
      schemaName: schemaNames[mode],
      requestId,
      signal: controller.signal,
    });

    return NextResponse.json({
      mode,
      requestId,
      provider: describeProvider(),
      result,
    });
  } catch (error) {
    if (error instanceof AIError) {
      const status =
        error.reason === 'rate-limited' ? 429 : error.reason === 'not-configured' ? 503 : 502;
      console.error(`[coach] failed reason=${error.reason} request=${requestId}`);
      return NextResponse.json({ error: error.userMessage, requestId }, { status });
    }

    console.error(`[coach] unexpected failure request=${requestId}`);
    return NextResponse.json(
      { error: 'Something went wrong reaching the coach. Please try again.', requestId },
      { status: 500 },
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Returns the exact material a request would send, without sending anything. */
export async function PUT(request: Request): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'We could not read that request.' }, { status: 400 });
  }

  const parsed = coachRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'That request was not valid.' }, { status: 400 });
  }

  const repository = await getRepositoryForSession(session);
  const context = await buildCoachContext({
    mode: parsed.data.mode,
    userId: session.userId,
    repository,
    includeDraft: parsed.data.includeDraft,
    essayId: parsed.data.essayId,
    activityId: parsed.data.activityId,
    collegeId: parsed.data.collegeId,
  });

  return NextResponse.json({
    provider: describeProvider(),
    material: context.material,
    includesVoiceNotes: Boolean(context.voiceNotes),
    missing: context.missing,
  });
}
