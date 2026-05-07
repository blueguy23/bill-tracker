'use client';

import { useState } from 'react';
import type { BillResponse } from '@/types/bill';

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

// Higher opacity bg/border so chips are legible in dark mode (#131318 surface)
const STATUS_COLOR: Record<BillStatus, { text: string; bg: string; border: string }> = {
  paid:     { text: '#22c55e', bg: 'rgba(34,197,94,0.18)',   border: 'rgba(34,197,94,0.35)' },
  autopay:  { text: '#a78bfa', bg: 'rgba(167,139,250,0.18)', border: 'rgba(167,139,250,0.35)' },
  upcoming: { text: '#60a5fa', bg: 'rgba(96,165,250,0.18)',  border: 'rgba(96,165,250,0.35)' },
  overdue:  { text: '#f87171', bg: 'rgba(248,113,113,0.18)', border: 'rgba(248,113,113,0.35)' },
};

const STATUS_LABEL: Record<BillStatus, string> = {
  paid: 'Paid', autopay: 'Autopay', upcoming: 'Upcoming', overdue: 'Overdue',
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW    = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

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
    let matches = false;
    if (bill.isRecurring && bill.recurrenceInterval === 'yearly') {
      if (typeof bill.dueDate !== 'string') continue;
      const d = new Date(bill.dueDate);
      matches = !isNaN(d.getTime()) && d.getMonth() === month && d.getDate() === day;
    } else if (bill.isRecurring) {
      if (typeof bill.dueDate !== 'number') continue;
      matches = bill.dueDate === day;
    } else {
      if (typeof bill.dueDate !== 'string') continue;
      const d = new Date(bill.dueDate);
      matches = !isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    }
    if (!matches) continue;
    result.push({ id: bill._id, name: bill.name, category: bill.category, amount: bill.amount, status: billStatus(bill, day, month, year, today), isAutoPay: bill.isAutoPay });
  }
  return result;
}

// ─── DayDetail (shared by both views) ───────────────────────────────────────

interface DayDetailProps {
  day: number; month: number; year: number;
  bills: CalDay[];
  isToday: boolean;
}

