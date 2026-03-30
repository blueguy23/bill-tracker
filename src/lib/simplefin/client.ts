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
    const url = new URL(`${this.url}/accounts`);
    url.searchParams.set('version', '2');

    if (options.balancesOnly) {
      url.searchParams.set('balances-only', '1');
    } else if (options.startDate) {
      url.searchParams.set('start-date', String(Math.floor(options.startDate.getTime() / 1000)));
    }

    let res: Response;
    try {
      res = await fetch(url.toString());
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
