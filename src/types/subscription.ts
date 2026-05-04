import type { BillCategory } from './bill';

export type SubscriptionInterval = 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
export type RecurringType = 'bill' | 'subscription' | 'recurring';
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
  recurringType: RecurringType;
  typeConfidence: 'high' | 'medium' | 'low';
}

export interface DismissedSubscription {
  _id: string;
  dismissedAt: Date;
}

/** A subscription the user has explicitly confirmed as recurring */
export interface AnchoredSubscription {
  _id: string;           // same as detection id (sha1 of name:interval)
  name: string;
  anchoredAmount: number;
  interval: SubscriptionInterval;
  category: BillCategory;
  rawDescriptions: string[];
  anchoredAt: Date;
  lastSeenAmount: number;
  priceChangedAt: Date | null;
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
  typeConfidence: 'high' | 'medium' | 'low';
  /** Set when user has confirmed this as a subscription */
  isAnchored: boolean;
  /** Original amount when user confirmed — present only when isAnchored */
  anchoredAmount: number | null;
  /** True when current amount differs from anchoredAmount by more than $0.50 */
  priceIncreased: boolean;
  anchoredAt: string | null;
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