function DayDetail({ day, month, year, bills, isToday }: DayDetailProps) {
  const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const dateStr = `${MONTHS[month]} ${day}, ${year}`;
  const total = bills.reduce((s, b) => s + b.amount, 0);

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border-l)', borderRadius: 12, padding: '16px 20px', marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <span style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
            {isToday ? 'Today · ' : ''}{dateStr}
          </span>
          {bills.length > 0 && (
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--sans)', marginTop: 3 }}>
              {bills.length} bill{bills.length !== 1 ? 's' : ''} due
            </div>
          )}
        </div>
        {bills.length > 0 && (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 17, fontWeight: 300, color: 'var(--text)' }}>
            {usd.format(total)}
          </div>
        )}
      </div>
      {bills.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text2)', fontFamily: 'var(--sans)', padding: '8px 0' }}>No bills due — clear day</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {bills.map(bill => {
            const s = STATUS_COLOR[bill.status];
            return (
              <div key={bill.id} className="cal-detail-row" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 0', borderBottom: '1px solid var(--border-l)' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: s.bg, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: s.text, flexShrink: 0, fontFamily: 'var(--mono)' }}>
                  {bill.name[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bill.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.05em', padding: '2px 7px', borderRadius: 4, fontFamily: 'var(--mono)', background: s.bg, color: s.text, border: `1px solid ${s.border}`, flexShrink: 0 }}>
                      {STATUS_LABEL[bill.status]}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--sans)' }}>
                    {bill.category} · {bill.isAutoPay ? 'Autopay' : 'Manual'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 400, color: 'var(--text)' }}>{usd.format(bill.amount)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--sans)', marginTop: 2 }}>
                    {bill.status === 'paid' ? 'Paid' : isToday ? 'Due today' : 'Scheduled'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
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

const USD_CAL = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function PaymentsCalendar({ bills, today, onAddBill }: Props) {
  const [calView, setCalView]       = useState<CalView>('month');
  const [curMonth, setCurMonth]     = useState(today.m);
  const [curYear, setCurYear]       = useState(today.y);
  const [weekStart, setWeekStart]   = useState(() => toSunday(today.y, today.m, today.d));
  const [selDate, setSelDate]       = useState<SelDate>({ d: today.d, m: today.m, y: today.y });

  // ── Month nav ──
  function prevMonth() {
    if (curMonth === 0) { setCurMonth(11); setCurYear(y => y - 1); }
    else setCurMonth(m => m - 1);
    setSelDate(null);
  }
  function nextMonth() {
    if (curMonth === 11) { setCurMonth(0); setCurYear(y => y + 1); }
    else setCurMonth(m => m + 1);
    setSelDate(null);
  }

  // ── Week nav ──
  function shiftWeek(delta: number) {
    setWeekStart(ws => {
      const d = new Date(ws.y, ws.m, ws.d + delta);
      return { d: d.getDate(), m: d.getMonth(), y: d.getFullYear() };
    });
    setSelDate(null);
  }

  // ── View switching: jump to relevant period ──
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

  // ── Nav label ──
  const weekEndDate = new Date(weekStart.y, weekStart.m, weekStart.d + 6);
  const wed = { d: weekEndDate.getDate(), m: weekEndDate.getMonth(), y: weekEndDate.getFullYear() };
  const weekLabel = weekStart.m === wed.m
    ? `${MONTHS[weekStart.m]!.slice(0, 3)} ${weekStart.d}–${wed.d}, ${weekStart.y}`
    : `${MONTHS[weekStart.m]!.slice(0, 3)} ${weekStart.d} – ${MONTHS[wed.m]!.slice(0, 3)} ${wed.d}, ${wed.y}`;
  const navLabel = calView === 'month' ? `${MONTHS[curMonth]} ${curYear}` : weekLabel;

  // ── Detail panel data ──
  const detailBills   = selDate ? getBillsForDate(bills, selDate.y, selDate.m, selDate.d, today) : [];
  const isSelToday    = selDate !== null && selDate.d === today.d && selDate.m === today.m && selDate.y === today.y;

  // ── Month grid data ──
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

  // ── Week grid data ──
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart.y, weekStart.m, weekStart.d + i);
    return { d: d.getDate(), m: d.getMonth(), y: d.getFullYear() };
  });

  // ── Shared styles ──
  const navBtnStyle: React.CSSProperties = {
    background: 'var(--raised)', border: '1px solid var(--border-l)', borderRadius: 7,
    color: 'var(--text2)', cursor: 'pointer', fontSize: 17, lineHeight: 1,
    padding: '8px 14px', transition: 'background .15s',
  };
  const toggleBtnStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 12, fontWeight: active ? 600 : 400, fontFamily: 'var(--sans)',
    padding: '5px 13px', borderRadius: 5, border: 'none', cursor: 'pointer',
    transition: 'background .15s, color .15s',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--text2)',
  });
  const chipStyle = (s: typeof STATUS_COLOR[BillStatus]): React.CSSProperties => ({
    background: s.bg, border: `1px solid ${s.border}`, borderRadius: 4,
    padding: '3px 7px', fontSize: 11, fontWeight: 500, color: s.text,
    fontFamily: 'var(--mono)', marginBottom: 3,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  });

  const usd = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  // ── Calendar stats (for current month context) ──
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
    <div style={{ width: '100%' }}>

      {/* ── Month overview hero ── */}
      <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.06em', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4, fontFamily: 'var(--sans)' }}>
              {MONTHS[curMonth]} {curYear}
            </div>
            <div style={{ fontSize: 26, fontWeight: 600, lineHeight: 1, color: 'var(--text)', fontFamily: 'var(--sans)' }}>
              {allMonthBills.length} bill{allMonthBills.length !== 1 ? 's' : ''} this month
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 5, fontFamily: 'var(--sans)' }}>
              {USD_CAL.format(calTotalAmount)} total · {calAutoCount} autopaid · {calManualCount} manual
            </div>
          </div>
          <button onClick={onAddBill} style={{ background: 'var(--gold)', color: '#1a0a00', fontSize: 13, fontWeight: 500, padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            + Add bill
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 14 }}>
          {[
            { label: 'Paid',       value: USD_CAL.format(calPaidAmount), accent: 'var(--green)' },
            { label: 'Remaining',  value: USD_CAL.format(calRemaining),  accent: 'var(--gold)' },
            { label: 'Autopay',    value: `${calAutoPct}%`,              accent: 'var(--text)' },
            { label: 'Clear days', value: String(calClearDays),          accent: 'var(--text)' },
          ].map(({ label, value, accent }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text3)', marginBottom: 3, fontFamily: 'var(--sans)' }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 500, color: accent, fontFamily: 'var(--mono)' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Nav bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>

        {/* Left: prev / label / next */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => calView === 'month' ? prevMonth() : shiftWeek(-7)} aria-label="Previous" style={navBtnStyle}>‹</button>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--sans)', minWidth: 160, textAlign: 'center' }}>{navLabel}</span>
          <button onClick={() => calView === 'month' ? nextMonth() : shiftWeek(7)} aria-label="Next" style={navBtnStyle}>›</button>
        </div>

        {/* Right: legend + Month/Week toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            {(['paid', 'autopay', 'upcoming', 'overdue'] as BillStatus[]).map(s => (
              <span key={s} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text2)', fontFamily: 'var(--sans)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[s].text, display: 'inline-block', flexShrink: 0 }} />
                {STATUS_LABEL[s]}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', background: 'var(--raised)', border: '1px solid var(--border-l)', borderRadius: 7, padding: 2, gap: 2 }}>
            <button onClick={() => switchView('month')} style={toggleBtnStyle(calView === 'month')}>Month</button>
            <button onClick={() => switchView('week')}  style={toggleBtnStyle(calView === 'week')}>Week</button>
          </div>
        </div>
      </div>

      {/* ── Month grid ── */}
      {calView === 'month' && (
        <div style={{ border: '1px solid var(--border-l)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
            {DOW.map((d, idx) => (
              <div key={d} style={{ background: 'var(--raised)', textAlign: 'center', padding: '10px 6px', fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.07em', fontFamily: 'var(--mono)', borderRight: idx < 6 ? '1px solid var(--border-l)' : 'none', borderBottom: '1px solid var(--border-l)' }}>
                {d}
              </div>
            ))}
            {cells.map((cell, i) => {
              const col         = i % 7;
              const row         = Math.floor(i / 7);
              const isOther     = cell.type !== 'cur';
              const isTodayCell = !isOther && cell.day === today.d && curMonth === today.m && curYear === today.y;
              const isSel       = !isOther && selDate?.d === cell.day && selDate?.m === curMonth && selDate?.y === curYear;
              const dayBills    = !isOther ? (billsByDay.get(cell.day) ?? []) : [];
              const hasBill     = dayBills.length > 0;
              const dom         = hasBill ? dominantStatus(dayBills) : null;
              const bg = isSel ? 'rgba(59,130,246,0.13)' : isTodayCell ? 'rgba(59,130,246,0.07)' : 'var(--surface)';

              return (
                <div
                  key={i}
                  onClick={() => !isOther && setSelDate(isSel ? null : { d: cell.day, m: curMonth, y: curYear })}
                  style={{ background: bg, minHeight: 96, padding: '10px 8px', cursor: isOther ? 'default' : 'pointer', opacity: isOther ? 0.28 : 1, transition: 'background .15s', position: 'relative', borderRight: col < 6 ? '1px solid var(--border-l)' : 'none', borderBottom: row < totalRows - 1 ? '1px solid var(--border-l)' : 'none', boxShadow: isSel ? 'inset 0 0 0 1.5px rgba(59,130,246,0.55)' : isTodayCell ? 'inset 0 0 0 1px rgba(59,130,246,0.3)' : 'none' }}
                >
                  <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {isTodayCell ? (
                      <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)', flexShrink: 0 }}>{cell.day}</span>
                    ) : (
                      <span style={{ fontSize: 13, fontWeight: hasBill ? 600 : 400, color: hasBill ? 'var(--text)' : 'var(--text2)', fontFamily: 'var(--mono)' }}>{cell.day}</span>
                    )}
                    {dom && <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_COLOR[dom].text, display: 'inline-block', flexShrink: 0, marginTop: 1 }} />}
                  </div>
                  {dayBills.slice(0, 2).map(b => (
                    <div key={b.id} style={chipStyle(STATUS_COLOR[b.status])}>
                      {b.name.split(' ')[0]} · ${b.amount % 1 === 0 ? b.amount : b.amount.toFixed(2)}
                    </div>
                  ))}
                  {dayBills.length > 2 && (
                    <div style={{ background: 'var(--raised)', border: '1px solid var(--border-l)', borderRadius: 4, padding: '3px 7px', fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>
                      +{dayBills.length - 2} more
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Week grid ── */}
      {calView === 'week' && (
        <div style={{ border: '1px solid var(--border-l)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
            {weekDays.map(({ d, m, y }, idx) => {
              const isTodayCol = d === today.d && m === today.m && y === today.y;
              const isSel      = selDate?.d === d && selDate?.m === m && selDate?.y === y;
              const dayBills   = getBillsForDate(bills, y, m, d, today);
              const hasBill    = dayBills.length > 0;
              const colBg      = isSel ? 'rgba(59,130,246,0.13)' : isTodayCol ? 'rgba(59,130,246,0.07)' : 'var(--surface)';
              const crossMonth = m !== weekStart.m;

              return (
                <div
                  key={idx}
                  onClick={() => setSelDate(isSel ? null : { d, m, y })}
                  style={{ display: 'flex', flexDirection: 'column', background: colBg, cursor: 'pointer', transition: 'background .15s', borderRight: idx < 6 ? '1px solid var(--border-l)' : 'none', boxShadow: isSel ? 'inset 0 0 0 1.5px rgba(59,130,246,0.55)' : isTodayCol ? 'inset 0 0 0 1px rgba(59,130,246,0.3)' : 'none' }}
                >
                  {/* Column header */}
                  <div style={{ background: 'var(--raised)', borderBottom: '1px solid var(--border-l)', padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.07em', fontFamily: 'var(--mono)', marginBottom: 5 }}>
                      {DOW[idx]}
                    </div>
                    {isTodayCol ? (
                      <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: '50%', width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, fontFamily: 'var(--mono)' }}>{d}</span>
                    ) : (
                      <span style={{ fontSize: 14, fontWeight: hasBill ? 600 : 400, color: hasBill ? 'var(--text)' : 'var(--text2)', fontFamily: 'var(--mono)' }}>{d}</span>
                    )}
                    {crossMonth && (
                      <div style={{ fontSize: 10, color: 'var(--text2)', fontFamily: 'var(--mono)', marginTop: 3, opacity: 0.7 }}>
                        {MONTHS[m]!.slice(0, 3)}
                      </div>
                    )}
                  </div>

                  {/* Bill chips — show all, no truncation */}
                  <div style={{ padding: '8px 6px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 120 }}>
                    {dayBills.length === 0 ? (
                      <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--sans)', opacity: 0.5, paddingTop: 4 }}>—</div>
                    ) : (
                      dayBills.map(b => (
                        <div key={b.id} style={chipStyle(STATUS_COLOR[b.status])}>
                          {b.name.split(' ')[0]} · {usd(b.amount)}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Day detail panel (shared) ── */}
      {selDate !== null && (
        <DayDetail
          day={selDate.d}
          month={selDate.m}
          year={selDate.y}
          bills={detailBills}
          isToday={isSelToday}
        />
      )}

    </div>
  );
}
