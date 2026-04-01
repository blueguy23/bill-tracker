import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { handleUpdateBill, handleDeleteBill } from '@/handlers/bills';
import { checkBillNotifications } from '@/handlers/notifications';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteContext): Promise<Response> {
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
    console.error('[PATCH /api/v1/bills/:id]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext): Promise<Response> {
  try {
    const { id } = await params;
    const db = await getDb();
    return handleDeleteBill(db, id);
  } catch (err) {
    console.error('[DELETE /api/v1/bills/:id]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
