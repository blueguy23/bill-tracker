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
import { isWebhookConfigured, sendWebhook } from '@/lib/discord/webhook';
import {
  buildBillDueSoonEmbed,
  buildBillOverdueEmbed,
  buildBudgetWarningEmbed,
  buildBudgetExceededEmbed,
  buildSyncCompletedEmbed,
  buildSyncFailedEmbed,
  buildTestEmbed,
} from '@/lib/discord/embeds';
import { findRecentLog, insertNotificationLog } from '@/adapters/notificationLog';

const HOUR = 60 * 60 * 1000;

const COOLDOWNS: Partial<Record<NotificationEvent, number>> = {
  bill_due_soon: 24 * HOUR,
  bill_overdue: 24 * HOUR,
  budget_warning: 6 * HOUR,
  budget_exceeded: 6 * HOUR,
  sync_failed: 1 * HOUR,
  daily_digest: 20 * HOUR,
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
  await dispatchNotification(db, 'test', `test:${Date.now()}`, buildTestEmbed());
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
