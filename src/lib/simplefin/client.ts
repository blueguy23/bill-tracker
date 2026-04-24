import { transformAccount, transformTransaction, transformError } from './transform';
import type {
  RawSFINResponse,
  Account,
  Transaction,
  SFINError,
  FetchAccountsOptions,
} from './types';

export interface SimpleFINClientConfig {
  url: string | undefined;
}

export interface FetchAccountsResult {
  accounts: Account[];
  transactions: Transaction[];
  errors: SFINError[];
}

export class SimpleFINClient {
  private readonly url: string;

  constructor(config: SimpleFINClientConfig) {
    if (!config.url) {
      throw new Error('SIMPLEFIN_URL is required');
    }
    this.url = config.url;
  }

  async fetchAccounts(options: FetchAccountsOptions = {}): Promise<FetchAccountsResult> {
    const parsed = new URL(`${this.url}/accounts`);
    const username = parsed.username;
    const password = parsed.password;
    parsed.username = '';
    parsed.password = '';
    parsed.searchParams.set('version', '2');

    if (options.balancesOnly) {
      parsed.searchParams.set('balances-only', '1');
    } else if (options.startDate) {
      parsed.searchParams.set('start-date', String(Math.floor(options.startDate.getTime() / 1000)));
    }

    const headers: Record<string, string> = {};
    if (username || password) {
      headers['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    }

    let res: Response;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      try {
        res = await fetch(parsed.toString(), { headers, signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      throw new Error(`SimpleFIN network error: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!res.ok) {
      throw new Error(`SimpleFIN returned HTTP ${res.status} — check your access URL or re-authenticate`);
    }

    const raw = await res.json() as RawSFINResponse;
    const now = new Date();

    const accounts: Account[] = [];
    const transactions: Transaction[] = [];

    for (const rawAccount of raw.accounts) {
      accounts.push(transformAccount(rawAccount, now));
      for (const rawTxn of rawAccount.transactions ?? []) {
        transactions.push(transformTransaction(rawTxn, rawAccount.id, now));
      }
    }

    const errors = (raw.errors ?? []).map(transformError);

    return { accounts, transactions, errors };
  }
}
