import 'dotenv/config';
import type { StrictDB } from 'strictdb';
import { detectAutoPayments } from '../../src/handlers/autoPayDetect.js';
import { listBills } from '../../src/adapters/bills.js';

export default {
  name: 'autopay-detect',
  description: 'Run auto-pay detection against current month transactions — marks matching autopay bills as paid',
  async run(db: StrictDB) {
    const before = await listBills(db);
    const paidBefore = before.filter(b => b.isPaid).length;

    console.log(`  Bills before: ${before.length} total, ${paidBefore} paid\n`);
    await detectAutoPayments(db);

    const after = await listBills(db);
    const paidAfter = after.filter(b => b.isPaid).length;
    const newlyPaid = after.filter(b => b.isPaid && !before.find(bb => bb._id === b._id)?.isPaid);

    console.log(`\n  Bills after: ${paidAfter} paid (+${paidAfter - paidBefore} newly auto-detected)`);
    if (newlyPaid.length) {
      console.log('  Newly marked paid:');
      for (const b of newlyPaid) console.log(`    ✓ ${b.name} ($${b.amount})`);
    } else {
      console.log('  No new auto-detections (either already paid or no matching transactions found)');
    }
  },
};
