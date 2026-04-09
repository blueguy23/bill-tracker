import { NextResponse } from 'next/server';
import type { StrictDB } from 'strictdb';
import type { Account, Transaction } from '@/lib/simplefin/types';
import type {
  CreditAccountSummary,
  CreditPaymentRecord,
  CreditSummaryResponse,
  OverallCreditStats,
} from '@/types/credit';
import type { AccountMeta } from '@/types/creditAdvisor';
import { listCreditAccounts, listCreditTransactions } from '@/adapters/credit';
import { listAccountMeta } from '@/adapters/accountMeta';

export function buildAccountSummaries(
  accounts: Account[],
  metaMap: Map<string, AccountMeta>,
): CreditAccountSummary[] {
  return accounts.map((a) => {
    const meta = metaMap.get(a._id);
    // SimpleFIN credit card balance is negative (amount owed). availableBalance is
    // the remaining credit available (positive). 0 means the bank didn't send data —
    // not that the card is maxed — so require > 0 before trusting it.
    const hasAvailableBalance = a.availableBalance !== null && a.availableBalance > 0;
    // creditLimit = money owed + remaining credit = -balance + availableBalance
    // Fall back to manually entered limit when SimpleFIN doesn't provide one.
    const creditLimit = hasAvailableBalance
      ? -a.balance + (a.availableBalance as number)
      : (meta?.manualCreditLimit ?? null);
    const hasLimitData = creditLimit !== null && creditLimit > 0;
    const amountOwed = Math.abs(a.balance); // balance is negative for credit cards
    const utilization = hasLimitData && creditLimit > 0
      ? amountOwed / creditLimit
      : null;
    return {
      id: a._id,
      orgName: meta?.customOrgName ?? a.orgName,
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
    // balance is negative for credit cards; totalBalance stores amount owed (positive)
    totalBalance += Math.abs(s.balance);
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

  const [transactions, metaList] = await Promise.all([
    listCreditTransactions(db, accountIds),
    listAccountMeta(db, accountIds),
  ]);
  const metaMap = new Map(metaList.map((m) => [m._id, m]));

  const summaries = buildAccountSummaries(accounts, metaMap);
  const overall = buildOverallStats(summaries);

  const accountMap = new Map(accounts.map((a) => [a._id, { name: a.name, orgName: metaMap.get(a._id)?.customOrgName ?? a.orgName }]));
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
