import type { BillResponse, Bill } from '@/types/bill';
import { RecurringView } from '@/components/RecurringView';
import { getDb } from '@/adapters/db';
import { listBills } from '@/adapters/bills';

function serializeBill(bill: Bill): BillResponse {
  return {
    _id: bill._id, name: bill.name, amount: bill.amount,
    dueDate: bill.dueDate instanceof Date ? bill.dueDate.toISOString() : bill.dueDate,
    category: bill.category, isPaid: bill.isPaid, isAutoPay: bill.isAutoPay,
    isRecurring: bill.isRecurring, recurrenceInterval: bill.recurrenceInterval,
    url: bill.url, notes: bill.notes,
    createdAt: bill.createdAt instanceof Date ? bill.createdAt.toISOString() : String(bill.createdAt),
    updatedAt: bill.updatedAt instanceof Date ? bill.updatedAt.toISOString() : String(bill.updatedAt),
  };
}

export default async function RecurringPage() {
  const db = await getDb();
  const rawBills = await listBills(db);
  const bills = rawBills.filter((b) => b.isRecurring).map(serializeBill);

  const totalMonthly = bills.reduce((s, b) => s + b.amount, 0);
  const totalPaid    = bills.filter(b => b.isPaid).reduce((s, b) => s + b.amount, 0);
  const autoPayCount = bills.filter(b => b.isAutoPay).length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <RecurringView bills={bills} totalMonthly={totalMonthly} totalPaid={totalPaid} autoPayCount={autoPayCount} />
    </div>
  );
}
