'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PanelTrigger } from '@/components/PanelTrigger';
import { RadialMetric } from './RadialMetric';
import type { CashFlow } from '@/adapters/accounts';
import type { BillSummary } from '@/types/bill';

const USD0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

interface HeroKPIRowProps {
  cashFlow: CashFlow;
  paidCount: number;
  monthlyBillCount: number;
  summary: BillSummary;
  savingsRate: number;
}

export function HeroKPIRow({ cashFlow, paidCount, monthlyBillCount, summary, savingsRate }: HeroKPIRowProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <PanelTrigger type="money-left">
        <Card className="hover:ring-white/[0.08] hover:shadow-lg transition-all cursor-pointer">
          <CardHeader className="pb-0 pt-4 px-4">
            <CardDescription className="text-[11px] font-mono uppercase tracking-wider">Net Cash Flow</CardDescription>
          </CardHeader>
          <CardContent className="pb-2 px-4">
            <RadialMetric
              value={Math.max(cashFlow.income - cashFlow.expenses, 0)}
              max={cashFlow.income || 1}
              label={USD0.format(Math.max(0, cashFlow.net))}
              sublabel="remaining"
              detail={`${USD0.format(cashFlow.income)} income − ${USD0.format(cashFlow.expenses)} expenses = ${USD0.format(cashFlow.net)} net`}
              color="var(--chart-1)"
            />
          </CardContent>
          <CardFooter className="pt-0 pb-4 px-4 flex-col items-start gap-1">
            <div className="flex items-center gap-2 text-xs font-medium">
              {cashFlow.net >= 0 ? (
                <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">On track</Badge>
              ) : (
                <Badge variant="secondary" className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">Deficit</Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground font-mono">
              {USD0.format(cashFlow.income)} in · {USD0.format(cashFlow.expenses)} out
            </p>
          </CardFooter>
        </Card>
      </PanelTrigger>

      <PanelTrigger type="bills">
        <Card className="hover:ring-white/[0.08] hover:shadow-lg transition-all cursor-pointer">
          <CardHeader className="pb-0 pt-4 px-4">
            <CardDescription className="text-[11px] font-mono uppercase tracking-wider">Bills Covered</CardDescription>
          </CardHeader>
          <CardContent className="pb-2 px-4">
            <RadialMetric
              value={paidCount}
              max={monthlyBillCount || 1}
              label={`${paidCount}/${monthlyBillCount}`}
              sublabel="paid"
              detail={`${paidCount} paid · ${monthlyBillCount - paidCount} remaining · ${USD0.format(summary.totalOwedThisMonth)} owed`}
              color="var(--chart-2)"
            />
          </CardContent>
          <CardFooter className="pt-0 pb-4 px-4 flex-col items-start gap-1">
            <div className="flex items-center gap-2 text-xs font-medium">
              {monthlyBillCount - paidCount > 0 ? (
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">
                  {monthlyBillCount - paidCount} remaining
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">All paid</Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground font-mono">
              {USD0.format(summary.totalPaid)} paid · {USD0.format(summary.totalOwedThisMonth)} owed
            </p>
          </CardFooter>
        </Card>
      </PanelTrigger>

      <PanelTrigger type="savings">
        <Card className="hover:ring-white/[0.08] hover:shadow-lg transition-all cursor-pointer">
          <CardHeader className="pb-0 pt-4 px-4">
            <CardDescription className="text-[11px] font-mono uppercase tracking-wider">Savings Rate</CardDescription>
          </CardHeader>
          <CardContent className="pb-2 px-4">
            <RadialMetric
              value={Math.max(savingsRate, 0)}
              max={100}
              label={`${Math.max(0, savingsRate).toFixed(0)}%`}
              sublabel="of income"
              detail={`${USD0.format(Math.max(0, cashFlow.net))} saved of ${USD0.format(cashFlow.income)} income · target 20%`}
              color={savingsRate >= 20 ? 'var(--chart-1)' : 'var(--chart-4)'}
            />
          </CardContent>
          <CardFooter className="pt-0 pb-4 px-4 flex-col items-start gap-1">
            <div className="flex items-center gap-2 text-xs font-medium">
              {savingsRate >= 20 ? (
                <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">Above 20% target</Badge>
              ) : (
                <Badge variant="secondary" className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">Below 20% target</Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground font-mono">
              {USD0.format(Math.max(0, cashFlow.net))} saved this month
            </p>
          </CardFooter>
        </Card>
      </PanelTrigger>
    </div>
  );
}
