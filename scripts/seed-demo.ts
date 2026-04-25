/**
 * Seed script for demo mode — populates MongoDB with 90 days of realistic fake data.
 *
 * Usage:
 *   pnpm seed:demo
 *
 * Idempotent: clears existing demo accounts/transactions before inserting.
 */

import 'dotenv/config';
import { getDb } from '../src/adapters/db.js';
import type { Account, Transaction } from '../src/lib/simplefin/types.js';
import type { TransactionCategory } from '../src/lib/categorization/types.js';

// ── Account IDs ──────────────────────────────────────────────────────────────
const CHECKING = 'demo_checking_4821';
const CREDIT   = 'demo_credit_7234';
const SAVINGS  = 'demo_savings_2901';
const DEMO_IDS = [CHECKING, CREDIT, SAVINGS] as const;

// ── Date range ───────────────────────────────────────────────────────────────
const NOW   = new Date();
const START = new Date(NOW.getTime() - 90 * 24 * 60 * 60 * 1000);

// ── Helpers ──────────────────────────────────────────────────────────────────

// Deterministic [0,1) from a string seed — keeps generated data stable across runs
function s(seed: string): number {
  let h = 0x9e3779b9;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(h, 31) + seed.charCodeAt(i)) >>> 0;
  return h / 0x100000000;
}

function between(min: number, max: number, seed: string): number {
  return Math.round((min + s(seed) * (max - min)) * 100) / 100;
}

function pick<T>(arr: readonly T[], seed: string): T {
  return arr[Math.floor(s(seed) * arr.length)] as T;
}

function at(y: number, m: number, day: number): Date {
  return new Date(y, m, day, 10, 0, 0);
}

function inRange(d: Date): boolean {
  return d >= START && d <= NOW;
}

function mkTxn(
  id: string, accountId: string, posted: Date,
  amount: number, description: string,
  category: TransactionCategory,
): Transaction {
  return {
    _id: id, accountId, posted, amount, description,
    memo: null, pending: false, importedAt: NOW,
    category, categorySource: 'auto',
  };
}

// Push transaction only if its date falls within the 90-day window
function maybePush(
  out: Transaction[], date: Date,
  id: string, accountId: string, amount: number,
  description: string, category: TransactionCategory,
) {
  if (inRange(date)) out.push(mkTxn(id, accountId, date, amount, description, category));
}

// ── Accounts ─────────────────────────────────────────────────────────────────
const ACCOUNTS: Account[] = [
  {
    _id: CHECKING, orgName: 'Chase', name: 'Chase Checking ••4821',
    currency: 'USD', balance: 3847.22, availableBalance: 3847.22,
    balanceDate: NOW, accountType: 'checking', lastSyncedAt: NOW,
  },
  {
    _id: CREDIT, orgName: 'Chase', name: 'Chase Sapphire ••7234',
    currency: 'USD',
    balance: -1847.00,   // negative = outstanding credit card balance (liability)
    availableBalance: 6153.00,  // 8000 limit - 1847 used
    balanceDate: NOW, accountType: 'credit', lastSyncedAt: NOW,
  },
  {
    _id: SAVINGS, orgName: 'Chase', name: 'Chase Savings ••2901',
    currency: 'USD', balance: 8400.00, availableBalance: 8400.00,
    balanceDate: NOW, accountType: 'savings', lastSyncedAt: NOW,
  },
];

// ── Transaction generation ───────────────────────────────────────────────────
const GROCERY_STORES  = ['TRADER JOE\'S', 'WHOLE FOODS MARKET', 'VONS']                                           as const;
const LOCAL_SPOTS     = ['PASTA ROMA', 'THE NOODLE BAR', 'SUSHI NARA', 'BLUE BOTTLE CAFE', 'ROSEWOOD KITCHEN']    as const;
const GAS_STATIONS    = ['SHELL', 'CHEVRON']                                                                       as const;

