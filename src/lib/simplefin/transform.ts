import type {
  RawSFINAccount,
  RawSFINTransaction,
  RawSFINError,
  Account,
  AccountType,
  Transaction,
  SFINError,
} from './types';

export function inferAccountType(extra?: RawSFINAccount['extra']): AccountType {
  const t = extra?.type?.toLowerCase() ?? '';
  if (t === 'checking') return 'checking';
  if (t === 'savings') return 'savings';
  if (t === 'credit' || t === 'credit card') return 'credit';
  if (t === 'investment' || t === 'brokerage') return 'investment';
  return 'other';
}

export function transformAccount(raw: RawSFINAccount, now: Date = new Date()): Account {
  return {
    _id: raw.id,
    orgName: raw.org.name,
    name: raw.name,
    currency: raw.currency,
    balance: parseFloat(raw.balance),
    availableBalance: raw['available-balance'] != null
      ? parseFloat(raw['available-balance'])
      : null,
    balanceDate: new Date(raw['balance-date'] * 1000),
    accountType: inferAccountType(raw.extra),
    lastSyncedAt: now,
  };
}

export function transformTransaction(raw: RawSFINTransaction, accountId: string, now: Date = new Date()): Transaction {
  return {
    _id: raw.id,
    accountId,
    posted: new Date(raw.posted * 1000),
    amount: parseFloat(raw.amount),
    description: raw.description,
    memo: raw.memo ?? null,
    pending: raw.extra?.pending ?? false,
    importedAt: now,
  };
}

export function transformError(raw: RawSFINError): SFINError {
  return {
    type: raw.type,
    accountId: raw['account-id'],
    message: raw.message,
  };
}
