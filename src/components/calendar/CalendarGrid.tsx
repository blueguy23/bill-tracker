'use client';

import { Card } from '@/components/ui/card';
import { DOW, STATUS_VARIANT, STATUS_DOT, dominantStatus, type CalDay, type Cell, type Today } from './calendarHelpers';

interface CalendarGridProps {
  cells: Cell[];
  billsByDay: Map<number, CalDay[]>;
  today: Today;
  curMonth: number;
  curYear: number;
  totalRows: number;
  setSelDate: (date: { d: number; m: number; y: number }) => void;
}

export function CalendarGrid({ cells, billsByDay, today, curMonth, curYear, totalRows, setSelDate }: CalendarGridProps) {
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7">
        {DOW.map((d, idx) => (
          <div key={d} className={`bg-muted/50 text-center py-2.5 px-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider font-mono ${idx < 6 ? 'border-r border-border' : ''} border-b border-border`}>
            {d}
          </div>
        ))}
        {cells.map((cell, i) => {
          const col = i % 7;
          const row = Math.floor(i / 7);
          const isOther = cell.type !== 'cur';
          const isTodayCell = !isOther && cell.day === today.d && curMonth === today.m && curYear === today.y;
          const dayBills = !isOther ? (billsByDay.get(cell.day) ?? []) : [];
          const hasBill = dayBills.length > 0;
          const dom = hasBill ? dominantStatus(dayBills) : null;

          return (
            <div
              key={i}
              onClick={() => !isOther && setSelDate({ d: cell.day, m: curMonth, y: curYear })}
              className={`min-h-[96px] p-2 cursor-pointer transition-colors hover:bg-muted/30 ${isOther ? 'opacity-25 cursor-default' : ''} ${col < 6 ? 'border-r border-border' : ''} ${row < totalRows - 1 ? 'border-b border-border' : ''} ${isTodayCell ? 'bg-blue-500/[0.04] ring-1 ring-inset ring-blue-500/20' : ''}`}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                {isTodayCell ? (
                  <span className="w-[22px] h-[22px] rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold font-mono">
                    {cell.day}
                  </span>
                ) : (
                  <span className={`text-[13px] font-mono ${hasBill ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                    {cell.day}
                  </span>
                )}
                {dom && <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[dom]}`} />}
              </div>
              {dayBills.slice(0, 2).map(b => (
                <div key={b.id} className={`rounded px-1.5 py-0.5 text-[10px] font-mono mb-0.5 truncate border ${STATUS_VARIANT[b.status]}`}>
                  {b.name.split(' ')[0]} · ${b.amount % 1 === 0 ? b.amount : b.amount.toFixed(2)}
                </div>
              ))}
              {dayBills.length > 2 && (
                <div className="rounded px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted/50 border border-border">
                  +{dayBills.length - 2} more
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
