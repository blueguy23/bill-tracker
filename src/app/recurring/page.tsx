import type { BillResponse, Bill } from '@/types/bill';
import { RecurringView } from '@/components/RecurringView';
import { getDb } from '@/adapters/db';
import { listBills } from '@/adapters/bills';

function currentYYYYMM(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function isPaidThisMonth(bill: Bill): boolean {
  if (!bill.isPaid) return false;
  if (!bill.isRecurring) return bill.isPaid;
  return bill.paidMonth === currentYYYYMM();
}

function serializeBill(bill: Bill): BillResponse {
  return {
    _id: bill._id, name: bill.name, amount: bill.amount,
    dueDate: bill.dueDate instanceof Date ? bill.dueDate.toISOString() : bill.dueDate,
    category: bill.category, isPaid: isPaidThisMonth(bill), isAutoPay: bill.isAutoPay,
    isRecurring: bill.isRecurring, recurrenceInterval: bill.recurrenceInterval,
    url: bill.url, notes: bill.notes,
    paidMonth: bill.paidMonth,
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
