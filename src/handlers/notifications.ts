import type { StrictDB } from 'strictdb';
import type {
  BillDueSoonPayload,
  BillOverduePayload,
  BudgetAlertPayload,
  SyncCompletedPayload,
  SyncFailedPayload,
  DiscordEmbed,
  NotificationEvent,
} from '@/types/notification';
import type { StatementAlertPayload, CreditUtilizationAlertPayload } from '@/types/creditAdvisor';
import { isWebhookConfigured, sendWebhook } from '@/lib/discord/webhook';
import {
  buildBillDueSoonEmbed,
  buildBillOverdueEmbed,
  buildBudgetWarningEmbed,
  buildBudgetExceededEmbed,
  buildSyncCompletedEmbed,
  buildSyncFailedEmbed,
  buildTestEmbed,
  buildStatementCloseEmbed,
  buildCreditUtilizationAlertEmbed,
} from '@/lib/discord/embeds';
import { findRecentLog, insertNotificationLog } from '@/adapters/notificationLog';
import { listCreditAccounts } from '@/adapters/credit';
import { listAccountMeta } from '@/adapters/accountMeta';
import { buildAccountSummaries } from '@/handlers/credit';
import { nextStatementCloseDate } from '@/handlers/creditAdvisor';

const HOUR = 60 * 60 * 1000;

const COOLDOWNS: Partial<Record<NotificationEvent, number>> = {
  bill_due_soon: 24 * HOUR,
  bill_overdue: 24 * HOUR,
  budget_warning: 6 * HOUR,
  budget_exceeded: 6 * HOUR,
  sync_failed: 1 * HOUR,
  daily_digest: 20 * HOUR,
  statement_close_alert: 24 * HOUR,
  credit_utilization_alert: 24 * HOUR,
};

async function dispatchNotification(
  db: StrictDB,
  event: NotificationEvent,
  key: string,
  embed: DiscordEmbed,
): Promise<void> {
  try {
    const cooldownMs = COOLDOWNS[event];
    if (cooldownMs) {
      const recent = await findRecentLog(db, key, cooldownMs);
      if (recent) return;
    }
    await sendWebhook({ embeds: [embed] });
    await insertNotificationLog(db, {
      event,
      key,
      sentAt: new Date(),
      payload: JSON.stringify(embed),
    });
  } catch (err) {
    console.error(`[notifications] failed to send ${event}:`, err);
  }
}

export async function notifyBillDueSoon(db: StrictDB, p: BillDueSoonPayload): Promise<void> {
  if (!isWebhookConfigured()) return;
  const today = new Date().toISOString().slice(0, 10);
  await dispatchNotification(db, 'bill_due_soon', `bill_due_soon:${p.billId}:${today}`, buildBillDueSoonEmbed(p));
}

export async function notifyBillOverdue(db: StrictDB, p: BillOverduePayload): Promise<void> {
  if (!isWebhookConfigured()) return;
  const today = new Date().toISOString().slice(0, 10);
  await dispatchNotification(db, 'bill_overdue', `bill_overdue:${p.billId}:${today}`, buildBillOverdueEmbed(p));
}

export async function notifyBudgetWarning(db: StrictDB, p: BudgetAlertPayload): Promise<void> {
  if (!isWebhookConfigured()) return;
  await dispatchNotification(db, 'budget_warning', `budget_warning:${p.category}`, buildBudgetWarningEmbed(p));
}

export async function notifyBudgetExceeded(db: StrictDB, p: BudgetAlertPayload): Promise<void> {
  if (!isWebhookConfigured()) return;
  await dispatchNotification(db, 'budget_exceeded', `budget_exceeded:${p.category}`, buildBudgetExceededEmbed(p));
}

export async function notifySyncCompleted(db: StrictDB, p: SyncCompletedPayload): Promise<void> {
  if (!isWebhookConfigured()) return;
  await dispatchNotification(db, 'sync_completed', `sync_completed:${Date.now()}`, buildSyncCompletedEmbed(p));
}

export async function notifySyncFailed(db: StrictDB, p: SyncFailedPayload): Promise<void> {
  if (!isWebhookConfigured()) return;
  await dispatchNotification(db, 'sync_failed', 'sync_failed:global', buildSyncFailedEmbed(p));
}

export async function notifyTest(db: StrictDB): Promise<void> {
  if (!isWebhookConfigured()) return;
  await dispatchNotification(db, 'test', `test:${Date.now()}`, buildTestEmbed());
}

