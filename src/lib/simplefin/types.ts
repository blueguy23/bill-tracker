// ── Raw SimpleFIN Protocol v2 shapes ─────────────────────────────────────────

export interface RawSFINOrg {
  name: string;
  'sfin-url'?: string;
}

export interface RawSFINTransaction {
  id: string;
  posted: number;         // unix timestamp
  amount: string;         // decimal string e.g. "-42.50"
  description: string;
  memo?: string | null;
  extra?: {
    pending?: boolean;
    [key: string]: unknown;
  };
}

export interface RawSFINAccount {
  id: string;
  org: RawSFINOrg;
  name: string;
  currency: string;
  balance: string;                   // decimal string
  'available-balance'?: string;      // decimal string, optional
  'balance-date': number;            // unix timestamp
  transactions?: RawSFINTransaction[];
  extra?: {
    type?: string;
    [key: string]: unknown;
  };
}

export type SFINErrorType = 'RATE_LIMIT' | 'NO_DATA' | 'UNAVAILABLE' | string;

export interface RawSFINError {
  type: SFINErrorType;
  'account-id'?: string;
  message?: string;
}

export interface RawSFINResponse {
  accounts: RawSFINAccount[];
  errors: RawSFINError[];
}

// ── Normalized internal types ─────────────────────────────────────────────────

export type AccountType = 'checking' | 'savings' | 'credit' | 'investment' | 'other';

export interface SFINError {
  type: SFINErrorType;
  accountId?: string;
  message?: string;
}

export interface Account {
  _id: string;
  orgName: string;
  name: string;
  currency: string;
  balance: number;
  availableBalance: number | null;
  balanceDate: Date;
  accountType: AccountType;
  lastSyncedAt: Date;
}

export interface Transaction {
  _id: string;
  accountId: string;
  posted: Date;
  amount: number;
  description: string;
  memo: string | null;
  pending: boolean;
  importedAt: Date;
}

export interface SyncLog {
  _id: string;
  date: string;           // YYYY-MM-DD UTC
  requestCount: number;
  lastSyncAt: Date | null;
  lastSyncType: 'historical' | 'daily' | 'manual' | null;
  historicalImportDone: boolean;
}

export interface SyncResult {
  accountsUpdated: number;
  transactionsUpserted: number;
  quotaUsed: number;
  warnings: string[];
  skipped?: boolean;
}

export interface FetchAccountsOptions {
  startDate?: Date;
  balancesOnly?: boolean;
}
