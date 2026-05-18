import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { getAccountMeta, upsertAccountMeta } from '@/adapters/accountMeta';
import { logger } from '@/lib/logger';
import { withRequestLogging } from '@/lib/withRequestLogging';

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function _PATCH(req: NextRequest, { params }: RouteParams): Promise<Response> {
  try {
    const { id } = await params;
    const body = await req.json() as { customOrgName?: string | null };
    const db = await getDb();
    const existing = await getAccountMeta(db, id);
    await upsertAccountMeta(db, { ...existing, customOrgName: body.customOrgName ?? null });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error('route.error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const PATCH = withRequestLogging(_PATCH);
