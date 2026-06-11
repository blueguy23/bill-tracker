import type { DetectedSubscriptionResponse } from '@/types/subscription';

export type ActionType =
  | 'bill-due'
  | 'bill-overdue'
  | 'classify-recurring'
  | 'price-change'
  | 'budget-warning'
  | 'payment-confirm';

export interface Action {
  id: string;
  type: ActionType;
  priority: number;
  title: string;
  subtitle: string;
  financialImpact: number;
  urgencyLabel?: string;
  data: Record<string, unknown>;
}

interface BillAlert {
  name: string;
  amount: number;
  daysUntilDue: number;
  isOverdue: boolean;
  isAutoPay: boolean;
}

interface BudgetAlert {
  category: string;
  spent: number;
  limit: number;
}

interface PriceAlert {
  name: string;
  oldAmount: number;
  newAmount: number;
  isSubscription: boolean;
}

interface PendingConfirmation {
  _id: string;
  billName: string;
  billAmount: number;
  transactionDescription: string;
  transactionAmount: number;
}

interface ActionQueueInput {
  billAlerts: BillAlert[];
  budgetAlerts: BudgetAlert[];
  priceAlerts: PriceAlert[];
  pendingSubscriptions: DetectedSubscriptionResponse[];
  pendingConfirmations: PendingConfirmation[];
}

export function buildActionQueue(input: ActionQueueInput): Action[] {
  const actions: Action[] = [];

  for (const bill of input.billAlerts) {
    if (bill.isOverdue) {
      actions.push({
        id: `overdue-${bill.name}`,
        type: 'bill-overdue',
        priority: 100 + bill.amount,
        title: `${bill.name} is overdue`,
        subtitle: bill.isAutoPay
          ? `$${bill.amount.toFixed(2)} · autopay may have processed`
          : `$${bill.amount.toFixed(2)} · pay now to avoid late fees`,
        financialImpact: bill.amount,
        urgencyLabel: 'Overdue',
        data: { billName: bill.name, amount: bill.amount },
      });
    } else if (bill.daysUntilDue <= 3 && !bill.isAutoPay) {
      actions.push({
        id: `due-soon-${bill.name}`,
        type: 'bill-due',
        priority: 80 + (3 - bill.daysUntilDue) * 10,
        title: `${bill.name} due ${bill.daysUntilDue === 0 ? 'today' : bill.daysUntilDue === 1 ? 'tomorrow' : `in ${bill.daysUntilDue} days`}`,
        subtitle: `$${bill.amount.toFixed(2)} · manual payment required`,
        financialImpact: bill.amount,
        urgencyLabel: `${bill.daysUntilDue}d`,
        data: { billName: bill.name, amount: bill.amount, daysUntilDue: bill.daysUntilDue },
      });
    }
  }

  for (const sub of input.pendingSubscriptions) {
    actions.push({
      id: `classify-${sub.id}`,
      type: 'classify-recurring',
      priority: 50,
      title: `New recurring: ${sub.normalizedName}`,
      subtitle: `$${sub.amount.toFixed(2)}/${sub.interval} · bill or subscription?`,
      financialImpact: sub.amount,
      data: { subscriptionId: sub.id, name: sub.normalizedName, amount: sub.amount, interval: sub.interval },
    });
  }

  for (const alert of input.priceAlerts) {
    const delta = alert.newAmount - alert.oldAmount;
    const direction = delta > 0 ? 'increased' : 'decreased';
    actions.push({
      id: `price-${alert.name}`,
      type: 'price-change',
      priority: 40 + Math.abs(delta),
      title: `${alert.name} price ${direction}`,
      subtitle: `$${alert.oldAmount.toFixed(2)} → $${alert.newAmount.toFixed(2)}/mo`,
      financialImpact: Math.abs(delta) * 12,
      data: { name: alert.name, oldAmount: alert.oldAmount, newAmount: alert.newAmount },
    });
  }

  for (const b of input.budgetAlerts) {
    const pct = Math.round((b.spent / b.limit) * 100);
    if (pct >= 90) {
      actions.push({
        id: `budget-${b.category}`,
        type: 'budget-warning',
        priority: 30 + (pct - 90),
        title: `${b.category} ${pct >= 100 ? 'over budget' : 'near budget limit'}`,
        subtitle: `$${b.spent.toFixed(0)} of $${b.limit.toFixed(0)} · ${pct}%`,
        financialImpact: Math.max(0, b.spent - b.limit),
        urgencyLabel: `${pct}%`,
        data: { category: b.category, spent: b.spent, limit: b.limit },
      });
    }
  }

  for (const pc of input.pendingConfirmations) {
    actions.push({
      id: `confirm-${pc._id}`,
      type: 'payment-confirm',
      priority: 45,
      title: `Confirm: ${pc.billName} payment`,
      subtitle: `Matched "${pc.transactionDescription}" · $${Math.abs(pc.transactionAmount).toFixed(2)}`,
      financialImpact: 0,
      data: { confirmationId: pc._id, billName: pc.billName },
    });
  }

  return actions.sort((a, b) => b.priority - a.priority);
}
