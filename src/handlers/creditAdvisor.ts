import { NextResponse } from 'next/server';
import type { StrictDB } from 'strictdb';
import type { Account, Transaction } from '@/lib/simplefin/types';
import type { AccountMeta, AZEOCard, AZEOPlan, CreditAdvisorResponse, UtilizationDataPoint } from '@/types/creditAdvisor';
import { listCreditAccounts, listCreditTransactions } from '@/adapters/credit';
import { listAccountMeta } from '@/adapters/accountMeta';
import { buildAccountSummaries, buildOverallStats, computeHealthScore } from '@/handlers/credit';

const ALERT_DAYS = Number(process.env.CREDIT_ALERT_DAYS ?? 5);

// ── Trend ─────────────────────────────────────────────────────────────────────

export function computeUtilizationTrend(
  accounts: Account[],
  transactions: Transaction[],
): UtilizationDataPoint[] {
  const eligible = accounts.filter((a) => a.availableBalance !== null);
  if (eligible.length === 0) return [];

  const totalLimit = eligible.reduce((sum, a) => sum + a.balance + (a.availableBalance as number), 0);
  if (totalLimit === 0) return [];

  const settled = transactions.filter((t) => !t.pending);
  const points: UtilizationDataPoint[] = [];
  const now = Date.now();

  for (let i = 29; i >= 0; i--) {
    const dayMs = now - i * 24 * 60 * 60 * 1000;
    const dayStart = new Date(dayMs);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dateStr = dayStart.toISOString().slice(0, 10);

    let totalBalance = 0;
    for (const acct of eligible) {
      const txnsAfter = settled.filter(
        (t) => t.accountId === acct._id && t.posted > dayStart,
      );
      const netAfter = txnsAfter.reduce((sum, t) => sum + t.amount, 0);
      const balanceAtDay = Math.max(0, acct.balance - netAfter);
      totalBalance += balanceAtDay;
    }

    points.push({
      date: dateStr,
      utilization: Math.min(1, totalBalance / totalLimit),
      totalBalance,
    });
  }

  return points;
}

// ── Statement close date ──────────────────────────────────────────────────────

export function nextStatementCloseDate(closingDay: number, from: Date = new Date()): Date {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth();
  const todayDay = from.getUTCDate();

  // Clamp to last day of month
  function clampedDate(y: number, m: number, d: number): Date {
    const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return new Date(Date.UTC(y, m, Math.min(d, lastDay)));
  }

  const thisMonth = clampedDate(year, month, closingDay);
  if (thisMonth.getUTCDate() >= todayDay) return thisMonth;

  // Already passed this month — use next month
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  return clampedDate(nextYear, nextMonth, closingDay);
}

// ── AZEO plan ─────────────────────────────────────────────────────────────────

export function computeAZEO(
  accounts: Account[],
  metaList: AccountMeta[],
  currentScore: number | null,
  now: Date = new Date(),
): AZEOPlan | null {
  const eligible = accounts.filter((a) => a.availableBalance !== null);
  if (eligible.length === 0) return null;

  const metaMap = new Map(metaList.map((m) => [m._id, m]));
  const defaultTarget = Number(process.env.CREDIT_TARGET_UTIL ?? 0.05);

  // Sort by credit limit descending; tie-break: name ascending
  const sorted = [...eligible].sort((a, b) => {
    const limitA = a.balance + (a.availableBalance as number);
    const limitB = b.balance + (b.availableBalance as number);
    if (limitB !== limitA) return limitB - limitA;
    return a.name.localeCompare(b.name);
  });

  const anchorAcct = sorted[0]!;
  const anchorMeta = metaMap.get(anchorAcct._id);
  const anchorTargetUtil = anchorMeta?.targetUtilization ?? defaultTarget;
  const anchorLimit = anchorAcct.balance + (anchorAcct.availableBalance as number);
  const anchorTargetBalance = Math.round(anchorLimit * anchorTargetUtil);

  let projectedTotalBalance = anchorTargetBalance;
  let projectedTotalLimit = anchorLimit;
  const cards: AZEOCard[] = [];

  for (const acct of sorted) {
    const meta = metaMap.get(acct._id);
    const limit = acct.balance + (acct.availableBalance as number);
    const isAnchor = acct._id === anchorAcct._id;
    const targetUtil = isAnchor ? anchorTargetUtil : 0;
    const targetBalance = isAnchor ? anchorTargetBalance : 0;
    const paydownNeeded = Math.max(0, acct.balance - targetBalance);
    const currentUtil = limit > 0 ? acct.balance / limit : 0;

    let daysUntilClose: number | null = null;
    let alertActive = false;

    if (meta?.statementClosingDay) {
      const closeDate = nextStatementCloseDate(meta.statementClosingDay, now);
      const diffMs = closeDate.getTime() - now.getTime();
      daysUntilClose = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
      alertActive = daysUntilClose <= ALERT_DAYS && paydownNeeded > 0;
    }

    if (!isAnchor) {
      projectedTotalBalance += 0; // paid to $0
      projectedTotalLimit += limit;
    }

    cards.push({
      accountId: acct._id,
      accountName: `${acct.orgName} ${acct.name}`.trim(),
      currentBalance: acct.balance,
      creditLimit: limit,
      currentUtilization: currentUtil,
      targetBalance,
      targetUtilization: targetUtil,
      paydownNeeded,
      isAnchor,
      statementClosingDay: meta?.statementClosingDay ?? null,
      daysUntilClose,
      alertActive,
    });
  }

  const projectedOverallUtilization = projectedTotalLimit > 0
    ? projectedTotalBalance / projectedTotalLimit
    : 0;

  // Recompute projected score using buildOverallStats on hypothetical summaries
  const summaries = buildAccountSummaries(sorted.map((a) => {
    const isAnchor = a._id === anchorAcct._id;
    const targetBal = isAnchor ? anchorTargetBalance : 0;
    return { ...a, balance: targetBal };
  }));
  const projectedOverall = buildOverallStats(summaries);
  const projectedScore = computeHealthScore(projectedOverall, [], eligible.length);

  return {
    anchorCard: {
      accountId: anchorAcct._id,
      accountName: `${anchorAcct.orgName} ${anchorAcct.name}`.trim(),
      creditLimit: anchorLimit,
      targetBalance: anchorTargetBalance,
      targetUtilization: anchorTargetUtil,
    },
    cards,
    projectedOverallUtilization,
    projectedScore,
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function handleGetCreditAdvisor(db: StrictDB): Promise<NextResponse> {
  const accounts = await listCreditAccounts(db);
  const accountIds = accounts.map((a) => a._id);

  const [transactions, metaList] = await Promise.all([
    listCreditTransactions(db, accountIds),
    listAccountMeta(db, accountIds),
  ]);

  const trend = computeUtilizationTrend(accounts, transactions);

  const summaries = buildAccountSummaries(accounts);
  const overall = buildOverallStats(summaries);
  const currentScore = computeHealthScore(overall, [], accounts.length);

  const azeo = computeAZEO(accounts, metaList, currentScore);

  const response: CreditAdvisorResponse = { trend, azeo };
  return NextResponse.json(response);
}
