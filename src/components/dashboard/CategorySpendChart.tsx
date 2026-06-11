'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const USD0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const CATEGORY_BAR_COLORS: Record<string, string> = {
  food: '#fb923c', transport: '#a1a1aa', shopping: '#c084fc',
  entertainment: '#f472b6', utilities: '#4ade80', subscriptions: '#818cf8',
  rent: '#fbbf24', insurance: '#34d399', health: '#22d3ee', loans: '#f87171',
  other: '#71717a',
};

const BAR_COLORS_ORDERED = ['#fb923c', '#c084fc', '#f472b6', '#4ade80', '#818cf8', '#fbbf24', '#34d399', '#22d3ee'];

interface BudgetAlert { category: string; spent: number; limit: number }
interface PriceAlert { name: string; oldAmount: number; newAmount: number; isSubscription: boolean }

interface CategorySpendChartProps {
  categorySpendData: Array<{ label: string; amount: number }>;
  budgetAlerts: BudgetAlert[];
  priceAlerts: PriceAlert[];
  totalBudget: number;
  totalSpent: number;
  monthStr: string;
}

export function CategorySpendChart({ categorySpendData, budgetAlerts, priceAlerts, totalBudget, totalSpent, monthStr }: CategorySpendChartProps) {
  const budgetPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

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

  return (
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
  );
}
