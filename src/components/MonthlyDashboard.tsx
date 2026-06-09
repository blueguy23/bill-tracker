'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MatchBanner } from '@/components/MatchBanner';
import { OnboardingBanner } from '@/components/OnboardingBanner';
import { NewSubscriptionsBanner } from '@/components/NewSubscriptionsBanner';
import { HeroKPIRow } from './dashboard/HeroKPIRow';
import { OverBudgetAlerts } from './dashboard/OverBudgetAlerts';
import { CategorySpendChart } from './dashboard/CategorySpendChart';
import { UpcomingBills } from './dashboard/UpcomingBills';
import { RecentActivity } from './dashboard/RecentActivity';
import type { BillResponse, BillSummary } from '@/types/bill';
import type { EnrichedMatch } from '@/types/subscription';
import type { Account, Transaction } from '@/lib/simplefin/types';
import type { CashFlow } from '@/adapters/accounts';

interface BillAlert { name: string; amount: number; daysUntilDue: number; isOverdue: boolean }
interface BudgetAlert { category: string; spent: number; limit: number }
interface PriceAlert { name: string; oldAmount: number; newAmount: number; isSubscription: boolean }

interface Props {
  bills: BillResponse[];
  accounts: Account[];
  recentTransactions: Transaction[];
  cashFlow: CashFlow;
  enrichedMatches: EnrichedMatch[];
  summary: BillSummary;
  savingsRate: number;
  categorySpendData: Array<{ label: string; amount: number }>;
  budgetAlerts: BudgetAlert[];
  billAlerts: BillAlert[];
  priceAlerts: PriceAlert[];
  rawBillCount: number;
  accountCount: number;
  hasBudget: boolean;
  simplefinConfigured: boolean;
}

export function MonthlyDashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-[140px] w-[140px] rounded-full mx-auto" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-32" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-4 w-40" />
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <Card key={i}>
            <CardContent className="p-6 space-y-3">
              <Skeleton className="h-4 w-28" />
              {[1, 2, 3, 4].map(j => (
                <Skeleton key={j} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function MonthlyDashboard({
  bills, accounts: _accounts, recentTransactions, cashFlow, enrichedMatches,
  summary, savingsRate, categorySpendData, budgetAlerts, billAlerts, priceAlerts,
  rawBillCount, accountCount, hasBudget, simplefinConfigured,
}: Props) {
  const monthlyBills = bills.filter(b => b.recurrenceInterval !== 'yearly');
  const paidCount = bills.filter(b => b.isPaid).length;
  const totalBudget = budgetAlerts.reduce((sum, b) => sum + b.limit, 0);
  const totalSpent = budgetAlerts.reduce((sum, b) => sum + b.spent, 0);
  const overBudget = budgetAlerts.filter(b => b.spent > b.limit && b.limit > 0);
  const monthStr = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-5">
        <OnboardingBanner simplefinConfigured={simplefinConfigured} accountCount={accountCount} billCount={rawBillCount} hasBudget={hasBudget} />
        <NewSubscriptionsBanner />
        <MatchBanner matches={enrichedMatches} />

        <HeroKPIRow
          cashFlow={cashFlow}
          paidCount={paidCount}
          monthlyBillCount={monthlyBills.length}
          summary={summary}
          savingsRate={savingsRate}
        />

        <OverBudgetAlerts overBudget={overBudget} />

        <CategorySpendChart
          categorySpendData={categorySpendData}
          budgetAlerts={budgetAlerts}
          priceAlerts={priceAlerts}
          totalBudget={totalBudget}
          totalSpent={totalSpent}
          monthStr={monthStr}
        />

        <div className="grid grid-cols-2 gap-4">
          <UpcomingBills billAlerts={billAlerts} />
          <RecentActivity recentTransactions={recentTransactions} />
        </div>
      </div>
    </TooltipProvider>
  );
}