function buildTransactions(): Transaction[] {
  const out: Transaction[] = [];

  // ── Monthly recurring ──────────────────────────────────────────────────────
  const cursor = new Date(START.getFullYear(), START.getMonth(), 1);
  while (cursor <= NOW) {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const mk = `${y}${String(m + 1).padStart(2, '0')}`; // e.g. "202602"

    // Payroll — 1st and 15th
    maybePush(out, at(y,m,1),  `ck_${mk}_pay1`,  CHECKING,  4200,   'DIRECT DEP EMPLOYER',               'income');
    maybePush(out, at(y,m,15), `ck_${mk}_pay15`, CHECKING,  4200,   'DIRECT DEP EMPLOYER',               'income');

    // Rent — 2nd
    maybePush(out, at(y,m,2), `ck_${mk}_rent`,  CHECKING, -1650,   'ZELLE TRANSFER - LANDLORD',          'transfer');

    // Subscriptions — 5th
    maybePush(out, at(y,m,5), `ck_${mk}_nflx`,  CHECKING,  -15.99, 'NETFLIX.COM',                        'subscriptions');
    maybePush(out, at(y,m,5), `ck_${mk}_spot`,  CHECKING,  -10.99, 'SPOTIFY USA',                        'subscriptions');
    maybePush(out, at(y,m,5), `ck_${mk}_icld`,  CHECKING,   -2.99, 'APPLE.COM/BILL',                     'subscriptions');

    // Utilities — 10th (gas) and 18th (electric)
    maybePush(out, at(y,m,10), `ck_${mk}_scg`,  CHECKING,   -67,   'SOCALGAS',                           'utilities');
    maybePush(out, at(y,m,18), `ck_${mk}_sce`,  CHECKING,   -89,   'SCE PAYMENT',                        'utilities');

    // Credit card autopay — 8th (positive on credit = payment received)
    maybePush(out, at(y,m,8),  `cc_${mk}_auto`, CREDIT,     500,   'AUTOPAY CHASE CARD',                 'transfer');

    // Savings transfer — 20th
    maybePush(out, at(y,m,20), `sv_${mk}_xfer`, SAVINGS,    300,   'TRANSFER FROM CHASE CHECKING ••4821', 'transfer');

    cursor.setMonth(cursor.getMonth() + 1);
  }

  // ── Weekly recurring ───────────────────────────────────────────────────────
  // Walk from the first Monday at or after START
  const wk = new Date(START);
  while (wk.getDay() !== 1) wk.setDate(wk.getDate() + 1);

  for (let wi = 0; wk <= NOW; wi++, wk.setDate(wk.getDate() + 7)) {
    const wis = String(wi).padStart(3, '0');
    const mon = new Date(wk);
    const tue = new Date(wk); tue.setDate(tue.getDate() + 1);
    const wed = new Date(wk); wed.setDate(wed.getDate() + 2);
    const thu = new Date(wk); thu.setDate(thu.getDate() + 3);
    const fri = new Date(wk); fri.setDate(fri.getDate() + 4);
    const sun = new Date(wk); sun.setDate(sun.getDate() + 6);

    // Grocery — Monday (every week)
    if (inRange(mon)) {
      const store = pick(GROCERY_STORES, `gm${wis}`);
      maybePush(out, mon, `ck_w${wis}_gmon`, CHECKING, -between(45, 115, `gma${wis}`), store, 'food');
    }

    // Grocery — Thursday (alternate weeks, 2-3x/week effect)
    if (wi % 2 === 0 && inRange(thu)) {
      const store = wi % 4 === 0 ? 'WHOLE FOODS MARKET' : 'VONS';
      maybePush(out, thu, `ck_w${wis}_gthu`, CHECKING, -between(40, 100, `gta${wis}`), store, 'food');
    }

    // Gas — Sunday
    if (inRange(sun)) {
      const station = pick(GAS_STATIONS, `gs${wis}`);
      maybePush(out, sun, `ck_w${wis}_gas`, CHECKING, -between(45, 65, `gsa${wis}`), station, 'transport');
    }

    // Restaurant — Tuesday (credit card)
    if (inRange(tue)) {
      const place = wi % 3 === 0 ? 'CHIPOTLE' : wi % 3 === 1 ? "MCDONALD'S" : pick(LOCAL_SPOTS, `rt${wis}`);
      maybePush(out, tue, `cc_w${wis}_rtue`, CREDIT, -between(8, 38, `rta${wis}`), place, 'food');
    }

    // Restaurant — Friday (credit card)
    if (inRange(fri)) {
      const place = pick(LOCAL_SPOTS, `rf${wis}`);
      maybePush(out, fri, `cc_w${wis}_rfri`, CREDIT, -between(18, 45, `rfa${wis}`), place, 'food');
    }

    // Amazon — every 3rd week, Wednesday (credit card)
    if (wi % 3 === 0 && inRange(wed)) {
      maybePush(out, wed, `cc_w${wis}_amzn`, CREDIT, -between(23, 156, `az${wis}`), 'AMAZON.COM*PURCHASE', 'shopping');
    }
  }

  // ── One-time transactions ──────────────────────────────────────────────────
  const ago = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

  maybePush(out, ago(45), 'ck_oneoff_venmo_out',   CHECKING, -200,   'VENMO* PAYMENT',             'transfer');
  maybePush(out, ago(30), 'ck_oneoff_venmo_in',    CHECKING,   85,   'VENMO* CASHOUT',              'transfer');
  maybePush(out, ago(80), 'cc_oneoff_amzn_return', CREDIT,    34.99, 'AMAZON.COM RETURN CREDIT',   'shopping');

  return out;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Seeding demo data…');
  const db = await getDb();

  // Wipe existing demo data so the script is idempotent
  await Promise.all(
    DEMO_IDS.map(id =>
      db.deleteMany<Transaction>('transactions', { accountId: id })
    ),
  );
  await db.deleteMany<Account>('accounts', { _id: { $in: [...DEMO_IDS] } });

  const transactions = buildTransactions();
  await db.insertMany<Account>('accounts', ACCOUNTS);
  await db.insertMany<Transaction>('transactions', transactions);

  console.log(`Done — ${ACCOUNTS.length} accounts, ${transactions.length} transactions`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
