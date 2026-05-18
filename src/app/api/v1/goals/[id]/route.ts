import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { handleUpdateGoal, handleDeleteGoal } from '@/handlers/goals';
import { logger } from '@/lib/logger';
import { withRequestLogging } from '@/lib/withRequestLogging';

type RouteContext = { params: Promise<{ id: string }> };

async function _PATCH(req: NextRequest, { params }: RouteContext): Promise<Response> {
  try {
    const { id } = await params;
    const db = await getDb();
    return handleUpdateGoal(db, req, id);
  } catch (err) {
    logger.error('route.error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function _DELETE(_req: NextRequest, { params }: RouteContext): Promise<Response> {
  try {
    const { id } = await params;
    const db = await getDb();
    return handleDeleteGoal(db, id);
  } catch (err) {
    logger.error('route.error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const PATCH = withRequestLogging(_PATCH);
export const DELETE = withRequestLogging(_DELETE);
