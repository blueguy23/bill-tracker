import type { BillResponse, Bill } from '@/types/bill';
import { BillsView } from '@/components/BillsView';
import { RecurringStats } from '@/components/RecurringStats';
import { getDb } from '@/adapters/db';
import { listBills } from '@/adapters/bills';

function serializeBill(bill: Bill): BillResponse {
  return {
    _id: bill._id,
    name: bill.name,
    amount: bill.amount,
    dueDate: bill.dueDate instanceof Date ? bill.dueDate.toISOString() : bill.dueDate,
    category: bill.category,
    isPaid: bill.isPaid,
    isAutoPay: bill.isAutoPay,
    isRecurring: bill.isRecurring,
    recurrenceInterval: bill.recurrenceInterval,
    url: bill.url,
    notes: bill.notes,
    createdAt: bill.createdAt instanceof Date ? bill.createdAt.toISOString() : String(bill.createdAt),
    updatedAt: bill.updatedAt instanceof Date ? bill.updatedAt.toISOString() : String(bill.updatedAt),
  };
}

export default async function RecurringPage() {
  const db = await getDb();
  const rawBills = await listBills(db);
  const bills = rawBills.filter((b) => b.isRecurring).map(serializeBill);

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-white">Recurring Bills</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {bills.length === 0 ? 'No recurring bills' : `${bills.length} recurring bill${bills.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>
      <RecurringStats bills={bills} />
      <BillsView initialBills={bills} />
    </div>
  );
}
