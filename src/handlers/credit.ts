import { NextResponse } from 'next/server';
import type { StrictDB } from 'strictdb';
import type { Account, Transaction } from '@/lib/simplefin/types';
import type {
  CreditAccountSummary,
  CreditPaymentRecord,
  CreditSummaryResponse,
  OverallCreditStats,
} from '@/types/credit';
import { listCreditAccounts, listCreditTransactions } from '@/adapters/credit';

export function buildAccountSummaries(accounts: Account[]): CreditAccountSummary[] {
  return accounts.map((a) => {
    const hasLimitData = a.availableBalance !== null;
    const creditLimit = hasLimitData ? a.balance + (a.availableBalance as number) : null;
    const utilization = hasLimitData && creditLimit !== null && creditLimit > 0
      ? a.balance / creditLimit
      : hasLimitData ? 0
      : null;
    return {
      id: a._id,
      orgName: a.orgName,
      name: a.name,
      balance: a.balance,
      creditLimit,
      availableBalance: a.availableBalance,
      utilization,
      hasLimitData,
      balanceDate: a.balanceDate instanceof Date
        ? a.balanceDate.toISOString()
        : new Date(a.balanceDate).toISOString(),
    };
  });
}

export function buildOverallStats(summaries: CreditAccountSummary[]): OverallCreditStats {
  const accountCount = summaries.length;
  let totalBalance = 0;
  let totalLimit = 0;
  let accountsWithLimitData = 0;

  for (const s of summaries) {
    totalBalance += s.balance;
    if (s.hasLimitData && s.creditLimit !== null) {
      totalLimit += s.creditLimit;
      accountsWithLimitData++;
    }
  }

  const utilization = accountsWithLimitData > 0 && totalLimit > 0
    ? totalBalance / totalLimit
    : accountsWithLimitData > 0 ? 0
    : null;

  return { totalBalance, totalLimit, utilization, accountCount, accountsWithLimitData };
}

function buildRecentPayments(
  transactions: Transaction[],
  accountMap: Map<string, { name: string; orgName: string }>,
): CreditPaymentRecord[] {
  return transactions.filter((t) => t.amount < 0).slice(0, 10).map((t) => {
    const acct = accountMap.get(t.accountId) ?? { name: 'Unknown', orgName: 'Unknown' };
    return {
      id: t._id,
      accountId: t.accountId,
      accountName: acct.name,
      orgName: acct.orgName,
      amount: t.amount,
      posted: t.posted instanceof Date ? t.posted.toISOString() : new Date(t.posted).toISOString(),
      description: t.description,
    };
  });
}

export function computeHealthScore(
  overall: OverallCreditStats,
  recentPayments: CreditPaymentRecord[],
  totalAccounts: number,
): number | null {
  if (totalAccounts === 0) return null;

  const clampedUtil = overall.utilization !== null
    ? Math.min(1, Math.max(0, overall.utilization))
    : 0;
  const utilizationPts = overall.accountsWithLimitData > 0 ? 60 * (1 - clampedUtil) : 0;

  const payingAccountIds = new Set(recentPayments.map((p) => p.accountId));
  const paymentPts = 30 * (payingAccountIds.size / totalAccounts);

  const noLimitAccounts = totalAccounts - overall.accountsWithLimitData;
  const penalty = noLimitAccounts * 10;

  return Math.round(Math.max(0, Math.min(100, utilizationPts + paymentPts - penalty)));
}

export async function handleGetCreditSummary(db: StrictDB): Promise<NextResponse> {
  const accounts = await listCreditAccounts(db);
  const accountIds = accounts.map((a) => a._id);

  const transactions = await listCreditTransactions(db, accountIds);

  const summaries = buildAccountSummaries(accounts);
  const overall = buildOverallStats(summaries);

  const accountMap = new Map(accounts.map((a) => [a._id, { name: a.name, orgName: a.orgName }]));
  const recentPayments = buildRecentPayments(transactions, accountMap);

  const score = computeHealthScore(overall, recentPayments, accounts.length);

  const response: CreditSummaryResponse = {
    accounts: summaries,
    overall,
    recentPayments,
    score,
  };

  return NextResponse.json(response);
}
