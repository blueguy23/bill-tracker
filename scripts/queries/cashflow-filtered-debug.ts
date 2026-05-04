import 'dotenv/config';
import type { StrictDB } from 'strictdb';
import type { Account, Transaction } from '../../src/lib/simplefin/types.js';
import { classifyTransfer, buildTransferRe } from '../../src/lib/classifyTransfer.js';

export default {
  name: 'cashflow-filtered-debug',
  description: 'Show what getCashFlowHistory actually counts as income/expenses after transfer filtering',
  async run(db: StrictDB) {
    const accounts = await db.queryMany<Account>('accounts', {}, { limit: 50 });
    const creditIds = new Set(accounts.filter(a => a.accountType === 'credit').map(a => a._id));

    console.log('Account types:');
    for (const a of accounts) {
      console.log(`  ${String(a._id).slice(-8)} | ${String(a.name).padEnd(30)} | ${a.accountType}`);
    }

    const re = buildTransferRe();
    console.log(`\nTransfer regex: ${re}\n`);

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const txns = await db.queryMany<Transaction>(
      'transactions',
      { posted: { $gte: start, $lte: end }, pending: false },
      { sort: { posted: -1 }, limit: 5000 },
    );

    console.log(`Transactions in 3-month window: ${txns.length}`);

    // Tally filter stats
    let storedTrueCount = 0, creditPosCount = 0, regexCount = 0, passedCount = 0;

    const income: Transaction[] = [];
    const incomeTransfers: Transaction[] = [];

    for (const t of txns) {
      const isCreditPos = creditIds.has(t.accountId) && t.amount > 0;
      const isRegex = re.test(t.description);
      const storedTrue = t.isTransfer === true;

      // Mirror getCashFlowHistory logic exactly
      const isTransfer = t.isTransfer ?? classifyTransfer(t, creditIds);

      if (isTransfer) {
        if (storedTrue) storedTrueCount++;
        else if (isCreditPos) creditPosCount++;
        else if (isRegex) regexCount++;

        if (t.amount > 0) incomeTransfers.push(t);
      } else {
        passedCount++;
        if (t.amount > 0) income.push(t);
      }
    }

    console.log(`\nFilter breakdown:`);
    console.log(`  Stored isTransfer:true  : ${storedTrueCount}`);
    console.log(`  Credit account + positive: ${creditPosCount}`);
    console.log(`  Matched transfer regex  : ${regexCount}`);
    console.log(`  Passed through (counted): ${passedCount}`);

    console.log(`\n── Positive transactions COUNTED AS INCOME (${income.length}) ──`);
    for (const t of income) {
      const d = new Date(t.posted).toISOString().slice(0, 10);
      const acct = accounts.find(a => a._id === t.accountId);
      console.log(`  ${d} | ${String(acct?.name ?? t.accountId).padEnd(28)} | ${String(t.description).padEnd(45)} | $${t.amount} | stored:${t.isTransfer}`);
    }

    console.log(`\n── Positive transactions FILTERED OUT as transfer (${incomeTransfers.length}) ──`);
    for (const t of incomeTransfers) {
      const d = new Date(t.posted).toISOString().slice(0, 10);
      const acct = accounts.find(a => a._id === t.accountId);
      const reason = t.isTransfer === true ? 'stored:true' :
        (creditIds.has(t.accountId) && t.amount > 0) ? 'credit+pos' : 'regex';
      console.log(`  ${d} | ${String(acct?.name ?? t.accountId).padEnd(28)} | ${String(t.description).padEnd(45)} | $${t.amount} | reason:${reason}`);
    }
  },
};
