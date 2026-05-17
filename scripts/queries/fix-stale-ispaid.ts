import type { StrictDB } from 'strictdb';

export default {
  name: 'fix-stale-ispaid',
  description: 'Reset isPaid on recurring bills where paidMonth is not the current month',
  async run(db: StrictDB) {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const result = await db.updateMany(
      'bills',
      { isRecurring: true, paidMonth: { $ne: currentMonth } } as any,
      { $set: { isPaid: false } },
    );

    console.log(`  Current month: ${currentMonth}`);
    console.log(`  Bills reset: ${result.modifiedCount}`);
  },
};
