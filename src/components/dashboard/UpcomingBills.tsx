'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { PanelTrigger } from '@/components/PanelTrigger';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const AVATAR_COLORS = ['bg-orange-500/20 text-orange-400', 'bg-purple-500/20 text-purple-400', 'bg-pink-500/20 text-pink-400', 'bg-emerald-500/20 text-emerald-400', 'bg-indigo-500/20 text-indigo-400', 'bg-amber-500/20 text-amber-400'];

function getInitials(name: string): string {
  return name.split(/[\s-]+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

interface BillAlert { name: string; amount: number; daysUntilDue: number; isOverdue: boolean }

interface UpcomingBillsProps {
  billAlerts: BillAlert[];
}

export function UpcomingBills({ billAlerts }: UpcomingBillsProps) {
  return (
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
  );
}
