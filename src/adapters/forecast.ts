import type { StrictDB } from 'strictdb';
import { listAccounts, listTransactionsForDetection, listIncomeTransactions } from '@/adapters/accounts';
import { listBills } from '@/adapters/bills';
import { detectSubscriptions } from '@/lib/subscriptions/detect';
import {
  buildForecast,
  detectIncomePatterns,
  type ForecastDay,
  type ForecastBill,
  type ForecastSub,
  type IncomePattern,
} from '@/lib/forecast';

export interface ForecastResult {
  days: ForecastDay[];
  incomePatterns: IncomePattern[];
}

export async function getForecast(db: StrictDB): Promise<ForecastResult> {
  const [accounts, allBills, transactions, incomeTxns] = await Promise.all([
    listAccounts(db),
    listBills(db),
    listTransactionsForDetection(db),
    listIncomeTransactions(db),
  ]);

  const currentBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const bills: ForecastBill[] = allBills
    .filter((b) => b.isRecurring && typeof b.dueDate === 'number')
    .map((b) => ({
      name: b.name,
      amount: b.amount,
      dueDate: b.dueDate as number,
      recurrenceInterval: b.recurrenceInterval!,
    }));

  const detected = detectSubscriptions(transactions, allBills);
  const subscriptions: ForecastSub[] = detected.map((d) => ({
    name: d.normalizedName,
    amount: d.amount,
    nextEstimated: d.nextEstimated,
    interval: d.interval,
  }));

  const incomePatterns = detectIncomePatterns(incomeTxns);

  const days = buildForecast({
    currentBalance,
    bills,
    subscriptions,
    incomePatterns,
  });

  return { days, incomePatterns };
}
