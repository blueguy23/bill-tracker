'use client';

import { useMemo } from 'react';
import {
  RadialBarChart, RadialBar, PolarGrid, PolarRadiusAxis, Label,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList, Cell,
} from 'recharts';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { PanelTrigger } from '@/components/PanelTrigger';
import { MatchBanner } from '@/components/MatchBanner';
import { OnboardingBanner } from '@/components/OnboardingBanner';
import { NewSubscriptionsBanner } from '@/components/NewSubscriptionsBanner';
import type { BillResponse, BillSummary } from '@/types/bill';
import type { EnrichedMatch } from '@/types/subscription';
import type { Account, Transaction } from '@/lib/simplefin/types';
import type { CashFlow } from '@/adapters/accounts';
import type { Budget as _Budget } from '@/types/budget';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const USD0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

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

const CATEGORY_ICONS: Record<string, string> = {
  food: '🍕', transport: '🚗', shopping: '🛒', entertainment: '🎬',
  utilities: '⚡', subscriptions: '↻', rent: '🏠', insurance: '🛡',
  health: '💊', loans: '💳', other: '·',
};

const CATEGORY_BAR_COLORS: Record<string, string> = {
  food: '#fb923c',
  transport: '#a1a1aa',
  shopping: '#c084fc',
  entertainment: '#f472b6',
  utilities: '#4ade80',
  subscriptions: '#818cf8',
  rent: '#fbbf24',
  insurance: '#34d399',
  health: '#22d3ee',
  loans: '#f87171',
  other: '#71717a',
};

const BAR_COLORS_ORDERED = ['#fb923c', '#c084fc', '#f472b6', '#4ade80', '#818cf8', '#fbbf24', '#34d399', '#22d3ee'];

const AVATAR_COLORS = ['bg-orange-500/20 text-orange-400', 'bg-purple-500/20 text-purple-400', 'bg-pink-500/20 text-pink-400', 'bg-emerald-500/20 text-emerald-400', 'bg-indigo-500/20 text-indigo-400', 'bg-amber-500/20 text-amber-400'];

