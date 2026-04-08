import type { StrictDB } from 'strictdb';

export default {
  name: 'debug-credit',
  description: 'Show credit accounts and their transaction counts in the DB',
  async run(db: StrictDB) {
    // All accounts with their types
    const accounts = await db.queryMany('accounts', {}, { sort: { orgName: 1 }, limit: 50 });
    console.log(`\nAll accounts (${accounts.length} total):`);
    for (const a of accounts as any[]) {
      console.log(`  [${String(a.accountType).padEnd(10)}] ${String(a.orgName).padEnd(25)} | ${a.name} | id: ${a._id}`);
    }

    // Credit accounts specifically
    const creditAccounts = accounts.filter((a: any) => a.accountType === 'credit');
    console.log(`\nCredit accounts: ${creditAccounts.length}`);

    if (creditAccounts.length === 0) {
      console.log('  !! No credit accounts found — this is why Credit Health shows nothing');
      return;
    }

    // For each credit account, count its transactions
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    for (const acct of creditAccounts as any[]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allTxns = await db.queryMany('transactions', { accountId: acct._id } as any, { sort: { posted: -1 } as any, limit: 5 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recentTxns = await db.queryMany(
        'transactions',
        { accountId: acct._id, posted: { $gte: thirtyDaysAgo } } as any,
        { sort: { posted: -1 } as any, limit: 5 },
      );
      console.log(`\n  ${acct.orgName} — ${acct.name}`);
      console.log(`    Total txns: ${allTxns.length} (showing up to 5) | Last 30 days: ${recentTxns.length}`);
      for (const t of allTxns as any[]) {
        const date = t.posted ? new Date(t.posted).toISOString().slice(0, 10) : 'NO DATE';
        console.log(`    ${date} | ${String(t.description).padEnd(40)} | $${t.amount}`);
      }
    }
  },
};
