/**
 * Dev query: List all bills
 *
 * Usage: pnpm db:query list-bills
 */

import type { StrictDB } from 'strictdb';

export default {
  name: 'list-bills',
  description: 'List all bills in the database',

  async run(db: StrictDB): Promise<void> {
    const bills = await db.queryMany('bills', {}, { sort: { dueDate: 1 } });

    if (bills.length === 0) {
      console.log('  No bills found.');
      return;
    }

    console.log(`  Found ${bills.length} bill(s):\n`);
    for (const bill of bills) {
      const b = bill as Record<string, unknown>;
      console.log(`  [${String(b._id).slice(0, 8)}...] ${b.name} — $${b.amount} | ${b.category} | paid: ${b.isPaid} | autopay: ${b.isAutoPay}`);
    }
  },
};
