import { describe, it, expect, vi } from 'vitest';
import { setTransactionTags, setTransactionNotes } from '@/adapters/transactionTags';
import type { StrictDB } from 'strictdb';

function makeMockDb(returnValue: unknown = { _id: 'txn-1' }): StrictDB {
  return {
    updateOne: vi.fn().mockResolvedValue(returnValue),
  } as unknown as StrictDB;
}

describe('setTransactionTags', () => {
  it('saves normalized lowercase tags', async () => {
    const db = makeMockDb();
    await setTransactionTags(db, 'txn-1', ['Business', '  TRAVEL  ', 'food']);

    expect(db.updateOne).toHaveBeenCalledWith(
      'transactions',
      { _id: 'txn-1' },
      { $set: { tags: ['business', 'travel', 'food'] } },
    );
  });

  it('filters out empty strings after trim', async () => {
    const db = makeMockDb();
    await setTransactionTags(db, 'txn-1', ['valid', '   ', '']);

    expect(db.updateOne).toHaveBeenCalledWith(
      'transactions',
      { _id: 'txn-1' },
      { $set: { tags: ['valid'] } },
    );
  });

  it('filters out tags longer than 50 chars', async () => {
    const db = makeMockDb();
    const tooLong = 'a'.repeat(51);
    await setTransactionTags(db, 'txn-1', ['ok', tooLong]);

    const call = (db.updateOne as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const update = call[2] as { $set: { tags: string[] } };
    expect(update.$set.tags).toEqual(['ok']);
  });

  it('returns true when db returns a result', async () => {
    const db = makeMockDb({ _id: 'txn-1' });
    const result = await setTransactionTags(db, 'txn-1', ['tag']);
    expect(result).toBe(true);
  });

  it('returns false when db returns null (not found)', async () => {
    const db = makeMockDb(null);
    const result = await setTransactionTags(db, 'txn-missing', ['tag']);
    expect(result).toBe(false);
  });

  it('saves an empty array to clear all tags', async () => {
    const db = makeMockDb();
    await setTransactionTags(db, 'txn-1', []);
    expect(db.updateOne).toHaveBeenCalledWith(
      'transactions',
      { _id: 'txn-1' },
      { $set: { tags: [] } },
    );
  });
});

describe('setTransactionNotes', () => {
  it('trims whitespace before saving', async () => {
    const db = makeMockDb();
    await setTransactionNotes(db, 'txn-1', '  my note  ');
    expect(db.updateOne).toHaveBeenCalledWith(
      'transactions',
      { _id: 'txn-1' },
      { $set: { notes: 'my note' } },
    );
  });

  it('saves null when empty string is passed', async () => {
    const db = makeMockDb();
    await setTransactionNotes(db, 'txn-1', '');
    expect(db.updateOne).toHaveBeenCalledWith(
      'transactions',
      { _id: 'txn-1' },
      { $set: { notes: null } },
    );
  });

  it('truncates notes to 500 chars', async () => {
    const db = makeMockDb();
    const long = 'x'.repeat(600);
    await setTransactionNotes(db, 'txn-1', long);
    const call = (db.updateOne as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const update = call[2] as { $set: { notes: string } };
    expect(update.$set.notes?.length).toBe(500);
  });

  it('returns true when db returns a result', async () => {
    const db = makeMockDb({ _id: 'txn-1' });
    const result = await setTransactionNotes(db, 'txn-1', 'note');
    expect(result).toBe(true);
  });

  it('returns false when db returns null', async () => {
    const db = makeMockDb(null);
    const result = await setTransactionNotes(db, 'missing', 'note');
    expect(result).toBe(false);
  });
});
