import type { StrictDB } from 'strictdb';

export default {
  name: 'debug-bills',
  description: 'Show raw bill fields including isPaid, isAutoPay, paidMonth',
  async run(db: StrictDB) {
    const bills = await db.queryMany('bills', {}, { limit: 100 }) as Record<string, unknown>[];
    for (const b of bills) {
      console.log(JSON.stringify({
        name: b.name,
        isPaid: b.isPaid,
        isAutoPay: b.isAutoPay,
        isRecurring: b.isRecurring,
        paidMonth: b.paidMonth ?? '(not set)',
      }));
    }
  },
};
