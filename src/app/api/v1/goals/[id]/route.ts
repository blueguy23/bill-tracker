import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { handleUpdateGoal, handleDeleteGoal } from '@/handlers/goals';
import { logger } from '@/lib/logger';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteContext): Promise<Response> {
  try {
    const { id } = await params;
    const db = await getDb();
    return handleUpdateGoal(db, req, id);
  } catch (err) {
    logger.error('route.error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext): Promise<Response> {
  try {
    const { id } = await params;
    const db = await getDb();
    return handleDeleteGoal(db, id);
  } catch (err) {
    logger.error('route.error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
