'use client';

import { useState } from 'react';
import type { BillResponse } from '@/types/bill';

type BillStatus = 'paid' | 'autopay' | 'upcoming' | 'overdue';

interface CalDay {
  id: string;
  name: string;
  category: string;
  amount: number;
  status: BillStatus;
  isAutoPay: boolean;
}

const STATUS_COLOR: Record<BillStatus, { text: string; bg: string; border: string }> = {
  paid:     { text: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.2)' },
  autopay:  { text: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)' },
  upcoming: { text: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.2)' },
  overdue:  { text: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)' },
};

const STATUS_LABEL: Record<BillStatus, string> = {
  paid: 'Paid', autopay: 'Autopay', upcoming: 'Upcoming', overdue: 'Overdue',
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW    = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function billStatus(bill: BillResponse, day: number, month: number, year: number): BillStatus {
  if (bill.isPaid) return 'paid';
  const now = new Date();
  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear();
  if (isCurrentMonth && day < now.getDate()) return bill.isAutoPay ? 'autopay' : 'overdue';
  return bill.isAutoPay ? 'autopay' : 'upcoming';
}

function getBillsForMonth(bills: BillResponse[], month: number, year: number): Map<number, CalDay[]> {
  const map = new Map<number, CalDay[]>();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function add(day: number, bill: BillResponse, status: BillStatus) {
    if (day < 1 || day > daysInMonth) return;
    const entry: CalDay = {
      id: bill._id, name: bill.name, category: bill.category,
      amount: bill.amount, status, isAutoPay: bill.isAutoPay,
    };
    const existing = map.get(day) ?? [];
    map.set(day, [...existing, entry]);
  }

  for (const bill of bills) {
    if (bill.isRecurring && bill.recurrenceInterval === 'yearly') {
      if (typeof bill.dueDate !== 'string') continue;
      const d = new Date(bill.dueDate);
      if (isNaN(d.getTime()) || d.getMonth() !== month) continue;
      const day = d.getDate();
      add(day, bill, billStatus(bill, day, month, year));
    } else if (bill.isRecurring) {
      if (typeof bill.dueDate !== 'number') continue;
      add(bill.dueDate, bill, billStatus(bill, bill.dueDate, month, year));
    } else {
      if (typeof bill.dueDate !== 'string') continue;
      const d = new Date(bill.dueDate);
      if (isNaN(d.getTime()) || d.getMonth() !== month || d.getFullYear() !== year) continue;
      const day = d.getDate();
      add(day, bill, billStatus(bill, day, month, year));
    }
  }
  return map;
}

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
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border-l)', borderRadius: 12, padding: 16, marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
            {isToday ? 'Today · ' : ''}{dateStr}
          </span>
          {bills.length > 0 && (
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--sans)', marginTop: 2 }}>
              {bills.length} bill{bills.length !== 1 ? 's' : ''} due
            </div>
          )}
        </div>
        {bills.length > 0 && (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 300, color: 'var(--text)' }}>
            {usd.format(total)}
          </div>
        )}
      </div>

      {bills.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text3)', fontFamily: 'var(--sans)', padding: '8px 0' }}>No bills due — clear day</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {bills.map(bill => {
            const s = STATUS_COLOR[bill.status];
            return (
              <div key={bill.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}
                   className="cal-detail-row">
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: s.bg, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: s.text, flexShrink: 0, fontFamily: 'var(--mono)' }}>
                  {bill.name[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bill.name}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.06em', padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--mono)', background: s.bg, color: s.text, border: `1px solid ${s.border}`, flexShrink: 0 }}>
                      {STATUS_LABEL[bill.status]}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--sans)' }}>
                    {bill.category} · {bill.isAutoPay ? 'Autopay' : 'Manual'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 400, color: 'var(--text)' }}>{usd.format(bill.amount)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--sans)', marginTop: 2 }}>
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

interface Props {
  bills: BillResponse[];
}

