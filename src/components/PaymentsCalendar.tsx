'use client';

import { useState } from 'react';
import type { BillResponse } from '@/types/bill';
import { Button } from '@/components/ui/button';
import {
  MONTHS, STATUS_DOT, STATUS_LABEL,
  getBillsForMonth, getBillsForDate, toSunday,
  type BillStatus, type CalView, type CalDay, type Cell, type Today,
} from './calendar/calendarHelpers';
import { DayDialog } from './calendar/DayDialog';
import { MonthOverviewCard } from './calendar/MonthOverviewCard';
import { CalendarGrid } from './calendar/CalendarGrid';
import { WeekGrid } from './calendar/WeekGrid';

interface Props {
  bills: BillResponse[];
  today: Today;
  onAddBill: () => void;
}

type SelDate = Today | null;

export function PaymentsCalendar({ bills, today, onAddBill }: Props) {
  const [calView, setCalView] = useState<CalView>('month');
  const [curMonth, setCurMonth] = useState(today.m);
  const [curYear, setCurYear] = useState(today.y);
  const [weekStart, setWeekStart] = useState(() => toSunday(today.y, today.m, today.d));
  const [selDate, setSelDate] = useState<SelDate>(null);

  function prevMonth() {
    if (curMonth === 0) { setCurMonth(11); setCurYear(y => y - 1); }
    else setCurMonth(m => m - 1);
  }
  function nextMonth() {
    if (curMonth === 11) { setCurMonth(0); setCurYear(y => y + 1); }
    else setCurMonth(m => m + 1);
  }
  function shiftWeek(delta: number) {
    setWeekStart(ws => {
      const d = new Date(ws.y, ws.m, ws.d + delta);
      return { d: d.getDate(), m: d.getMonth(), y: d.getFullYear() };
    });
  }
  function switchView(v: CalView) {
    if (v === 'week') {
      const ref = selDate ?? { d: 1, m: curMonth, y: curYear };
      setWeekStart(toSunday(ref.y, ref.m, ref.d));
    } else {
      setCurMonth(weekStart.m);
      setCurYear(weekStart.y);
    }
    setCalView(v);
  }

  const weekEndDate = new Date(weekStart.y, weekStart.m, weekStart.d + 6);
  const wed = { d: weekEndDate.getDate(), m: weekEndDate.getMonth(), y: weekEndDate.getFullYear() };
  const weekLabel = weekStart.m === wed.m
    ? `${MONTHS[weekStart.m]!.slice(0, 3)} ${weekStart.d}–${wed.d}, ${weekStart.y}`
    : `${MONTHS[weekStart.m]!.slice(0, 3)} ${weekStart.d} – ${MONTHS[wed.m]!.slice(0, 3)} ${wed.d}, ${wed.y}`;
  const navLabel = calView === 'month' ? `${MONTHS[curMonth]} ${curYear}` : weekLabel;

  const detailBills = selDate ? getBillsForDate(bills, selDate.y, selDate.m, selDate.d, today) : [];
  const isSelToday = selDate !== null && selDate.d === today.d && selDate.m === today.m && selDate.y === today.y;

  const billsByDay = getBillsForMonth(bills, curMonth, curYear, today);
  const firstDow = new Date(curYear, curMonth, 1).getDay();
  const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
  const prevMonthEnd = new Date(curYear, curMonth, 0).getDate();
  const totalCells = firstDow + daysInMonth > 35 ? 42 : 35;
  const totalRows = totalCells / 7;

  const cells: Cell[] = [];
  for (let i = 0; i < totalCells; i++) {
    if (i < firstDow) cells.push({ day: prevMonthEnd - (firstDow - 1 - i), type: 'prev' });
    else if (i >= firstDow + daysInMonth) cells.push({ day: i - firstDow - daysInMonth + 1, type: 'next' });
    else cells.push({ day: i - firstDow + 1, type: 'cur' });
  }

  const allMonthBills: CalDay[] = [];
  billsByDay.forEach(dayBills => allMonthBills.push(...dayBills));

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart.y, weekStart.m, weekStart.d + i);
    return { d: d.getDate(), m: d.getMonth(), y: d.getFullYear() };
  });

  return (
    <div className="w-full space-y-4">
      <MonthOverviewCard
        curMonth={curMonth}
        curYear={curYear}
        allMonthBills={allMonthBills}
        daysInMonth={daysInMonth}
        billDayCount={billsByDay.size}
        onAddBill={onAddBill}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => calView === 'month' ? prevMonth() : shiftWeek(-7)}>
            <span className="text-sm">&#8249;</span>
          </Button>
          <span className="text-sm font-semibold text-foreground min-w-[160px] text-center">{navLabel}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => calView === 'month' ? nextMonth() : shiftWeek(7)}>
            <span className="text-sm">&#8250;</span>
          </Button>
        </div>

        <div className="flex items-center gap-5">
          <div className="hidden md:flex items-center gap-4">
            {(['paid', 'autopay', 'upcoming', 'overdue'] as BillStatus[]).map(s => (
              <span key={s} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`} />
                {STATUS_LABEL[s]}
              </span>
            ))}
          </div>
          <div className="flex bg-muted/50 rounded-md p-0.5 gap-0.5">
            <button
              onClick={() => switchView('month')}
              className={`text-xs font-medium px-3 py-1.5 rounded transition-colors ${calView === 'month' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Month
            </button>
            <button
              onClick={() => switchView('week')}
              className={`text-xs font-medium px-3 py-1.5 rounded transition-colors ${calView === 'week' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Week
            </button>
          </div>
        </div>
      </div>

      {calView === 'month' && (
        <CalendarGrid
          cells={cells}
          billsByDay={billsByDay}
          today={today}
          curMonth={curMonth}
          curYear={curYear}
          totalRows={totalRows}
          setSelDate={setSelDate}
        />
      )}

      {calView === 'week' && (
        <WeekGrid
          weekDays={weekDays}
          bills={bills}
          today={today}
          weekStart={weekStart}
          setSelDate={setSelDate}
        />
      )}

      <DayDialog
        open={selDate !== null}
        onClose={() => setSelDate(null)}
        day={selDate?.d ?? 1}
        month={selDate?.m ?? 0}
        year={selDate?.y ?? 2026}
        bills={detailBills}
        isToday={isSelToday}
      />
    </div>
  );
}
