import type { StrictDB } from 'strictdb';
import type { Bill } from '@/types/bill';
import type { BillDueSoonPayload, BudgetAlertPayload } from '@/types/notification';
import { isWebhookConfigured, sendWebhook } from '@/lib/discord/webhook';
import { buildDailyDigestEmbed } from '@/lib/discord/embeds';
import { findRecentLog, insertNotificationLog } from '@/adapters/notificationLog';
import { listBills } from '@/adapters/bills';
import { listBudgets } from '@/adapters/budgets';
import { listTransactionsForMonth } from '@/adapters/transactions';
import { listUnmatchedQuickAdds } from '@/adapters/quickAdd';
import { computeSpending, computeEffectiveBudget, computeCategoryStatus } from '@/lib/budget/engine';
import type { BillCategory } from '@/types/bill';

const DIGEST_COOLDOWN_MS = 20 * 60 * 60 * 1000;
const DIGEST_KEY = 'daily_digest:global';

export interface DigestResult {
  sent: boolean;
  reason?: 'no_webhook' | 'already_sent_today';
  billsDueSoon: number;
  overdueCount: number;
  budgetWarnings: number;
}

function computeBillAlerts(bills: Bill[], dueSoonDays: number): {
  dueSoon: BillDueSoonPayload[];
  overdueCount: number;
} {
  const now = new Date();
  const dueSoon: BillDueSoonPayload[] = [];
  let overdueCount = 0;

  for (const bill of bills) {
    if (bill.isPaid || bill.isRecurring || typeof bill.dueDate !== 'string') continue;
    const due = new Date(bill.dueDate);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays < 0) {
      overdueCount++;
    } else if (diffDays <= dueSoonDays) {
      dueSoon.push({ billId: bill._id, billName: bill.name, amount: bill.amount, dueDate: due, daysUntilDue: diffDays });
    }
  }

  return { dueSoon, overdueCount };
}

async function computeBudgetAlerts(db: StrictDB): Promise<{
  warnings: BudgetAlertPayload[];
  exceeded: BudgetAlertPayload[];
}> {
  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const [budgets, transactions, quickAdds] = await Promise.all([
    listBudgets(db),
    listTransactionsForMonth(db, month),
    listUnmatchedQuickAdds(db),
  ]);

  const warnings: BudgetAlertPayload[] = [];
  const exceeded: BudgetAlertPayload[] = [];

  for (const budget of budgets) {
    if (!budget.monthlyAmount) continue;
    const spent = computeSpending(transactions, quickAdds, budget.category as BillCategory, month);
    const effective = computeEffectiveBudget(budget);
    const status = computeCategoryStatus(effective, spent);
    const percentUsed = effective > 0 ? (spent / effective) * 100 : 0;

    const payload: BudgetAlertPayload = { category: budget.category, spent, budget: effective, percentUsed };
    if (status === 'over_budget') exceeded.push(payload);
    else if (status === 'warning') warnings.push(payload);
  }

  return { warnings, exceeded };
}

export async function runDailyDigest(db: StrictDB): Promise<DigestResult> {
  const empty: DigestResult = { sent: false, billsDueSoon: 0, overdueCount: 0, budgetWarnings: 0 };

  if (!isWebhookConfigured()) return { ...empty, reason: 'no_webhook' };

  const recent = await findRecentLog(db, DIGEST_KEY, DIGEST_COOLDOWN_MS);
  if (recent) return { ...empty, reason: 'already_sent_today' };

  const dueSoonDays = Number(process.env.BILL_DUE_SOON_DAYS ?? 3);
  const [bills, { warnings, exceeded }] = await Promise.all([
    listBills(db),
    computeBudgetAlerts(db),
  ]);

  const { dueSoon, overdueCount } = computeBillAlerts(bills, dueSoonDays);

  const embed = buildDailyDigestEmbed({
    billsDueSoon: dueSoon,
    overdueCount,
    budgetWarnings: warnings,
    budgetExceeded: exceeded,
  });

  try {
    await sendWebhook({ embeds: [embed] });
    await insertNotificationLog(db, {
      event: 'daily_digest',
      key: DIGEST_KEY,
      sentAt: new Date(),
      payload: JSON.stringify(embed),
    });
  } catch (err) {
    console.error('[digest] failed to send webhook:', err);
    return { ...empty, reason: 'no_webhook' };
  }

  return {
    sent: true,
    billsDueSoon: dueSoon.length,
    overdueCount,
    budgetWarnings: warnings.length + exceeded.length,
  };
}
