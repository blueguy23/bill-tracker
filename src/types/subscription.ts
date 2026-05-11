import type { BillCategory, RecurringType } from './bill';

export type { RecurringType } from './bill';

export type SubscriptionInterval = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
export type SubscriptionConfidence = 'high' | 'medium' | 'low';

export const SUBSCRIPTION_INTERVALS: SubscriptionInterval[] = [
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly',
];

export const SUBSCRIPTION_CONFIDENCES: SubscriptionConfidence[] = ['high', 'medium', 'low'];

export interface DetectedSubscription {
  id: string;
  normalizedName: string;
  rawDescriptions: string[];
  amount: number;
  amountVariance: boolean;
  interval: SubscriptionInterval;
  lastCharged: Date;
  nextEstimated: Date;
  occurrences: number;
  accountIds: string[];
  confidence: SubscriptionConfidence;
  suggestedCategory: BillCategory;
  matchedBillId: string | null;
  recurringType: RecurringType;
  typeConfidence: SubscriptionConfidence;
  signals: string[];
  /** _id of the most recent transaction in this pattern — used for amortize flagging */
  lastTransactionId: string;
}

export interface DismissedSubscription {
  _id: string;
  dismissedAt: Date;
}

/** Serialized shape returned from the API (dates as ISO strings) */
export interface DetectedSubscriptionResponse {
  id: string;
  normalizedName: string;
  rawDescriptions: string[];
  amount: number;
  amountVariance: boolean;
  interval: SubscriptionInterval;
  lastCharged: string;
  nextEstimated: string;
  occurrences: number;
  accountIds: string[];
  confidence: SubscriptionConfidence;
  suggestedCategory: BillCategory;
  matchedBillId: string | null;
  recurringType: RecurringType;
  typeConfidence: SubscriptionConfidence;
  signals: string[];
  lastTransactionId: string;
}

export interface SuggestedMatch {
  transactionId: string;
  billId: string;
  billName: string;
  billAmount: number;
  confidence: 'high' | 'medium';
}

export interface EnrichedMatch extends SuggestedMatch {
  txnDescription: string;
  txnAmount: number;
  txnDate: string;
}
