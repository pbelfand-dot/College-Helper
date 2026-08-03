import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import { getRepositoryForSession } from '@/lib/data/factory';
import {
  buildActivitiesCsv,
  buildAllEssaysMarkdown,
  buildChecklistMarkdown,
  buildJsonExport,
  safeFilename,
} from '@/lib/export/serialize';

/**
 * Data export.
 *
 * The bundle comes from `repository.exportUserData(session.userId)`, so an
 * export can only ever contain the signed-in student's own records — the route
 * has no way to widen that.
 *
 * `Content-Disposition` uses a filename we construct, never one the user
 * supplies directly.
 */

const kindSchema = z.enum(['json', 'essays', 'activities', 'checklist']);

const CONTENT_TYPES = {
  json: 'application/json; charset=utf-8',
  essays: 'text/markdown; charset=utf-8',
  activities: 'text/csv; charset=utf-8',
  checklist: 'text/markdown; charset=utf-8',
} as const;

const EXTENSIONS = {
  json: 'json',
  essays: 'md',
  activities: 'csv',
  checklist: 'md',
} as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string }> },
): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
  }

  const { kind: rawKind } = await params;
  const kind = kindSchema.safeParse(rawKind);
  if (!kind.success) {
    return NextResponse.json({ error: 'That export type is not available.' }, { status: 404 });
  }

  const repository = await getRepositoryForSession(session);
  const bundle = await repository.exportUserData(session.userId);
  const timeZone = bundle.profile?.timeZone ?? 'UTC';

  const body =
    kind.data === 'json'
      ? buildJsonExport(bundle)
      : kind.data === 'essays'
        ? buildAllEssaysMarkdown(bundle, timeZone)
        : kind.data === 'activities'
          ? buildActivitiesCsv(bundle)
          : buildChecklistMarkdown(bundle, timeZone);

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = safeFilename(`applypilot-${kind.data}-${stamp}`, EXTENSIONS[kind.data]);

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': CONTENT_TYPES[kind.data],
      'Content-Disposition': `attachment; filename="${filename}"`,
      // An export is personal data; never let it sit in a shared cache.
      'Cache-Control': 'no-store, private',
    },
  });
}
