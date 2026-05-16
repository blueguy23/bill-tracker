// ── Raw SimpleFIN Protocol v2 shapes ─────────────────────────────────────────

export interface RawSFINOrg {
  name: string;
  'sfin-url'?: string;
}

export interface RawSFINHolding {
  id: string;
  description?: string;
  ticker?: string;
  'market-value'?: string;  // decimal string
  'cost-basis'?: string;    // decimal string
  quantity?: string;        // decimal string
  currency?: string;
  'purchased-at'?: number;  // unix timestamp
}

export interface RawSFINTransaction {
  id: string;
  posted: number;         // unix timestamp; 0 when transaction is pending
  amount: string;         // decimal string e.g. "-42.50"
  description: string;
  payee?: string;
  memo?: string | null;
  transacted_at?: number;
  pending?: boolean;      // top-level field sent by SimpleFIN Bridge for pending txns
  extra?: {
    pending?: boolean;    // fallback — some bridges may use this instead
    [key: string]: unknown;
  };
}

export interface RawSFINAccount {
  id: string;
  org?: RawSFINOrg;
  name: string;
  currency: string;
  balance: string;                   // decimal string
  'available-balance'?: string;      // decimal string, optional
  'balance-date': number;            // unix timestamp
  transactions?: RawSFINTransaction[];
  holdings?: RawSFINHolding[];
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
  'x-api-message'?: string[];
}

// ── Normalized internal types ─────────────────────────────────────────────────

export type AccountType = 'checking' | 'savings' | 'credit' | 'investment' | 'other';

export interface Holding {
  id: string;
  ticker: string | null;
  description: string | null;
  marketValue: number;
  costBasis: number | null;
  quantity: number | null;
  purchasedAt: Date | null;
  currency: string;
}

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
  holdings?: Holding[];
  extra?: Record<string, unknown>;
}

export interface Transaction {
  _id: string;
  accountId: string;
  posted: Date;
  amount: number;
  description: string;
  payee?: string;
  memo: string | null;
  transactedAt?: Date;
  pending: boolean;
  importedAt: Date;
  extra?: Record<string, unknown>;
  bridgeCategory?: string;
  bridgeMappedCategory?: import('@/lib/categorization/types').TransactionCategory;
  category?: import('@/lib/categorization/types').TransactionCategory;
  categorySource?: 'keyword' | 'trove' | 'bridge' | 'user-override';
  merchantName?: string | null;
  merchantDomain?: string | null;
  tags?: string[];
  notes?: string | null;
  isTransfer?: boolean;
  amortize?: boolean;
  customName?: string;
}

export interface SyncLog {
  _id: string;
  date: string;           // YYYY-MM-DD UTC
  requestCount: number;
  urlUnits?: Record<string, number>;  // hashed URL -> fractional units used today
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
  quotaWarning?: boolean;
  unitsRemaining?: number;
}

export interface FetchAccountsOptions {
  startDate?: Date;
  endDate?: Date;
  balancesOnly?: boolean;
  accountIds?: string[];
  includePending?: boolean;
  includeHoldings?: boolean;
}
