import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { handleUpdateBill, handleDeleteBill } from '@/handlers/bills';
import { checkBillNotifications } from '@/handlers/notifications';
import { logger } from '@/lib/logger';
import { withRequestLogging } from '@/lib/withRequestLogging';

type RouteContext = { params: Promise<{ id: string }> };

async function _PATCH(req: NextRequest, { params }: RouteContext): Promise<Response> {
  try {
    const { id } = await params;
    const db = await getDb();
    const res = await handleUpdateBill(db, req, id);
    if (res.status === 200) {
      const body = await res.clone().json() as { bill?: Parameters<typeof checkBillNotifications>[1] };
      if (body.bill) checkBillNotifications(db, body.bill);
    }
    return res;
  } catch (err) {
    logger.error('route.error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function _DELETE(_req: NextRequest, { params }: RouteContext): Promise<Response> {
  try {
    const { id } = await params;
    const db = await getDb();
    return handleDeleteBill(db, id);
  } catch (err) {
    logger.error('route.error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const PATCH = withRequestLogging(_PATCH);
export const DELETE = withRequestLogging(_DELETE);
