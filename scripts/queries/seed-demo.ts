import { randomUUID } from 'crypto';
import type { StrictDB } from 'strictdb';
import type { Account, Transaction, SyncLog } from '../../src/lib/simplefin/types.js';
import type { Bill } from '../../src/types/bill.js';
import type { Budget } from '../../src/types/budget.js';
import type { PaymentRecord } from '../../src/types/payment.js';
import type { AccountMeta } from '../../src/types/creditAdvisor.js';

export default {
  name: 'seed-demo',
  description: 'Wipe DB and seed with realistic demo data. Requires --confirm flag.',

  async run(db: StrictDB, args: string[]): Promise<void> {
    if (!args.includes('--confirm')) {
      console.log('\n  ⚠️  WARNING: This will DELETE all existing data and replace it with demo data.');
      console.log('  Run with --confirm to proceed:\n');
      console.log('    pnpm db:query seed-demo --confirm\n');
      return;
    }

    console.log('  Wiping existing data…');
    await Promise.all([
      wipeCollection(db, 'accounts'),
      wipeCollection(db, 'transactions'),
      wipeCollection(db, 'bills'),
      wipeCollection(db, 'budgets'),
      wipeCollection(db, 'payments'),
      wipeCollection(db, 'syncLog'),
      wipeCollection(db, 'accountMeta'),
      wipeCollection(db, 'notificationLogs'),
    ]);

    // ── Accounts ──────────────────────────────────────────────────────────────
    const CHECKING_ID = 'demo-acc-checking';
    const SAVINGS_ID  = 'demo-acc-savings';
    const CREDIT_ID   = 'demo-acc-credit';
    const now = new Date();

    const accounts: Account[] = [
      {
        _id: CHECKING_ID,
        orgName: 'Chase',
        name: 'Total Checking',
        currency: 'USD',
        balance: 3847.23,
        availableBalance: 3847.23,
        balanceDate: now,
        accountType: 'checking',
        lastSyncedAt: now,
      },
      {
        _id: SAVINGS_ID,
        orgName: 'Chase',
        name: 'High Yield Savings',
        currency: 'USD',
        balance: 12450.00,
        availableBalance: 12450.00,
        balanceDate: now,
        accountType: 'savings',
        lastSyncedAt: now,
      },
      {
        _id: CREDIT_ID,
        orgName: 'Citi',
        name: 'Double Cash Card',
        currency: 'USD',
        balance: 1247.83,
        availableBalance: null,
        balanceDate: now,
        accountType: 'credit',
        lastSyncedAt: now,
      },
    ];

    for (const acc of accounts) {
      await db.insertOne<Account>('accounts', acc);
    }
    console.log(`  ✓ ${accounts.length} accounts`);

    // ── Transactions ──────────────────────────────────────────────────────────
    const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

    const txnTemplates: Array<{
      accountId: string; daysBack: number; amount: number;
      description: string; category: Transaction['category']; merchantName?: string;
    }> = [
      // ── Month 0 (current) ──────────────────────────────────────────────────
      { accountId: CHECKING_ID, daysBack: 2,  amount: 3750.00,  description: 'DIRECT DEPOSIT EMPLOYER PAYROLL',       category: 'income' },
      { accountId: CHECKING_ID, daysBack: 3,  amount: -15.99,   description: 'NETFLIX.COM',                           category: 'subscriptions', merchantName: 'Netflix' },
      { accountId: CHECKING_ID, daysBack: 4,  amount: -65.00,   description: 'AT&T PAYMENT',                          category: 'utilities',     merchantName: 'AT&T' },
      { accountId: CHECKING_ID, daysBack: 4,  amount: -24.99,   description: 'PLANET FITNESS MONTHLY',                category: 'subscriptions', merchantName: 'Planet Fitness' },
      { accountId: CREDIT_ID,   daysBack: 5,  amount: -87.45,   description: 'WHOLE FOODS MARKET',                    category: 'food',          merchantName: 'Whole Foods' },
      { accountId: CREDIT_ID,   daysBack: 6,  amount: -14.32,   description: 'CHIPOTLE MEXICAN GRILL',                category: 'food',          merchantName: 'Chipotle' },
      { accountId: CREDIT_ID,   daysBack: 7,  amount: -52.80,   description: 'SHELL OIL GAS STATION',                 category: 'transport',     merchantName: 'Shell' },
      { accountId: CREDIT_ID,   daysBack: 8,  amount: -34.99,   description: 'AMAZON.COM',                            category: 'shopping',      merchantName: 'Amazon' },
      { accountId: CREDIT_ID,   daysBack: 9,  amount: -6.75,    description: 'STARBUCKS COFFEE',                      category: 'food',          merchantName: 'Starbucks' },
      { accountId: CREDIT_ID,   daysBack: 10, amount: -43.21,   description: 'TARGET STORE',                          category: 'shopping',      merchantName: 'Target' },
      { accountId: CREDIT_ID,   daysBack: 11, amount: -18.50,   description: 'CVS PHARMACY',                          category: 'health',        merchantName: 'CVS' },
      { accountId: CHECKING_ID, daysBack: 12, amount: -89.99,   description: 'COMCAST CABLE',                         category: 'utilities',     merchantName: 'Comcast' },
      { accountId: CHECKING_ID, daysBack: 12, amount: -9.99,    description: 'SPOTIFY USA',                           category: 'subscriptions', merchantName: 'Spotify' },
      { accountId: CREDIT_ID,   daysBack: 13, amount: -63.18,   description: 'TRADER JOE\'S',                         category: 'food',          merchantName: "Trader Joe's" },
      { accountId: CREDIT_ID,   daysBack: 14, amount: -22.50,   description: 'LYFT RIDE',                             category: 'transport',     merchantName: 'Lyft' },
      { accountId: CREDIT_ID,   daysBack: 15, amount: -31.45,   description: 'UBER EATS',                             category: 'food',          merchantName: 'Uber Eats' },
      { accountId: CREDIT_ID,   daysBack: 16, amount: -9.99,    description: 'APPLE.COM/BILL',                        category: 'subscriptions', merchantName: 'Apple' },
      { accountId: CREDIT_ID,   daysBack: 17, amount: -127.83,  description: 'COSTCO WHSE',                           category: 'shopping',      merchantName: 'Costco' },
      // ── Month 1 ────────────────────────────────────────────────────────────
      { accountId: CHECKING_ID, daysBack: 33, amount: 3750.00,  description: 'DIRECT DEPOSIT EMPLOYER PAYROLL',       category: 'income' },
      { accountId: CHECKING_ID, daysBack: 34, amount: -1850.00, description: 'TRANSFER TO LANDLORD RENT',             category: 'transfer' },
      { accountId: CHECKING_ID, daysBack: 35, amount: -15.99,   description: 'NETFLIX.COM',                           category: 'subscriptions', merchantName: 'Netflix' },
      { accountId: CHECKING_ID, daysBack: 35, amount: -65.00,   description: 'AT&T PAYMENT',                          category: 'utilities',     merchantName: 'AT&T' },
      { accountId: CHECKING_ID, daysBack: 36, amount: -127.43,  description: 'PG&E ELECTRIC',                         category: 'utilities',     merchantName: 'PG&E' },
      { accountId: CHECKING_ID, daysBack: 36, amount: -142.00,  description: 'GEICO AUTO INSURANCE',                  category: 'other',         merchantName: 'Geico' },
      { accountId: CHECKING_ID, daysBack: 37, amount: -9.99,    description: 'SPOTIFY USA',                           category: 'subscriptions', merchantName: 'Spotify' },
      { accountId: CHECKING_ID, daysBack: 37, amount: -24.99,   description: 'PLANET FITNESS MONTHLY',                category: 'subscriptions', merchantName: 'Planet Fitness' },
      { accountId: CHECKING_ID, daysBack: 38, amount: -89.99,   description: 'COMCAST CABLE',                         category: 'utilities',     merchantName: 'Comcast' },
      { accountId: CREDIT_ID,   daysBack: 39, amount: -92.34,   description: 'WHOLE FOODS MARKET',                    category: 'food',          merchantName: 'Whole Foods' },
      { accountId: CREDIT_ID,   daysBack: 40, amount: -8.25,    description: 'STARBUCKS COFFEE',                      category: 'food',          merchantName: 'Starbucks' },
      { accountId: CREDIT_ID,   daysBack: 41, amount: -13.87,   description: 'CHIPOTLE MEXICAN GRILL',                category: 'food',          merchantName: 'Chipotle' },
      { accountId: CREDIT_ID,   daysBack: 42, amount: -48.50,   description: 'CHEVRON GAS STATION',                   category: 'transport',     merchantName: 'Chevron' },
      { accountId: CREDIT_ID,   daysBack: 43, amount: -67.23,   description: 'AMAZON.COM',                            category: 'shopping',      merchantName: 'Amazon' },
      { accountId: CREDIT_ID,   daysBack: 44, amount: -52.19,   description: 'TARGET STORE',                          category: 'shopping',      merchantName: 'Target' },
      { accountId: CREDIT_ID,   daysBack: 45, amount: -38.00,   description: 'REGAL CINEMAS',                         category: 'entertainment', merchantName: 'Regal Cinemas' },
      { accountId: CREDIT_ID,   daysBack: 46, amount: -24.11,   description: 'CVS PHARMACY',                          category: 'health',        merchantName: 'CVS' },
      { accountId: CREDIT_ID,   daysBack: 47, amount: -71.52,   description: 'TRADER JOE\'S',                         category: 'food',          merchantName: "Trader Joe's" },
      { accountId: CREDIT_ID,   daysBack: 48, amount: -82.45,   description: 'THE ITALIAN PLACE RESTAURANT',          category: 'food' },
      { accountId: CREDIT_ID,   daysBack: 49, amount: -18.75,   description: 'LYFT RIDE',                             category: 'transport',     merchantName: 'Lyft' },
      { accountId: CREDIT_ID,   daysBack: 50, amount: -4.99,    description: 'GOOGLE PLAY',                           category: 'subscriptions', merchantName: 'Google' },
      { accountId: CREDIT_ID,   daysBack: 51, amount: -145.00,  description: 'NORDSTROM RACK',                        category: 'shopping',      merchantName: 'Nordstrom Rack' },
      { accountId: CREDIT_ID,   daysBack: 55, amount: -28.40,   description: 'SHAKE SHACK',                           category: 'food',          merchantName: 'Shake Shack' },
      // ── Month 2 ────────────────────────────────────────────────────────────
      { accountId: CHECKING_ID, daysBack: 63, amount: 3750.00,  description: 'DIRECT DEPOSIT EMPLOYER PAYROLL',       category: 'income' },
      { accountId: CHECKING_ID, daysBack: 64, amount: -1850.00, description: 'TRANSFER TO LANDLORD RENT',             category: 'transfer' },
      { accountId: CHECKING_ID, daysBack: 65, amount: -15.99,   description: 'NETFLIX.COM',                           category: 'subscriptions', merchantName: 'Netflix' },
      { accountId: CHECKING_ID, daysBack: 65, amount: -65.00,   description: 'AT&T PAYMENT',                          category: 'utilities',     merchantName: 'AT&T' },
      { accountId: CHECKING_ID, daysBack: 66, amount: -134.72,  description: 'PG&E ELECTRIC',                         category: 'utilities',     merchantName: 'PG&E' },
      { accountId: CHECKING_ID, daysBack: 66, amount: -142.00,  description: 'GEICO AUTO INSURANCE',                  category: 'other',         merchantName: 'Geico' },
      { accountId: CHECKING_ID, daysBack: 67, amount: -9.99,    description: 'SPOTIFY USA',                           category: 'subscriptions', merchantName: 'Spotify' },
      { accountId: CHECKING_ID, daysBack: 67, amount: -24.99,   description: 'PLANET FITNESS MONTHLY',                category: 'subscriptions', merchantName: 'Planet Fitness' },
      { accountId: CHECKING_ID, daysBack: 68, amount: -89.99,   description: 'COMCAST CABLE',                         category: 'utilities',     merchantName: 'Comcast' },
      { accountId: CREDIT_ID,   daysBack: 69, amount: -78.91,   description: 'WHOLE FOODS MARKET',                    category: 'food',          merchantName: 'Whole Foods' },
      { accountId: CREDIT_ID,   daysBack: 70, amount: -7.45,    description: 'STARBUCKS COFFEE',                      category: 'food',          merchantName: 'Starbucks' },
      { accountId: CREDIT_ID,   daysBack: 71, amount: -12.99,   description: 'CHIPOTLE MEXICAN GRILL',                category: 'food',          merchantName: 'Chipotle' },
      { accountId: CREDIT_ID,   daysBack: 72, amount: -55.20,   description: 'SHELL OIL GAS STATION',                 category: 'transport',     merchantName: 'Shell' },
      { accountId: CREDIT_ID,   daysBack: 73, amount: -29.99,   description: 'AMAZON.COM',                            category: 'shopping',      merchantName: 'Amazon' },
      { accountId: CREDIT_ID,   daysBack: 74, amount: -35.88,   description: 'TARGET STORE',                          category: 'shopping',      merchantName: 'Target' },
      { accountId: CREDIT_ID,   daysBack: 75, amount: -95.00,   description: 'AMC THEATRES',                          category: 'entertainment', merchantName: 'AMC' },
      { accountId: CREDIT_ID,   daysBack: 76, amount: -32.50,   description: 'WALGREENS PHARMACY',                    category: 'health',        merchantName: 'Walgreens' },
      { accountId: CREDIT_ID,   daysBack: 77, amount: -68.34,   description: 'TRADER JOE\'S',                         category: 'food',          merchantName: "Trader Joe's" },
      { accountId: CREDIT_ID,   daysBack: 78, amount: -104.20,  description: 'COSTCO WHSE',                           category: 'shopping',      merchantName: 'Costco' },
      { accountId: CREDIT_ID,   daysBack: 79, amount: -19.99,   description: 'APPLE.COM/BILL',                        category: 'subscriptions', merchantName: 'Apple' },
      { accountId: CREDIT_ID,   daysBack: 80, amount: -16.50,   description: 'LYFT RIDE',                             category: 'transport',     merchantName: 'Lyft' },
      { accountId: CREDIT_ID,   daysBack: 82, amount: -44.67,   description: 'OLIVE GARDEN RESTAURANT',               category: 'food' },
      { accountId: CREDIT_ID,   daysBack: 85, amount: -199.99,  description: 'BEST BUY',                              category: 'shopping',      merchantName: 'Best Buy' },
    ];

    const transactions: Transaction[] = txnTemplates.map((t) => ({
      _id: randomUUID(),
      accountId: t.accountId,
      posted: daysAgo(t.daysBack),
      amount: t.amount,
      description: t.description,
      memo: null,
      pending: false,
      importedAt: daysAgo(t.daysBack - 1),
      category: t.category,
      categorySource: 'trove' as const,
      merchantName: t.merchantName ?? null,
      merchantDomain: null,
    }));

    for (const txn of transactions) {
      await db.insertOne<Transaction>('transactions', txn);
    }
    console.log(`  ✓ ${transactions.length} transactions`);

    // ── Bills ─────────────────────────────────────────────────────────────────
    const currentYYYYMM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const billDefs = [
      { name: 'Netflix',         amount: 15.99,   dueDay: 15, category: 'subscriptions', isAutoPay: true,  isPaid: true },
      { name: 'Comcast Internet',amount: 89.99,   dueDay: 1,  category: 'utilities',     isAutoPay: true,  isPaid: true },
      { name: 'AT&T Phone',      amount: 65.00,   dueDay: 5,  category: 'utilities',     isAutoPay: true,  isPaid: true },
      { name: 'Rent',            amount: 1850.00, dueDay: 1,  category: 'rent',          isAutoPay: false, isPaid: true },
      { name: 'PG&E Electric',   amount: 127.43,  dueDay: 20, category: 'utilities',     isAutoPay: false, isPaid: false },
      { name: 'Geico Insurance', amount: 142.00,  dueDay: 10, category: 'insurance',     isAutoPay: true,  isPaid: true },
      { name: 'Spotify',         amount: 9.99,    dueDay: 8,  category: 'subscriptions', isAutoPay: true,  isPaid: true },
      { name: 'Planet Fitness',  amount: 24.99,   dueDay: 1,  category: 'subscriptions', isAutoPay: true,  isPaid: true },
    ] as const;

    const bills: Bill[] = billDefs.map((b) => ({
      _id: randomUUID(),
      name: b.name,
      amount: b.amount,
      dueDate: b.dueDay,
      category: b.category as Bill['category'],
      isPaid: b.isPaid,
      isAutoPay: b.isAutoPay,
      isRecurring: true,
      recurrenceInterval: 'monthly',
      paidMonth: b.isPaid ? currentYYYYMM : undefined,
      createdAt: daysAgo(120),
      updatedAt: now,
    }));

    for (const bill of bills) {
      await db.insertOne<Bill>('bills', bill);
    }
    console.log(`  ✓ ${bills.length} bills`);

    // ── Payment History ───────────────────────────────────────────────────────
    const paidBills = bills.filter((b) => b.isPaid);
    const payments: PaymentRecord[] = [];
    for (const bill of paidBills) {
      // 3 months of history
      for (let month = 1; month <= 3; month++) {
        payments.push({
          _id: randomUUID(),
          billId: bill._id,
          billName: bill.name,
          amount: bill.amount,
          paidAt: daysAgo(month * 30),
        });
      }
    }
    for (const p of payments) {
      await db.insertOne<PaymentRecord>('payments', p);
    }
    console.log(`  ✓ ${payments.length} payment records`);

    // ── Budgets ───────────────────────────────────────────────────────────────
    // Budgets use BillCategory: utilities, subscriptions, insurance, rent, loans, other
    const budgetDefs: Array<{ _id: string; category: string; monthlyAmount: number }> = [
      { _id: 'utilities',     category: 'utilities',     monthlyAmount: 400 },
      { _id: 'subscriptions', category: 'subscriptions', monthlyAmount: 120 },
      { _id: 'insurance',     category: 'insurance',     monthlyAmount: 150 },
      { _id: 'rent',          category: 'rent',          monthlyAmount: 2000 },
      { _id: 'other',         category: 'other',         monthlyAmount: 250 },
    ];
    for (const b of budgetDefs) {
      await db.insertOne<Budget>('budgets', {
        ...b,
        rolloverBalance: 0,
        updatedAt: now,
      } as Budget);
    }
    console.log(`  ✓ ${budgetDefs.length} budgets`);

    // ── Credit Account Metadata ───────────────────────────────────────────────
    await db.insertOne<AccountMeta>('accountMeta', {
      _id: CREDIT_ID,
      statementClosingDay: 22,
      targetUtilization: 0.05,
      manualCreditLimit: 8000,
    });
    console.log(`  ✓ credit account meta (limit $8,000, closes day 22)`);

    // ── SyncLog ───────────────────────────────────────────────────────────────
    const todayStr = now.toISOString().slice(0, 10);
    await db.insertOne<SyncLog>('syncLog', {
      _id: randomUUID(),
      date: todayStr,
      requestCount: 2,
      lastSyncAt: daysAgo(0),
      lastSyncType: 'daily',
      historicalImportDone: true,
    });
    console.log(`  ✓ sync log (synced today)`);

    console.log('\n  ✅ Demo seed complete!');
    console.log(`     ${accounts.length} accounts · ${transactions.length} transactions · ${bills.length} bills`);
    console.log('     Run: pnpm dev\n');
  },
};

async function wipeCollection(db: StrictDB, name: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docs = await (db as any).queryMany(name, {}, { limit: 100_000 });
  for (const doc of docs) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).deleteOne(name, { _id: doc._id });
  }
}
