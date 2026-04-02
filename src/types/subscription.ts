import type { BillCategory } from './bill';

export type SubscriptionInterval = 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
export type SubscriptionConfidence = 'high' | 'medium' | 'low';

export const SUBSCRIPTION_INTERVALS: SubscriptionInterval[] = [
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
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
}

export interface SuggestedMatch {
  transactionId: string;
  billId: string;
  billName: string;
  confidence: 'high' | 'medium';
}