function getInitials(name: string): string {
  return name.split(/[\s-]+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function RadialMetric({ value, max, label, sublabel, detail, color }: { value: number; max: number; label: string; sublabel: string; detail: string; color: string }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const endAngle = pct * 360;
  const chartData = [{ value: pct * 100, fill: color }];
  const config: ChartConfig = { value: { label, color } };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <ChartContainer config={config} className="mx-auto aspect-square max-h-[140px]">
              <RadialBarChart data={chartData} startAngle={90} endAngle={90 - endAngle} innerRadius={52} outerRadius={68}>
                <PolarGrid gridType="circle" radialLines={false} stroke="none" className="first:fill-muted last:fill-background" polarRadius={[68, 52]} />
                <RadialBar dataKey="value" background cornerRadius={10} />
                <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan x={viewBox.cx} y={(viewBox.cy || 0) - 6} className="fill-foreground text-xl font-bold font-mono">{label}</tspan>
                            <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 14} className="fill-muted-foreground text-[10px]">{sublabel}</tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </PolarRadiusAxis>
              </RadialBarChart>
            </ChartContainer>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-popover text-popover-foreground border shadow-lg px-3 py-2">
          <p className="text-xs font-mono">{detail}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
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
  const budgetPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const overBudget = budgetAlerts.filter(b => b.spent > b.limit && b.limit > 0);

  const categoryChartData = useMemo(() =>
    categorySpendData
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6)
      .map(c => {
        const budget = budgetAlerts.find(b => b.category === c.label);
        return { category: c.label, amount: Math.round(c.amount), budget: budget?.limit ?? 0 };
      }),
    [categorySpendData, budgetAlerts]
  );

  const categoryChartConfig: ChartConfig = useMemo(() => {
    const cfg: ChartConfig = {};
    categoryChartData.forEach((c) => {
      cfg[c.category] = { label: c.category, color: CATEGORY_BAR_COLORS[c.category.toLowerCase()] ?? '#a1a1aa' };
    });
    cfg.amount = { label: 'Spent' };
    return cfg;
  }, [categoryChartData]);

  const monthStr = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-5">
        <OnboardingBanner simplefinConfigured={simplefinConfigured} accountCount={accountCount} billCount={rawBillCount} hasBudget={hasBudget} />
        <NewSubscriptionsBanner />
        <MatchBanner matches={enrichedMatches} />

        {/* ── Hero KPI Row: 3 radial cards with tooltips ── */}
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
                  max={monthlyBills.length || 1}
                  label={`${paidCount}/${monthlyBills.length}`}
                  sublabel="paid"
                  detail={`${paidCount} paid · ${monthlyBills.length - paidCount} remaining · ${USD0.format(summary.totalOwedThisMonth)} owed`}
                  color="var(--chart-2)"
                />
              </CardContent>
              <CardFooter className="pt-0 pb-4 px-4 flex-col items-start gap-1">
                <div className="flex items-center gap-2 text-xs font-medium">
                  {monthlyBills.length - paidCount > 0 ? (
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">
                      {monthlyBills.length - paidCount} remaining
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

        {/* ── Over-budget alerts ── */}
        {overBudget.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {overBudget.slice(0, 2).map(b => {
              const pct = Math.round((b.spent / b.limit) * 100);
              return (
                <Card key={b.category} className="ring-red-500/20">
                  <CardContent className="p-4 flex items-start gap-3">
                    <Avatar className="w-9 h-9 shrink-0">
                      <AvatarFallback className="bg-red-500/15 text-red-400 text-xs font-bold">
                        {CATEGORY_ICONS[b.category.toLowerCase()] ?? '!'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div>
                        <p className="text-[13px] font-semibold text-foreground">{b.category} over budget</p>
                        <p className="text-xs text-muted-foreground">
                          {USD0.format(b.spent)} of {USD0.format(b.limit)} · {pct}%
                        </p>
                      </div>
                      <Progress value={Math.min(pct, 100)} className="h-1.5 bg-red-500/10 [&>div]:bg-red-400" />
                      <a href="/budget" className="inline-block text-[11px] font-semibold text-red-400 hover:text-red-300">Review →</a>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}


        {/* ── Spending by Category (horizontal bar chart with tooltip) ── */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">Spending by Category</CardTitle>
                <CardDescription className="text-[11px] font-mono">{monthStr}</CardDescription>
              </div>
              {totalBudget > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Badge variant="secondary" className={`text-[10px] font-mono cursor-default ${budgetPct > 100 ? 'bg-red-500/10 text-red-400' : budgetPct > 80 ? 'bg-amber-500/10 text-amber-400' : 'bg-green-500/10 text-green-400'}`}>
                        {budgetPct}% of total budget
                      </Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-popover text-popover-foreground border shadow-lg px-3 py-2">
                    <p className="text-xs font-mono">{USD0.format(totalSpent)} spent of {USD0.format(totalBudget)} total budget</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {categoryChartData.length === 0 ? (
              <p className="text-[11px] text-muted-foreground font-mono text-center py-8">No spending data yet</p>
            ) : (
              <ChartContainer config={categoryChartConfig} className="w-full" style={{ height: Math.max(categoryChartData.length * 44, 120) }}>
                <BarChart data={categoryChartData} layout="vertical" margin={{ left: 8, right: 60 }}>
                  <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="category" hide />
                  <ChartTooltip
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    content={<ChartTooltipContent
                      formatter={(value: unknown, name: unknown, item: { payload?: Record<string, unknown> }) => {
                        const budget = Number(item.payload?.budget ?? 0);
                        return (
                          <span className="font-mono">
                            {USD0.format(Number(value))}
                            {budget > 0 && <span className="text-muted-foreground"> of {USD0.format(budget)} budget</span>}
                          </span>
                        );
                      }}
                    />}
                  />
                  <Bar dataKey="amount" radius={6} barSize={26} animationDuration={2400} animationEasing="ease-out">
                    {categoryChartData.map((entry, i) => (
                      <Cell key={entry.category} fill={CATEGORY_BAR_COLORS[entry.category.toLowerCase()] ?? BAR_COLORS_ORDERED[i % BAR_COLORS_ORDERED.length]} fillOpacity={0.85} />
                    ))}
                    <LabelList dataKey="amount" position="right" offset={10} className="fill-foreground text-[11px] font-mono" formatter={(v: unknown) => USD0.format(Number(v))} />
                    <LabelList dataKey="category" position="insideLeft" offset={12} className="fill-white text-[11px] font-semibold capitalize" />
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
          {priceAlerts.length > 0 && (
            <CardFooter className="px-4 pb-4 pt-0">
              <div className="w-full border-t border-border pt-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <a href="/recurring?tab=price-watch" className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors shrink-0">Price changes →</a>
                  {priceAlerts.slice(0, 3).map(a => {
                    const delta = a.newAmount - a.oldAmount;
                    const up = delta > 0;
                    return (
                      <Tooltip key={a.name}>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className={`text-[10px] font-mono cursor-default gap-1 ${up ? 'text-red-400 border-red-500/25' : 'text-green-400 border-green-500/25'}`}>
                            {a.name} <span className="font-bold">{up ? '↑' : '↓'}{USD.format(Math.abs(delta))}</span>
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="bg-popover text-popover-foreground border shadow-lg px-3 py-2">
                          <p className="text-xs font-mono">{USD.format(a.oldAmount)} → {USD.format(a.newAmount)}/mo</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            </CardFooter>
          )}
        </Card>

        {/* ── Bottom Grid: Upcoming Bills + Recent Transactions ── */}
        <div className="grid grid-cols-2 gap-4">
          {/* Upcoming Bills */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Upcoming Bills</CardTitle>
                {billAlerts.some(a => a.isOverdue || a.daysUntilDue <= 3) && (
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">
                    Needs attention
                  </Badge>
                )}
              </div>
              <CardDescription className="text-[10px] font-mono">Next 14 days</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {billAlerts.length === 0 ? (
                <p className="text-[11px] text-muted-foreground font-mono text-center py-8">No upcoming bills</p>
              ) : (
                <div className="space-y-0">
                  {billAlerts
                    .filter(a => a.daysUntilDue >= 0)
                    .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
                    .slice(0, 5)
                    .map((bill, i) => {
                      const dueDate = new Date();
                      dueDate.setDate(dueDate.getDate() + bill.daysUntilDue);
                      const urgent = bill.isOverdue || bill.daysUntilDue <= 3;
                      const daysInCycle = 30;
                      const elapsed = daysInCycle - bill.daysUntilDue;
                      const progressPct = Math.min(Math.max((elapsed / daysInCycle) * 100, 0), 100);
                      return (
                        <PanelTrigger key={bill.name} type="bill-detail" arg={bill.name}>
                          <div className={`py-3 cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded-md transition-colors ${i > 0 ? 'border-t border-border' : ''}`}>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8 shrink-0">
                                <AvatarFallback className={`text-[10px] font-bold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                                  {getInitials(bill.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-medium text-foreground truncate">{bill.name}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  {dueDate.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                </div>
                              </div>
                              <div className="font-mono text-[13px] font-semibold text-foreground shrink-0">{USD.format(bill.amount)}</div>
                              <Badge variant="outline" className={`text-[9px] shrink-0 ${urgent ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'text-muted-foreground'}`}>
                                {bill.isOverdue ? 'Late' : `${bill.daysUntilDue}d`}
                              </Badge>
                            </div>
                            <div className="mt-2 ml-11">
                              <Progress
                                value={progressPct}
                                className={`h-1 ${urgent ? 'bg-amber-500/10 [&>div]:bg-amber-400' : 'bg-muted [&>div]:bg-muted-foreground/40'}`}
                              />
                            </div>
                          </div>
                        </PanelTrigger>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Recent Activity</CardTitle>
                <a href="/transactions" className="text-[11px] font-semibold text-muted-foreground hover:text-foreground font-mono transition-colors">All →</a>
              </div>
              <CardDescription className="text-[10px] font-mono">Last 7 days</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {recentTransactions.length === 0 ? (
                <p className="text-[11px] text-muted-foreground font-mono text-center py-8">No transactions — sync to load</p>
              ) : (
                <div className="space-y-0">
                  {recentTransactions.slice(0, 6).map((t, i) => {
                    const amt = Number(t.amount);
                    const pos = amt >= 0;
                    const date = t.posted
                      ? (t.posted instanceof Date ? t.posted : new Date(Number(t.posted) * 1000))
                          .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : '';
                    const cat = t.category?.toLowerCase() ?? '';
                    return (
                      <PanelTrigger key={t._id} type="transaction" arg={i}>
                        <div className={`flex items-center gap-3 py-2.5 cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded-md transition-colors ${i > 0 ? 'border-t border-border' : ''}`}>
                          <Avatar className="w-8 h-8 shrink-0">
                            {t.merchantDomain && (
                              <AvatarImage
                                src={`https://www.google.com/s2/favicons?domain=${t.merchantDomain}&sz=32`}
                                alt={t.description}
                                className="p-1"
                              />
                            )}
                            <AvatarFallback className={`text-sm ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                              {CATEGORY_ICONS[cat] ?? '·'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium text-foreground truncate">{t.description}</div>
                            <div className="text-[10px] text-muted-foreground font-mono mt-0.5 capitalize">{t.category ?? 'Uncategorized'}</div>
                          </div>
                          <div className={`font-mono text-[13px] font-semibold shrink-0 ${pos ? 'text-green-400' : 'text-foreground'}`}>
                            {pos ? '+' : '−'}{USD.format(Math.abs(amt))}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono shrink-0 w-12 text-right">{date}</div>
                        </div>
                      </PanelTrigger>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
