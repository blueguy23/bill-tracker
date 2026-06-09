'use client';

import type { BillResponse } from '@/types/bill';
import { Card } from '@/components/ui/card';
import { DOW, MONTHS, USD, STATUS_VARIANT, getBillsForDate, type Today } from './calendarHelpers';

interface WeekGridProps {
  weekDays: Today[];
  bills: BillResponse[];
  today: Today;
  weekStart: Today;
  setSelDate: (date: { d: number; m: number; y: number }) => void;
}

export function WeekGrid({ weekDays, bills, today, weekStart, setSelDate }: WeekGridProps) {
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7">
        {weekDays.map(({ d, m, y }, idx) => {
          const isTodayCol = d === today.d && m === today.m && y === today.y;
          const dayBills = getBillsForDate(bills, y, m, d, today);
          const hasBill = dayBills.length > 0;
          const crossMonth = m !== weekStart.m;

          return (
            <div
              key={idx}
              onClick={() => setSelDate({ d, m, y })}
              className={`flex flex-col cursor-pointer transition-colors hover:bg-muted/30 ${idx < 6 ? 'border-r border-border' : ''} ${isTodayCol ? 'bg-blue-500/[0.04]' : ''}`}
            >
              <div className="bg-muted/50 border-b border-border px-2 py-2.5 text-center">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-1">
                  {DOW[idx]}
                </div>
                {isTodayCol ? (
                  <span className="w-[26px] h-[26px] rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center text-[13px] font-bold font-mono">
                    {d}
                  </span>
                ) : (
                  <span className={`text-sm font-mono ${hasBill ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                    {d}
                  </span>
                )}
                {crossMonth && (
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5 opacity-70">
                    {MONTHS[m]!.slice(0, 3)}
                  </div>
                )}
              </div>

              <div className="p-1.5 flex flex-col flex-1 min-h-[120px]">
                {dayBills.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground/50 pt-1">—</div>
                ) : (
                  dayBills.map(b => (
                    <div key={b.id} className={`rounded px-1.5 py-0.5 text-[10px] font-mono mb-0.5 truncate border ${STATUS_VARIANT[b.status]}`}>
                      {b.name.split(' ')[0]} · {USD.format(b.amount)}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
