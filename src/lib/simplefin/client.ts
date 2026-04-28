import { createHash } from 'crypto';
import { transformAccount, transformTransaction, transformError } from './transform';
import type {
  RawSFINResponse,
  Account,
  Transaction,
  SFINError,
  FetchAccountsOptions,
} from './types';

export class InvalidTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTokenError';
  }
}

export class TokenCompromisedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenCompromisedError';
  }
}

export class SubscriptionLapsedError extends Error {
  constructor() {
    super(
      'Your SimpleFIN subscription has expired. Please renew at beta-bridge.simplefin.org to continue syncing.',
    );
    this.name = 'SubscriptionLapsedError';
  }
}

export class AuthFailedError extends Error {
  constructor() {
    super(
      'Access to your SimpleFIN account was denied. Your connection may have been revoked. Please reconnect in Settings.',
    );
    this.name = 'AuthFailedError';
  }
}

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
  readonly urlHash: string;

  constructor(config: SimpleFINClientConfig) {
    if (!config.url) {
      throw new Error('SIMPLEFIN_URL is required');
    }
    this.url = config.url;
    this.urlHash = createHash('sha256').update(this.url).digest('hex').slice(0, 16);
  }

  async claimToken(setupToken: string): Promise<string> {
    const claimUrl = Buffer.from(setupToken.trim(), 'base64').toString('utf-8');

    let parsed: URL;
    try {
      parsed = new URL(claimUrl);
    } catch {
      throw new InvalidTokenError('Setup token decoded to an invalid URL.');
    }
    if (parsed.protocol !== 'https:') {
      throw new InvalidTokenError(
        'Setup token must decode to an HTTPS URL. Refusing to proceed.',
      );
    }

    let res: Response;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      try {
        res = await fetch(claimUrl, { method: 'POST', signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      throw new Error(
        `SimpleFIN claim network error: ${err instanceof Error ? err.message : String(err)}`,
        { cause: err },
      );
    }

    if (res.status === 403) {
      throw new TokenCompromisedError(
        'This token has already been used or does not exist. Please go to beta-bridge.simplefin.org and disable this token immediately, then generate a new one.',
      );
    }

    if (!res.ok) {
      throw new Error(`SimpleFIN claim returned HTTP ${res.status}`);
    }

    return (await res.text()).trim();
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

    if (options.endDate) {
      parsed.searchParams.set('end-date', String(Math.floor(options.endDate.getTime() / 1000)));
    }

    for (const id of options.accountIds ?? []) {
      parsed.searchParams.append('account', id);
    }

    if (options.includePending) {
      parsed.searchParams.set('pending', '1');
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
      throw new Error(`SimpleFIN network error: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
    }

    if (res.status === 402) {
      throw new SubscriptionLapsedError();
    }
    if (res.status === 403) {
      throw new AuthFailedError();
    }
    if (!res.ok) {
      throw new Error(`SimpleFIN returned HTTP ${res.status} — check your access URL or re-authenticate`);
    }

    const raw = await res.json() as RawSFINResponse;

    if (process.env.NODE_ENV === 'development' && raw['x-api-message']?.length) {
      console.warn('[SimpleFIN Bridge]', raw['x-api-message'].join(' | '));
    }

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
