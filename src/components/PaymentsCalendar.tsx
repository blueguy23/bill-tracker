'use client';

import { useState } from 'react';
import type { BillResponse } from '@/types/bill';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

type BillStatus = 'paid' | 'autopay' | 'upcoming' | 'overdue';
type CalView   = 'month' | 'week';

interface CalDay {
  id: string;
  name: string;
  category: string;
  amount: number;
  status: BillStatus;
  isAutoPay: boolean;
}

const STATUS_VARIANT: Record<BillStatus, string> = {
  paid:     'bg-green-500/15 text-green-400 border-green-500/25',
  autopay:  'bg-purple-500/15 text-purple-400 border-purple-500/25',
  upcoming: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
  overdue:  'bg-red-500/15 text-red-400 border-red-500/25',
};

const STATUS_DOT: Record<BillStatus, string> = {
  paid: 'bg-green-400', autopay: 'bg-purple-400', upcoming: 'bg-zinc-400', overdue: 'bg-red-400',
};

const STATUS_LABEL: Record<BillStatus, string> = {
  paid: 'Paid', autopay: 'Autopay', upcoming: 'Upcoming', overdue: 'Overdue',
};

const AVATAR_COLORS: Record<BillStatus, string> = {
  paid: 'bg-green-500/15 text-green-400',
  autopay: 'bg-purple-500/15 text-purple-400',
  upcoming: 'bg-zinc-500/15 text-zinc-300',
  overdue: 'bg-red-500/15 text-red-400',
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW    = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const USD0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// ─── helpers ────────────────────────────────────────────────────────────────

function billStatus(
  bill: BillResponse, day: number, month: number, year: number,
  today: { d: number; m: number; y: number },
): BillStatus {
  if (bill.isPaid) return 'paid';
  const isCurrentMonth = month === today.m && year === today.y;
  if (isCurrentMonth && day < today.d) return bill.isAutoPay ? 'autopay' : 'overdue';
  return bill.isAutoPay ? 'autopay' : 'upcoming';
}

function getBillsForMonth(
  bills: BillResponse[], month: number, year: number,
  today: { d: number; m: number; y: number },
): Map<number, CalDay[]> {
  const map = new Map<number, CalDay[]>();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function add(day: number, bill: BillResponse, status: BillStatus) {
    if (day < 1 || day > daysInMonth) return;
    const existing = map.get(day) ?? [];
    map.set(day, [...existing, { id: bill._id, name: bill.name, category: bill.category, amount: bill.amount, status, isAutoPay: bill.isAutoPay }]);
  }

  for (const bill of bills) {
    if (bill.isRecurring && bill.recurrenceInterval === 'yearly') {
      if (typeof bill.dueDate !== 'string') continue;
      const d = new Date(bill.dueDate);
      if (isNaN(d.getTime()) || d.getMonth() !== month) continue;
      const day = d.getDate();
      add(day, bill, billStatus(bill, day, month, year, today));
    } else if (bill.isRecurring) {
      if (typeof bill.dueDate !== 'number') continue;
      add(bill.dueDate, bill, billStatus(bill, bill.dueDate, month, year, today));
    } else {
      if (typeof bill.dueDate !== 'string') continue;
      const d = new Date(bill.dueDate);
      if (isNaN(d.getTime()) || d.getMonth() !== month || d.getFullYear() !== year) continue;
      const day = d.getDate();
      add(day, bill, billStatus(bill, day, month, year, today));
    }
  }
  return map;
}

function getBillsForDate(
  bills: BillResponse[], year: number, month: number, day: number,
  today: { d: number; m: number; y: number },
): CalDay[] {
  const result: CalDay[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  if (day < 1 || day > daysInMonth) return result;

  for (const bill of bills) {
    if (bill.isRecurring && bill.recurrenceInterval === 'yearly') {
      if (typeof bill.dueDate !== 'string') continue;
      const d = new Date(bill.dueDate);
      if (isNaN(d.getTime()) || d.getMonth() !== month || d.getDate() !== day) continue;
    } else if (bill.isRecurring) {
      if (typeof bill.dueDate !== 'number') continue;
      if (bill.dueDate !== day) continue;
    } else {
      if (typeof bill.dueDate !== 'string') continue;
      const d = new Date(bill.dueDate);
      if (isNaN(d.getTime()) || d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) continue;
    }
    result.push({ id: bill._id, name: bill.name, category: bill.category, amount: bill.amount, status: billStatus(bill, day, month, year, today), isAutoPay: bill.isAutoPay });
  }
  return result;
}

// ─── Day Detail Dialog ───────────────────────────────────────────────────────

interface DayDialogProps {
  open: boolean;
  onClose: () => void;
  day: number; month: number; year: number;
  bills: CalDay[];
  isToday: boolean;
}

function DayDialog({ open, onClose, day, month, year, bills, isToday }: DayDialogProps) {
  const dateStr = `${MONTHS[month]} ${day}, ${year}`;
  const total = bills.reduce((s, b) => s + b.amount, 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md bg-background border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {isToday && <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/25 text-[9px]">Today</Badge>}
            {dateStr}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {bills.length === 0
              ? 'No bills due — clear day'
              : `${bills.length} bill${bills.length !== 1 ? 's' : ''} · ${USD.format(total)} total`}
          </DialogDescription>
        </DialogHeader>

        {bills.length > 0 && (
          <div className="mt-2 space-y-0">
            {bills.map((bill, i) => (
              <div key={bill.id} className={`flex items-center gap-3 py-3 ${i > 0 ? 'border-t border-border' : ''}`}>
                <Avatar className="w-9 h-9 shrink-0">
                  <AvatarFallback className={`text-xs font-bold ${AVATAR_COLORS[bill.status]}`}>
                    {bill.name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-foreground truncate">{bill.name}</span>
                    <Badge variant="outline" className={`text-[9px] font-mono shrink-0 ${STATUS_VARIANT[bill.status]}`}>
                      {STATUS_LABEL[bill.status]}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {bill.category} · {bill.isAutoPay ? 'Autopay' : 'Manual'}
                  </div>
                </div>
                <div className="font-mono text-[13px] font-semibold text-foreground shrink-0">
                  {USD.format(bill.amount)}
                </div>
              </div>
            ))}
          </div>
        )}

        {bills.length > 0 && (
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground font-mono">Total due</span>
            <span className="text-sm font-semibold font-mono text-foreground">{USD.format(total)}</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface Props {
  bills: BillResponse[];
  today: { d: number; m: number; y: number };
  onAddBill: () => void;
}

type SelDate = { d: number; m: number; y: number } | null;

function toSunday(y: number, m: number, d: number): { d: number; m: number; y: number } {
  const date = new Date(y, m, d);
  date.setDate(date.getDate() - date.getDay());
  return { d: date.getDate(), m: date.getMonth(), y: date.getFullYear() };
}

export function PaymentsCalendar({ bills, today, onAddBill }: Props) {
  const [calView, setCalView]       = useState<CalView>('month');
  const [curMonth, setCurMonth]     = useState(today.m);
  const [curYear, setCurYear]       = useState(today.y);
  const [weekStart, setWeekStart]   = useState(() => toSunday(today.y, today.m, today.d));
  const [selDate, setSelDate]       = useState<SelDate>(null);

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

  // Nav label
  const weekEndDate = new Date(weekStart.y, weekStart.m, weekStart.d + 6);
  const wed = { d: weekEndDate.getDate(), m: weekEndDate.getMonth(), y: weekEndDate.getFullYear() };
  const weekLabel = weekStart.m === wed.m
    ? `${MONTHS[weekStart.m]!.slice(0, 3)} ${weekStart.d}–${wed.d}, ${weekStart.y}`
    : `${MONTHS[weekStart.m]!.slice(0, 3)} ${weekStart.d} – ${MONTHS[wed.m]!.slice(0, 3)} ${wed.d}, ${wed.y}`;
  const navLabel = calView === 'month' ? `${MONTHS[curMonth]} ${curYear}` : weekLabel;

  // Detail dialog data
  const detailBills = selDate ? getBillsForDate(bills, selDate.y, selDate.m, selDate.d, today) : [];
  const isSelToday  = selDate !== null && selDate.d === today.d && selDate.m === today.m && selDate.y === today.y;

  // Month grid data
  const billsByDay  = getBillsForMonth(bills, curMonth, curYear, today);
  const firstDow    = new Date(curYear, curMonth, 1).getDay();
  const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
  const prevMonthEnd = new Date(curYear, curMonth, 0).getDate();
  const totalCells  = firstDow + daysInMonth > 35 ? 42 : 35;
  const totalRows   = totalCells / 7;

  type Cell = { day: number; type: 'prev' | 'cur' | 'next' };
  const cells: Cell[] = [];
  for (let i = 0; i < totalCells; i++) {
    if (i < firstDow) cells.push({ day: prevMonthEnd - (firstDow - 1 - i), type: 'prev' });
    else if (i >= firstDow + daysInMonth) cells.push({ day: i - firstDow - daysInMonth + 1, type: 'next' });
    else cells.push({ day: i - firstDow + 1, type: 'cur' });
  }

  const STATUS_PRIORITY: BillStatus[] = ['overdue', 'upcoming', 'autopay', 'paid'];
  function dominantStatus(dayBills: CalDay[]): BillStatus {
    for (const s of STATUS_PRIORITY) if (dayBills.some(b => b.status === s)) return s;
    return 'paid';
  }

  // Week grid data
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart.y, weekStart.m, weekStart.d + i);
    return { d: d.getDate(), m: d.getMonth(), y: d.getFullYear() };
  });

  // Calendar stats
  const allMonthBills: CalDay[] = [];
  billsByDay.forEach(dayBills => allMonthBills.push(...dayBills));
  const calTotalAmount = allMonthBills.reduce((s, b) => s + b.amount, 0);
  const calPaidAmount  = allMonthBills.filter(b => b.status === 'paid').reduce((s, b) => s + b.amount, 0);
  const calRemaining   = calTotalAmount - calPaidAmount;
  const calAutoCount   = allMonthBills.filter(b => b.isAutoPay).length;
  const calAutoPct     = allMonthBills.length > 0 ? Math.round((calAutoCount / allMonthBills.length) * 100) : 0;
  const calClearDays   = daysInMonth - billsByDay.size;
  const calManualCount = allMonthBills.length - calAutoCount;

  return (
    <div className="w-full space-y-4">

      {/* Month overview hero */}
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

      {/* Nav bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => calView === 'month' ? prevMonth() : shiftWeek(-7)}>
            <span className="text-sm">‹</span>
          </Button>
          <span className="text-sm font-semibold text-foreground min-w-[160px] text-center">{navLabel}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => calView === 'month' ? nextMonth() : shiftWeek(7)}>
            <span className="text-sm">›</span>
          </Button>
        </div>

        <div className="flex items-center gap-5">
          {/* Legend */}
          <div className="hidden md:flex items-center gap-4">
            {(['paid', 'autopay', 'upcoming', 'overdue'] as BillStatus[]).map(s => (
              <span key={s} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`} />
                {STATUS_LABEL[s]}
              </span>
            ))}
          </div>
          {/* View toggle */}
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

      {/* Month grid */}
      {calView === 'month' && (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7">
            {DOW.map((d, idx) => (
              <div key={d} className={`bg-muted/50 text-center py-2.5 px-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider font-mono ${idx < 6 ? 'border-r border-border' : ''} border-b border-border`}>
                {d}
              </div>
            ))}
            {cells.map((cell, i) => {
              const col         = i % 7;
              const row         = Math.floor(i / 7);
              const isOther     = cell.type !== 'cur';
              const isTodayCell = !isOther && cell.day === today.d && curMonth === today.m && curYear === today.y;
              const dayBills    = !isOther ? (billsByDay.get(cell.day) ?? []) : [];
              const hasBill     = dayBills.length > 0;
              const dom         = hasBill ? dominantStatus(dayBills) : null;

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
      )}

      {/* Week grid */}
      {calView === 'week' && (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7">
            {weekDays.map(({ d, m, y }, idx) => {
              const isTodayCol = d === today.d && m === today.m && y === today.y;
              const dayBills   = getBillsForDate(bills, y, m, d, today);
              const hasBill    = dayBills.length > 0;
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
      )}

      {/* Day detail dialog */}
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
