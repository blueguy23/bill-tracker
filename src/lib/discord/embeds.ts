import type {
  DiscordEmbed,
  BillDueSoonPayload,
  BillOverduePayload,
  BudgetAlertPayload,
  SyncCompletedPayload,
  SyncFailedPayload,
  DigestPayload,
} from '@/types/notification';
import type { StatementAlertPayload, CreditUtilizationAlertPayload } from '@/types/creditAdvisor';

const COLOR = {
  amber: 0xf59e0b,
  red: 0xef4444,
  green: 0x22c55e,
  blue: 0x3b82f6,
  purple: 0x8b5cf6,
} as const;

function usd(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
}

function ts(): string {
  return new Date().toISOString();
}

export function buildBillDueSoonEmbed(p: BillDueSoonPayload): DiscordEmbed {
  return {
    title: 'Bill Due Soon',
    color: COLOR.amber,
    fields: [
      { name: 'Bill', value: p.billName, inline: true },
      { name: 'Amount', value: usd(p.amount), inline: true },
      { name: 'Due', value: fmtDate(p.dueDate), inline: true },
      { name: 'Days Until Due', value: String(p.daysUntilDue), inline: true },
    ],
    timestamp: ts(),
  };
}

export function buildBillOverdueEmbed(p: BillOverduePayload): DiscordEmbed {
  return {
    title: 'Bill Overdue',
    color: COLOR.red,
    fields: [
      { name: 'Bill', value: p.billName, inline: true },
      { name: 'Amount', value: usd(p.amount), inline: true },
      { name: 'Days Overdue', value: String(p.daysOverdue), inline: true },
    ],
    timestamp: ts(),
  };
}

export function buildBudgetWarningEmbed(p: BudgetAlertPayload): DiscordEmbed {
  return {
    title: 'Budget Warning',
    color: COLOR.amber,
    fields: [
      { name: 'Category', value: p.category, inline: true },
      { name: 'Spent', value: usd(p.spent), inline: true },
      { name: 'Budget', value: usd(p.budget), inline: true },
      { name: '% Used', value: `${Math.round(p.percentUsed)}%`, inline: true },
    ],
    timestamp: ts(),
  };
}

export function buildBudgetExceededEmbed(p: BudgetAlertPayload): DiscordEmbed {
  return {
    title: 'Budget Exceeded',
    color: COLOR.red,
    fields: [
      { name: 'Category', value: p.category, inline: true },
      { name: 'Spent', value: usd(p.spent), inline: true },
      { name: 'Budget', value: usd(p.budget), inline: true },
      { name: 'Over By', value: usd(p.spent - p.budget), inline: true },
    ],
    timestamp: ts(),
  };
}

export function buildSyncCompletedEmbed(p: SyncCompletedPayload): DiscordEmbed {
  const warningText = p.warnings.length > 0 ? p.warnings.join('\n') : 'None';
  return {
    title: 'Sync Completed',
    color: COLOR.green,
    fields: [
      { name: 'Accounts Updated', value: String(p.accountsUpdated), inline: true },
      { name: 'Transactions Imported', value: String(p.transactionsImported), inline: true },
      { name: 'Warnings', value: warningText },
    ],
    timestamp: ts(),
  };
}

export function buildSyncFailedEmbed(p: SyncFailedPayload): DiscordEmbed {
  return {
    title: 'Sync Failed',
    color: COLOR.red,
    description: p.errorMessage,
    timestamp: ts(),
  };
}

export function buildDailyDigestEmbed(p: DigestPayload): DiscordEmbed {
  const dueSoonText = p.billsDueSoon.length > 0
    ? p.billsDueSoon.map((b) => `• ${b.billName} — ${usd(b.amount)} (${b.daysUntilDue}d)`).join('\n')
    : 'Nothing due soon';
  const warningText = [...p.budgetWarnings, ...p.budgetExceeded]
    .map((w) => `• ${w.category} — ${Math.round(w.percentUsed)}% used`)
    .join('\n') || 'All budgets on track';

  return {
    title: 'Daily Digest',
    color: COLOR.blue,
    fields: [
      { name: `Bills Due Soon (${p.billsDueSoon.length})`, value: dueSoonText },
      { name: 'Overdue Bills', value: String(p.overdueCount), inline: true },
      { name: 'Budget Alerts', value: warningText },
    ],
    timestamp: ts(),
  };
}

export function buildTestEmbed(): DiscordEmbed {
  return {
    title: 'Test Notification',
    color: COLOR.purple,
    description: 'Your Discord webhook is configured correctly.',
    timestamp: ts(),
  };
}

export function buildStatementCloseEmbed(p: StatementAlertPayload): DiscordEmbed {
  const closeDateStr = p.closeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const currentPct = `${Math.round(p.currentUtilization * 100)}%`;
  const targetPct = `${Math.round(p.targetUtilization * 100)}%`;
  const fields = [
    { name: 'Closes In', value: `${p.daysUntilClose} day${p.daysUntilClose !== 1 ? 's' : ''} (${closeDateStr})`, inline: true },
    { name: 'Current Balance', value: `${usd(p.currentBalance)} / ${usd(p.creditLimit)} (${currentPct})`, inline: true },
    { name: `Pay to ${targetPct}`, value: `Pay ${usd(p.paydownToTarget)} → report ${usd(p.targetBalance)}`, inline: false },
    { name: 'Pay to 0%', value: `Pay ${usd(p.currentBalance)} → report $0`, inline: false },
  ];
  if (p.isAnchorCard && p.totalCards > 1) {
    fields.push({ name: 'AZEO Tip', value: 'This is your anchor card. Pay all other cards to $0 for best score.', inline: false });
  }
  return {
    title: `Statement Closing Soon — ${p.accountName}`,
    color: COLOR.amber,
    fields,
    timestamp: ts(),
  };
}

export function buildCreditUtilizationAlertEmbed(p: CreditUtilizationAlertPayload): DiscordEmbed {
  return {
    title: `High Utilization — ${p.accountName}`,
    color: COLOR.red,
    fields: [
      { name: 'Utilization', value: `${Math.round(p.utilization * 100)}%`, inline: true },
      { name: 'Balance', value: `${usd(p.currentBalance)} / ${usd(p.creditLimit)}`, inline: true },
      { name: 'Action', value: `Pay ${usd(p.paydownTo30Pct)} to bring below 30%`, inline: false },
    ],
    timestamp: ts(),
  };
}
