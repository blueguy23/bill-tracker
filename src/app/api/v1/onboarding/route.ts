import { NextResponse } from 'next/server';
import { getDb } from '@/adapters/db';
import { listAccounts } from '@/adapters/accounts';
import { listBills } from '@/adapters/bills';
import { listBudgets } from '@/adapters/budgets';

export interface OnboardingStatus {
  simplefinConfigured: boolean;
  accountCount: number;
  billCount: number;
  hasBudget: boolean;
  /** 1 = connect SimpleFIN, 2 = sync accounts, 3 = add first bill, 4 = set budget, 5 = complete */
  currentStep: 1 | 2 | 3 | 4 | 5;
}

export async function GET(): Promise<NextResponse<OnboardingStatus>> {
  // Canonical env var is SIMPLEFIN_URL — the resolved access URL used by the sync client.
  // SIMPLEFIN_ACCESS_URL is the one-time claim URL (not yet resolved), so checking it here
  // would give a false positive. Match the sync route's check.
  const simplefinConfigured = Boolean(process.env.SIMPLEFIN_URL);

  const db = await getDb();
  const [accounts, bills, budgets] = await Promise.all([
    listAccounts(db),
    listBills(db),
    listBudgets(db),
  ]);

  const accountCount = accounts.length;
  const billCount = bills.length;
  const hasBudget = budgets.length > 0;

  let currentStep: OnboardingStatus['currentStep'] = 1;
  if (simplefinConfigured) currentStep = 2;
  if (simplefinConfigured && accountCount > 0) currentStep = 3;
  if (simplefinConfigured && accountCount > 0 && billCount > 0) currentStep = 4;
  if (simplefinConfigured && accountCount > 0 && billCount > 0 && hasBudget) currentStep = 5;

  return NextResponse.json({
    simplefinConfigured,
    accountCount,
    billCount,
    hasBudget,
    currentStep,
  });
}