export function PaymentsCalendar({ bills }: Props) {
  const now   = new Date();
  const today = { d: now.getDate(), m: now.getMonth(), y: now.getFullYear() };

  const [curMonth, setCurMonth]     = useState(today.m);
  const [curYear, setCurYear]       = useState(today.y);
  const [selectedDay, setSelectedDay] = useState<number | null>(today.d);

  const billsByDay = getBillsForMonth(bills, curMonth, curYear);

  function prevMonth() {
    if (curMonth === 0) { setCurMonth(11); setCurYear(y => y - 1); }
    else setCurMonth(m => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (curMonth === 11) { setCurMonth(0); setCurYear(y => y + 1); }
    else setCurMonth(m => m + 1);
    setSelectedDay(null);
  }

  const firstDow     = new Date(curYear, curMonth, 1).getDay();
  const daysInMonth  = new Date(curYear, curMonth + 1, 0).getDate();
  const prevMonthEnd = new Date(curYear, curMonth, 0).getDate();
  const totalCells   = firstDow + daysInMonth > 35 ? 42 : 35;

  type Cell = { day: number; type: 'prev' | 'cur' | 'next' };
  const cells: Cell[] = [];
  for (let i = 0; i < totalCells; i++) {
    if (i < firstDow) cells.push({ day: prevMonthEnd - (firstDow - 1 - i), type: 'prev' });
    else if (i >= firstDow + daysInMonth) cells.push({ day: i - firstDow - daysInMonth + 1, type: 'next' });
    else cells.push({ day: i - firstDow + 1, type: 'cur' });
  }

  const detailBills = selectedDay ? (billsByDay.get(selectedDay) ?? []) : [];
  const isSelectedToday = selectedDay === today.d && curMonth === today.m && curYear === today.y;

  // Status dot colors for a day — pick the "worst" status to show
  const STATUS_PRIORITY: BillStatus[] = ['overdue', 'upcoming', 'autopay', 'paid'];
  function dominantStatus(dayBills: CalDay[]): BillStatus {
    for (const s of STATUS_PRIORITY) {
      if (dayBills.some(b => b.status === s)) return s;
    }
    return 'paid';
  }

  return (
    <div style={{ width: '100%' }}>

      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={prevMonth} aria-label="Previous month" style={{ background: 'var(--raised)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text3)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '4px 11px 6px', transition: 'background .1s' }}>‹</button>
          <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--sans)', minWidth: 140, textAlign: 'center' }}>{MONTHS[curMonth]} {curYear}</span>
          <button onClick={nextMonth} aria-label="Next month" style={{ background: 'var(--raised)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text3)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '4px 11px 6px', transition: 'background .1s' }}>›</button>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          {(['paid', 'autopay', 'upcoming', 'overdue'] as BillStatus[]).map(s => (
            <span key={s} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text3)', fontFamily: 'var(--sans)' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_COLOR[s].text, display: 'inline-block', flexShrink: 0 }} />
              {STATUS_LABEL[s]}
            </span>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 0 }}>
        {DOW.map(d => (
          <div key={d} style={{ background: 'var(--surface)', textAlign: 'center', padding: '8px 2px', fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', fontFamily: 'var(--mono)' }}>
            {d}
          </div>
        ))}
        {cells.map((cell, i) => {
          const isOther   = cell.type !== 'cur';
          const isToday   = !isOther && cell.day === today.d && curMonth === today.m && curYear === today.y;
          const isSel     = !isOther && cell.day === selectedDay;
          const dayBills  = !isOther ? (billsByDay.get(cell.day) ?? []) : [];
          const hasBill   = dayBills.length > 0;
          const dom       = hasBill ? dominantStatus(dayBills) : null;

          const bg = isSel ? 'rgba(59,130,246,0.08)' : isToday ? 'rgba(59,130,246,0.04)' : 'var(--surface)';
          const outline = isSel ? '1px inset rgba(59,130,246,0.4)' : isToday ? '1px inset rgba(59,130,246,0.2)' : 'none';

          return (
            <div
              key={i}
              onClick={() => !isOther && setSelectedDay(isSel ? null : cell.day)}
              style={{
                background: bg, outline, minHeight: 72, padding: '7px 6px',
                cursor: isOther ? 'default' : 'pointer',
                opacity: isOther ? 0.3 : 1,
                transition: 'background .1s',
                position: 'relative',
              }}
            >
              <div style={{ marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                {isToday ? (
                  <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, fontFamily: 'var(--mono)' }}>
                    {cell.day}
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: hasBill ? 'var(--text2)' : 'var(--text3)', fontFamily: 'var(--mono)' }}>{cell.day}</span>
                )}
                {dom && (
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: STATUS_COLOR[dom].text, display: 'inline-block', flexShrink: 0 }} />
                )}
              </div>
              {dayBills.slice(0, 2).map(b => {
                const s = STATUS_COLOR[b.status];
                return (
                  <div key={b.id} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 3, padding: '2px 5px', fontSize: 9, fontWeight: 500, color: s.text, fontFamily: 'var(--mono)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.name.split(' ')[0]} · ${b.amount % 1 === 0 ? b.amount : b.amount.toFixed(2)}
                  </div>
                );
              })}
              {dayBills.length > 2 && (
                <div style={{ background: 'var(--raised)', border: '1px solid var(--border)', borderRadius: 3, padding: '2px 5px', fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
                  +{dayBills.length - 2} more
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Day detail */}
      {selectedDay !== null && (
        <DayDetail
          day={selectedDay}
          month={curMonth}
          year={curYear}
          bills={detailBills}
          isToday={isSelectedToday}
        />
      )}

    </div>
  );
}