export async function notifyStatementClose(db: StrictDB, p: StatementAlertPayload): Promise<void> {
  if (!isWebhookConfigured()) return;
  await dispatchNotification(
    db,
    'statement_close_alert',
    `statement_close_alert:${p.accountId}`,
    buildStatementCloseEmbed(p),
  );
}

export async function notifyCreditUtilizationAlert(db: StrictDB, p: CreditUtilizationAlertPayload): Promise<void> {
  if (!isWebhookConfigured()) return;
  await dispatchNotification(
    db,
    'credit_utilization_alert',
    `credit_utilization_alert:${p.accountId}`,
    buildCreditUtilizationAlertEmbed(p),
  );
}

export async function checkCreditAlerts(db: StrictDB): Promise<void> {
  if (!isWebhookConfigured()) return;
  const accounts = await listCreditAccounts(db);
  if (accounts.length === 0) return;

  const accountIds = accounts.map((a) => a._id);
  const metaList = await listAccountMeta(db, accountIds);
  const metaMap = new Map(metaList.map((m) => [m._id, m]));
  const summaries = buildAccountSummaries(accounts, metaMap);
  const totalCards = summaries.filter((s) => s.hasLimitData).length;
  const alertDays = Number(process.env.CREDIT_ALERT_DAYS ?? 5);
  const now = new Date();

  for (const summary of summaries) {
    if (!summary.hasLimitData || summary.creditLimit === null) continue;

    // Utilization spike alert
    if (summary.utilization !== null && summary.utilization > 0.70) {
      const paydownTo30Pct = Math.max(0, summary.balance - summary.creditLimit * 0.30);
      void notifyCreditUtilizationAlert(db, {
        accountId: summary.id,
        accountName: summary.name,
        currentBalance: summary.balance,
        creditLimit: summary.creditLimit,
        utilization: summary.utilization,
        paydownTo30Pct,
      });
    }

    // Statement close alert
    const meta = metaMap.get(summary.id);
    if (!meta?.statementClosingDay) continue;

    const closeDate = nextStatementCloseDate(meta.statementClosingDay, now);
    const diffMs = closeDate.getTime() - now.getTime();
    const daysUntilClose = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
    if (daysUntilClose > alertDays) continue;

    const targetUtil = meta.targetUtilization ?? Number(process.env.CREDIT_TARGET_UTIL ?? 0.05);
    const targetBalance = Math.round(summary.creditLimit * targetUtil);
    const paydownToTarget = Math.max(0, summary.balance - targetBalance);
    if (paydownToTarget === 0) continue;

    const acct = accounts.find((a) => a._id === summary.id);
    const isAnchorCard = summaries
      .filter((s) => s.hasLimitData && s.creditLimit !== null)
      .sort((a, b) => (b.creditLimit ?? 0) - (a.creditLimit ?? 0))[0]?.id === summary.id;

    void notifyStatementClose(db, {
      accountId: summary.id,
      accountName: `${acct?.orgName ?? ''} ${summary.name}`.trim(),
      currentBalance: summary.balance,
      creditLimit: summary.creditLimit,
      currentUtilization: summary.utilization ?? 0,
      targetBalance,
      targetUtilization: targetUtil,
      paydownToTarget,
      closeDate,
      daysUntilClose,
      isAnchorCard,
      totalCards,
    });
  }
}

export function checkBillNotifications(db: StrictDB, bill: {
  _id: string;
  name: string;
  amount: number;
  dueDate: string | number;
  isPaid: boolean;
  isRecurring: boolean;
}): void {
  if (bill.isPaid || bill.isRecurring || typeof bill.dueDate !== 'string') return;
  if (!isWebhookConfigured()) return;

  const due = new Date(bill.dueDate);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  const dueSoonDays = Number(process.env.BILL_DUE_SOON_DAYS ?? 3);

  if (diffDays < 0) {
    void notifyBillOverdue(db, {
      billId: bill._id,
      billName: bill.name,
      amount: bill.amount,
      daysOverdue: Math.abs(diffDays),
    });
  } else if (diffDays <= dueSoonDays) {
    void notifyBillDueSoon(db, {
      billId: bill._id,
      billName: bill.name,
      amount: bill.amount,
      dueDate: due,
      daysUntilDue: diffDays,
    });
  }
}
