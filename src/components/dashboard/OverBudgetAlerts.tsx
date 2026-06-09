'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

const USD0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const CATEGORY_ICONS: Record<string, string> = {
  food: '🍕', transport: '🚗', shopping: '🛒', entertainment: '🎬',
  utilities: '⚡', subscriptions: '↻', rent: '🏠', insurance: '🛡',
  health: '💊', loans: '💳', other: '·',
};

interface BudgetAlert {
  category: string;
  spent: number;
  limit: number;
}

interface OverBudgetAlertsProps {
  overBudget: BudgetAlert[];
}

export function OverBudgetAlerts({ overBudget }: OverBudgetAlertsProps) {
  if (overBudget.length === 0) return null;

  return (
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
  );
}
