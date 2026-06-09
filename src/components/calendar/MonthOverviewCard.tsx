'use client';

import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MONTHS, USD0, type CalDay } from './calendarHelpers';

interface MonthOverviewCardProps {
  curMonth: number;
  curYear: number;
  allMonthBills: CalDay[];
  daysInMonth: number;
  billDayCount: number;
  onAddBill: () => void;
}

export function MonthOverviewCard({ curMonth, curYear, allMonthBills, daysInMonth, billDayCount, onAddBill }: MonthOverviewCardProps) {
  const calTotalAmount = allMonthBills.reduce((s, b) => s + b.amount, 0);
  const calPaidAmount = allMonthBills.filter(b => b.status === 'paid').reduce((s, b) => s + b.amount, 0);
  const calRemaining = calTotalAmount - calPaidAmount;
  const calAutoCount = allMonthBills.filter(b => b.isAutoPay).length;
  const calAutoPct = allMonthBills.length > 0 ? Math.round((calAutoCount / allMonthBills.length) * 100) : 0;
  const calClearDays = daysInMonth - billDayCount;
  const calManualCount = allMonthBills.length - calAutoCount;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardDescription className="text-[10px] font-mono uppercase tracking-wider">
              {MONTHS[curMonth]} {curYear}
            </CardDescription>
            <CardTitle className="text-xl mt-1">
              {allMonthBills.length} bill{allMonthBills.length !== 1 ? 's' : ''} this month
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {USD0.format(calTotalAmount)} total · {calAutoCount} autopaid · {calManualCount} manual
            </p>
          </div>
          <Button onClick={onAddBill} size="sm" className="shrink-0">
            + Add bill
          </Button>
        </div>
        <div className="grid grid-cols-4 mt-4 rounded-lg border border-border overflow-hidden" style={{ gap: 1, background: 'hsl(var(--border))' }}>
          {[
            { label: 'Paid',       value: USD0.format(calPaidAmount), cls: 'text-green-400' },
            { label: 'Remaining',  value: USD0.format(calRemaining),  cls: 'text-amber-400' },
            { label: 'Autopay',    value: `${calAutoPct}%`,           cls: 'text-foreground' },
            { label: 'Clear days', value: String(calClearDays),       cls: 'text-foreground' },
          ].map(({ label, value, cls }) => (
            <div key={label} className="bg-background px-3 py-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
              <div className={`text-base font-medium font-mono ${cls}`}>{value}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
