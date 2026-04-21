import type { StrictDB } from 'strictdb';

const TRANSFER_DESCRIPTION_RE = /^(deposit from |transfer from |transfer to |online transfer|account transfer)/i;

export default {
  name: 'cashflow-filtered',
  description: 'Cash flow totals after excluding credit-card payments and transfers',
  async run(db: StrictDB) {
    const accounts = await db.queryMany('accounts', {}, { limit: 50 }) as any[];
    const creditIds = new Set(accounts.filter((a: any) => a.accountType === 'credit').map((a: any) => String(a._id)));

    console.log('Credit accounts (excluded from income):');
    for (const a of accounts.filter((a: any) => a.accountType === 'credit')) {
      console.log(`  ${a.name} (${a._id})`);
    }

    const txns = await db.queryMany(
      'transactions',
      {},
      { sort: { posted: -1 }, limit: 5000 }
    ) as any[];

    let skipped = 0;
    const months = new Map<string, { income: number; expenses: number; count: number }>();

    for (const t of txns) {
      if (t.pending) continue;
      const acctId = String(t.accountId ?? '');
      const amt    = Number(t.amount);
      const desc   = String(t.description ?? '');

      // Skip credit account positives
      if (creditIds.has(acctId) && amt > 0) { skipped++; continue; }
      // Skip transfer descriptions
      if (TRANSFER_DESCRIPTION_RE.test(desc)) { skipped++; continue; }

      const posted = t.posted instanceof Date ? t.posted : new Date(Number(t.posted) * 1000);
      const key = `${posted.getFullYear()}-${String(posted.getMonth() + 1).padStart(2, '0')}`;
      if (!months.has(key)) months.set(key, { income: 0, expenses: 0, count: 0 });
      const b = months.get(key)!;
      if (amt > 0) b.income   += amt;
      else         b.expenses += Math.abs(amt);
      b.count++;
    }

    console.log(`\nSkipped ${skipped} transfer/credit-payment transactions\n`);
    console.log('Month          Income      Expenses    Net         Txns');
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
