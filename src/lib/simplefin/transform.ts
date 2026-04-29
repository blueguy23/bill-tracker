import type {
  RawSFINAccount,
  RawSFINTransaction,
  RawSFINError,
  Account,
  AccountType,
  Transaction,
  SFINError,
} from './types';

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

export function inferAccountType(extra?: RawSFINAccount['extra'], name?: string): AccountType {
  const t = extra?.type?.toLowerCase() ?? '';
  if (t === 'checking') return 'checking';
  if (t === 'savings') return 'savings';
  if (t === 'credit' || t === 'credit card') return 'credit';
  if (t === 'investment' || t === 'brokerage') return 'investment';

  const n = name?.toLowerCase() ?? '';
  if (/credit|visa|mastercard|amex|discover|freedom|sapphire|venture|quicksilver/.test(n)) return 'credit';
  if (/checking|chequing/.test(n)) return 'checking';
  if (/savings|save|share account|hsa/.test(n)) return 'savings';
  if (/invest|brokerage|401k|ira|roth/.test(n)) return 'investment';
  return 'other';
}

const BANK_PATTERNS: [RegExp, string][] = [
  [/chase/i, 'Chase'],
  [/capital one|capitalone/i, 'Capital One'],
  [/bank of america|bofa/i, 'Bank of America'],
  [/wells fargo/i, 'Wells Fargo'],
  [/citibank|citi(?:\s|$)/i, 'Citibank'],
  [/american express|amex/i, 'American Express'],
  [/discover/i, 'Discover'],
  [/us bank|usbank/i, 'U.S. Bank'],
  [/pnc/i, 'PNC'],
  [/td bank/i, 'TD Bank'],
  [/ally/i, 'Ally'],
  [/navy federal/i, 'Navy Federal'],
  [/usaa/i, 'USAA'],
  [/synchrony/i, 'Synchrony'],
  [/fidelity/i, 'Fidelity'],
  [/charles schwab|schwab/i, 'Charles Schwab'],
  [/vanguard/i, 'Vanguard'],
  [/marcus/i, 'Marcus by Goldman Sachs'],
  [/sofi/i, 'SoFi'],
  [/chime/i, 'Chime'],
  [/apple card|apple\s+bank/i, 'Apple Card'],
  [/venmo/i, 'Venmo'],
  [/paypal/i, 'PayPal'],
  [/barclays/i, 'Barclays'],
  [/credit union/i, 'Credit Union'],
  [/citizens bank/i, 'Citizens Bank'],
  [/truist/i, 'Truist'],
  [/keybank|key bank/i, 'KeyBank'],
  [/regions/i, 'Regions Bank'],
  [/suntrust/i, 'SunTrust'],
  [/fifth third/i, 'Fifth Third Bank'],
  [/huntington/i, 'Huntington'],
  [/m&t bank|m&t/i, 'M&T Bank'],
  [/comerica/i, 'Comerica'],
  [/nerdwallet/i, 'NerdWallet'],
  [/robinhood/i, 'Robinhood'],
  [/wealthfront/i, 'Wealthfront'],
  [/betterment/i, 'Betterment'],
];

export function inferOrgName(rawOrgName: string | undefined, accountName: string): string {
  if (rawOrgName) return rawOrgName;
  for (const [pattern, bankName] of BANK_PATTERNS) {
    if (pattern.test(accountName)) return bankName;
  }
  return 'Unknown';
}

export function transformAccount(raw: RawSFINAccount, now: Date = new Date()): Account {
  return {
    _id: raw.id,
    orgName: inferOrgName(raw.org?.name, raw.name),
    name: raw.name,
    currency: raw.currency,
    balance: parseFloat(raw.balance),
    availableBalance: raw['available-balance'] != null
      ? parseFloat(raw['available-balance'])
      : null,
    balanceDate: new Date(raw['balance-date'] * 1000),
    accountType: inferAccountType(raw.extra, raw.name),
    lastSyncedAt: now,
    holdings: raw.holdings ?? [],
    extra: raw.extra,
  };
}

export function transformTransaction(raw: RawSFINTransaction, accountId: string, now: Date = new Date()): Transaction {
  return {
    _id: raw.id,
    accountId,
    posted: new Date(raw.posted * 1000),
    amount: parseFloat(raw.amount),
    description: raw.description,
    payee: raw.payee,
    memo: raw.memo ?? null,
    transactedAt: raw.transacted_at != null ? new Date(raw.transacted_at * 1000) : undefined,
    pending: raw.extra?.pending ?? false,
    importedAt: now,
    extra: raw.extra,
  };
}

export function transformError(raw: RawSFINError): SFINError {
  return {
    type: raw.type,
    accountId: raw['account-id'],
    message: raw.message != null ? stripHtml(raw.message) : undefined,
  };
}
