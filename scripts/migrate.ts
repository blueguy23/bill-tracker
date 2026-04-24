#!/usr/bin/env npx tsx
/**
 * migrate.ts — MongoDB index migrations
 *
 * MongoDB is schemaless, so "migrations" here mean ensuring the correct
 * indexes exist for query performance and data integrity.
 *
 * Each migration has an `up` (apply) and `down` (reverse) function.
 * Migrations are idempotent — safe to run multiple times.
 *
 * Usage:
 *   npx tsx scripts/migrate.ts up      # apply all pending migrations
 *   npx tsx scripts/migrate.ts down    # reverse the last applied migration
 *   npx tsx scripts/migrate.ts status  # list applied/pending migrations
 *
 * Migration state is tracked in the `_migrations` collection.
 */

import 'dotenv/config';
import { MongoClient, type Db } from 'mongodb';

// ---------------------------------------------------------------------------
// Migration definitions
// ---------------------------------------------------------------------------

interface Migration {
  id: string;          // unique, sortable (e.g. "0001_...")
  description: string;
  up: (db: Db) => Promise<void>;
  down: (db: Db) => Promise<void>;
}

const migrations: Migration[] = [
  {
    id: '0001_transactions_indexes',
    description: 'Indexes on transactions for common query patterns',
    async up(db) {
      const col = db.collection('transactions');
      await col.createIndex({ accountId: 1, posted: -1 }, { name: 'idx_txn_account_posted' });
      await col.createIndex({ posted: -1 }, { name: 'idx_txn_posted' });
      await col.createIndex({ category: 1, posted: -1 }, { name: 'idx_txn_category_posted' });
      await col.createIndex({ description: 'text', merchantName: 'text' }, { name: 'idx_txn_text_search' });
      console.log('  ✓ transactions indexes');
    },
    async down(db) {
      const col = db.collection('transactions');
      await col.dropIndex('idx_txn_account_posted').catch(() => {});
      await col.dropIndex('idx_txn_posted').catch(() => {});
      await col.dropIndex('idx_txn_category_posted').catch(() => {});
      await col.dropIndex('idx_txn_text_search').catch(() => {});
      console.log('  ✓ dropped transactions indexes');
    },
  },
  {
    id: '0002_bills_indexes',
    description: 'Indexes on bills collection',
    async up(db) {
      const col = db.collection('bills');
      await col.createIndex({ dueDate: 1, isPaid: 1 }, { name: 'idx_bills_due_paid' });
      await col.createIndex({ category: 1 }, { name: 'idx_bills_category' });
      console.log('  ✓ bills indexes');
    },
    async down(db) {
      const col = db.collection('bills');
      await col.dropIndex('idx_bills_due_paid').catch(() => {});
      await col.dropIndex('idx_bills_category').catch(() => {});
      console.log('  ✓ dropped bills indexes');
    },
  },
  {
    id: '0003_synclog_indexes',
    description: 'Index on syncLog.date for daily log lookups',
    async up(db) {
      const col = db.collection('syncLog');
      await col.createIndex({ date: -1 }, { name: 'idx_synclog_date', unique: true });
      console.log('  ✓ syncLog index');
    },
    async down(db) {
      const col = db.collection('syncLog');
      await col.dropIndex('idx_synclog_date').catch(() => {});
      console.log('  ✓ dropped syncLog index');
    },
  },
  {
    id: '0004_accounts_indexes',
    description: 'Index on accounts for org lookups',
    async up(db) {
      const col = db.collection('accounts');
      await col.createIndex({ orgName: 1, accountType: 1 }, { name: 'idx_accounts_org_type' });
      console.log('  ✓ accounts indexes');
    },
    async down(db) {
      const col = db.collection('accounts');
      await col.dropIndex('idx_accounts_org_type').catch(() => {});
      console.log('  ✓ dropped accounts indexes');
    },
  },
];

// ---------------------------------------------------------------------------
// Migration runner
// ---------------------------------------------------------------------------

const MIGRATIONS_COLLECTION = '_migrations';

interface MigrationRecord {
  _id: string;
  appliedAt: Date;
}

async function getApplied(db: Db): Promise<Set<string>> {
  const docs = await db.collection<MigrationRecord>(MIGRATIONS_COLLECTION).find({}).toArray();
  return new Set(docs.map((d) => d._id));
}

async function markApplied(db: Db, id: string): Promise<void> {
  await db.collection<MigrationRecord>(MIGRATIONS_COLLECTION).updateOne(
    { _id: id },
    { $set: { _id: id, appliedAt: new Date() } },
    { upsert: true },
  );
}

async function markReverted(db: Db, id: string): Promise<void> {
  await db.collection<MigrationRecord>(MIGRATIONS_COLLECTION).deleteOne({ _id: id });
}

async function runUp(db: Db): Promise<void> {
  const applied = await getApplied(db);
  const pending = migrations.filter((m) => !applied.has(m.id));

  if (pending.length === 0) {
    console.log('\n  All migrations already applied.\n');
    return;
  }

  console.log(`\n  Applying ${pending.length} migration(s)...\n`);
  for (const migration of pending) {
    console.log(`  → ${migration.id}: ${migration.description}`);
    await migration.up(db);
    await markApplied(db, migration.id);
    console.log(`    Applied.\n`);
  }
  console.log('  All migrations applied.\n');
}

async function runDown(db: Db): Promise<void> {
  const applied = await getApplied(db);
  const toRevert = migrations
    .filter((m) => applied.has(m.id))
    .at(-1); // only the last one

  if (!toRevert) {
    console.log('\n  No migrations to revert.\n');
    return;
  }

  console.log(`\n  Reverting: ${toRevert.id}\n`);
  await toRevert.down(db);
  await markReverted(db, toRevert.id);
  console.log('  Reverted.\n');
}

async function runStatus(db: Db): Promise<void> {
  const applied = await getApplied(db);
  console.log('\n  Migration status:\n');
  for (const m of migrations) {
    const status = applied.has(m.id) ? '✅ applied' : '⏳ pending';
    console.log(`  ${status}  ${m.id}  — ${m.description}`);
  }
  console.log('');
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const command = process.argv[2] ?? 'status';
  const uri = process.env.MONGODB_URI ?? process.env.STRICTDB_URI;
  if (!uri) {
    console.error('\n  Error: MONGODB_URI environment variable is not set.\n');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const dbName = new URL(uri).pathname.replace(/^\//, '') || 'bill-tracker';
  const db = client.db(dbName);

  try {
    switch (command) {
      case 'up':
        await runUp(db);
        break;
      case 'down':
        await runDown(db);
        break;
      case 'status':
        await runStatus(db);
        break;
      default:
        console.error(`\n  Unknown command: ${command}`);
        console.error('  Usage: npx tsx scripts/migrate.ts [up|down|status]\n');
        process.exit(1);
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
