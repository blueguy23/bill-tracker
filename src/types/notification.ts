export type NotificationEvent =
  | 'bill_due_soon'
  | 'bill_overdue'
  | 'budget_warning'
  | 'budget_exceeded'
  | 'sync_completed'
  | 'sync_failed'
  | 'daily_digest'
  | 'test';

export interface NotificationLog {
  _id: string;
  event: NotificationEvent;
  key: string;
  sentAt: Date;
  payload: string;
}

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields?: DiscordEmbedField[];
  footer?: { text: string };
  timestamp?: string;
}

export interface DiscordWebhookPayload {
  embeds: DiscordEmbed[];
}

export interface BillDueSoonPayload {
  billId: string;
  billName: string;
  amount: number;
  dueDate: Date;
  daysUntilDue: number;
}

export interface BillOverduePayload {
  billId: string;
  billName: string;
  amount: number;
  daysOverdue: number;
}

export interface BudgetAlertPayload {
  category: string;
  spent: number;
  budget: number;
  percentUsed: number;
}

export interface SyncCompletedPayload {
  accountsUpdated: number;
  transactionsImported: number;
  warnings: string[];
}

export interface SyncFailedPayload {
  errorMessage: string;
}

export interface DigestPayload {
  billsDueSoon: BillDueSoonPayload[];
  overdueCount: number;
  budgetWarnings: BudgetAlertPayload[];
  budgetExceeded: BudgetAlertPayload[];
}
