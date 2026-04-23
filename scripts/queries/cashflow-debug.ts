import type { StrictDB } from 'strictdb';

export default {
  name: 'cashflow-debug',
  description: 'Show income/expense totals grouped by month for last 6 months',
  async run(db: StrictDB) {
    const txns = await db.queryMany(
      'transactions',
      {},
      { sort: { posted: -1 }, limit: 5000 }
    ) as any[];

    console.log(`Total transactions fetched: ${txns.length}`);
    if (txns.length === 0) return;

    // Show first transaction's posted field type and value
    const sample = txns[0];
    console.log(`\nSample posted field: ${JSON.stringify(sample.posted)} (type: ${typeof sample.posted})`);
    console.log(`Sample amount: ${sample.amount} (type: ${typeof sample.amount})`);
    console.log(`Sample pending: ${sample.pending}`);

    // Group by month
    const months = new Map<string, { income: number; expenses: number; count: number }>();
    for (const t of txns) {
      if (t.pending) continue;
      const posted = t.posted instanceof Date ? t.posted : new Date(Number(t.posted) * 1000);
      const key = `${posted.getFullYear()}-${String(posted.getMonth() + 1).padStart(2, '0')}`;
      if (!months.has(key)) months.set(key, { income: 0, expenses: 0, count: 0 });
      const b = months.get(key)!;
      const amt = Number(t.amount);
      if (amt > 0) b.income   += amt;
      else         b.expenses += Math.abs(amt);
      b.count++;
    }

    console.log('\nMonth          Income      Expenses    Net         Txns');
    console.log('─'.repeat(65));
    for (const [month, b] of [...months.entries()].sort()) {
      const net = b.income - b.expenses;
      console.log(
        `${month}       ` +
        `$${b.income.toFixed(2).padStart(10)}  ` +
        `$${b.expenses.toFixed(2).padStart(10)}  ` +
        `$${net.toFixed(2).padStart(10)}  ` +
        `${b.count}`
      );
    }
  },
};
