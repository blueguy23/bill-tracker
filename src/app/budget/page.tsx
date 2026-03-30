import type { Metadata } from 'next';
import type { CategoryBudgetSummary } from '@/types/budget';
import { BudgetView } from '@/components/BudgetView';

export const metadata: Metadata = { title: 'Budget' };

async function fetchBudgets(): Promise<{ month: string; budgets: CategoryBudgetSummary[] }> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/v1/budgets`, { cache: 'no-store' });
  if (!res.ok) {
    console.error(`[fetchBudgets] API returned ${res.status} ${res.statusText}`);
    return { month: '', budgets: [] };
  }
  return res.json() as Promise<{ month: string; budgets: CategoryBudgetSummary[] }>;
}

export default async function BudgetPage() {
  const data = await fetchBudgets();

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-white">Budget</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {data.month ? `${data.month} — spending by category` : 'Monthly spending by category'}
          </p>
        </div>
      </div>
      <BudgetView initialData={data} />
    </div>
  );
}
