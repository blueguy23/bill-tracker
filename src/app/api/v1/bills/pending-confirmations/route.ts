import { NextResponse, NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { listPendingConfirmations, deletePendingConfirmation } from '@/adapters/pendingConfirmations';
import { updateBill, getBillById } from '@/adapters/bills';
import { createPayment } from '@/adapters/payments';
import { learnPaymentHint } from '@/handlers/learnPaymentHint';
import { logger } from '@/lib/logger';
import { withRequestLogging } from '@/lib/withRequestLogging';

async function _GET(): Promise<Response> {
  try {
    const db = await getDb();
    const pending = await listPendingConfirmations(db);
    return NextResponse.json({ confirmations: pending });
  } catch (err) {
    logger.error('pendingConfirmations.list.error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ confirmations: [] });
  }
}

async function _POST(req: NextRequest): Promise<Response> {
  try {
    const db = await getDb();
    const body = await req.json() as { id: string; action: 'confirm' | 'dismiss' };

    if (!body.id || !body.action) {
      return NextResponse.json({ error: 'id and action (confirm|dismiss) required' }, { status: 400 });
    }

    if (body.action === 'dismiss') {
      await deletePendingConfirmation(db, body.id);
      return NextResponse.json({ dismissed: true });
    }

    if (body.action === 'confirm') {
      const pending = (await listPendingConfirmations(db)).find(p => p._id === body.id);
      if (!pending) {
        return NextResponse.json({ error: 'Confirmation not found' }, { status: 404 });
      }

      const bill = await getBillById(db, pending.billId);
      if (!bill) {
        await deletePendingConfirmation(db, body.id);
        return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
      }

      await updateBill(db, bill._id, { isPaid: true });
      await createPayment(db, { billId: bill._id, billName: bill.name, amount: bill.amount });
      await deletePendingConfirmation(db, body.id);

      learnPaymentHint(db, bill).catch(err =>
        logger.error('pendingConfirmation.learnHint.failed', { billId: bill._id, error: err instanceof Error ? err.message : String(err) })
      );

      return NextResponse.json({ confirmed: true, billId: bill._id });
    }

    return NextResponse.json({ error: 'action must be confirm or dismiss' }, { status: 400 });
  } catch (err) {
    logger.error('pendingConfirmations.action.error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withRequestLogging(_GET);
export const POST = withRequestLogging(_POST);
