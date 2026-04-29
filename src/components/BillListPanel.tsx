'use client';
import { useState } from 'react';
import type { BillResponse } from '@/types/bill';

type StatusFilter = 'all' | 'overdue' | 'due-soon' | 'paid' | 'autopay';
type BillStatus   = 'overdue' | 'due-soon' | 'paid' | 'scheduled' | 'upcoming';

interface Props {
  bills: BillResponse[];
  onEdit: (bill: BillResponse) => void;
  onDelete: (id: string) => void;
  onTogglePaid: (id: string, isPaid: boolean) => void;
  onToggleAutoPay: (id: string, isAutoPay: boolean) => void;
}

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function yyyymm(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

function dayOfMonth(bill: BillResponse): number {
  return typeof bill.dueDate === 'number' ? bill.dueDate : new Date(bill.dueDate).getDate();
}

function billStatus(bill: BillResponse, today: number, mm: string): BillStatus {
  if (bill.isPaid && bill.paidMonth === mm) return 'paid';
  const day = dayOfMonth(bill);
  if (day < today) return 'overdue';
  if (day - today <= 3) return 'due-soon';
  if (bill.isAutoPay) return 'scheduled';
  return 'upcoming';
}

function urgencyOrder(st: BillStatus): number {
  return { overdue: 1, 'due-soon': 2, scheduled: 3, upcoming: 3, paid: 4 }[st];
}

function dueDateLabel(bill: BillResponse, today: number, mm: string, monthAbbr: string): string {
  const day  = dayOfMonth(bill);
  const date = `${monthAbbr} ${day}`;
  if (bill.isPaid && bill.paidMonth === mm) return `${date} · paid`;
  const diff = day - today;
  if (diff < 0) return `${date} · ${Math.abs(diff)} day${Math.abs(diff) !== 1 ? 's' : ''} ago`;
  if (diff === 0) return `${date} · today`;
  if (diff === 1) return `${date} · tomorrow`;
  return `${date} · in ${diff} days`;
}

const STATUS_STYLE: Record<BillStatus, { bg: string; color: string; border: string; label: string }> = {
  overdue:   { bg: 'rgba(239,68,68,0.10)',   color: 'var(--red)',   border: 'rgba(239,68,68,0.20)',   label: '● Overdue'   },
  'due-soon':{ bg: 'rgba(245,158,11,0.10)',  color: 'var(--gold)',  border: 'rgba(245,158,11,0.20)',  label: '● Due Soon'  },
  paid:      { bg: 'rgba(34,197,94,0.10)',   color: 'var(--green)', border: 'rgba(34,197,94,0.20)',   label: '● Paid'      },
  scheduled: { bg: 'rgba(96,165,250,0.10)',  color: 'var(--accent)',border: 'rgba(96,165,250,0.20)',  label: '● Scheduled' },
  upcoming:  { bg: 'rgba(255,255,255,0.04)', color: 'var(--text3)', border: 'rgba(255,255,255,0.07)', label: '● Upcoming'  },
};

const LEFT_BORDER: Partial<Record<BillStatus, string>> = {
  overdue: 'var(--red)', 'due-soon': 'var(--gold)',
};

function BillRowItem({ bill, today, mm, monthAbbr, onEdit, onDelete, onTogglePaid, onToggleAutoPay }: {
  bill: BillResponse; today: number; mm: string; monthAbbr: string;
  onEdit: (b: BillResponse) => void;
  onDelete: (id: string) => void;
  onTogglePaid: (id: string, isPaid: boolean) => void;
  onToggleAutoPay: (id: string, isAutoPay: boolean) => void;
}) {
  const [hov, setHov] = useState(false);
  const st = billStatus(bill, today, mm);
  const ss = STATUS_STYLE[st];

  return (
    <div
      data-testid="bill-row"
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'grid', gridTemplateColumns: '36px 1fr 110px 120px 90px 80px',
        padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)',
        alignItems: 'center', cursor: 'pointer', transition: 'background 0.1s',
        background: hov ? 'rgba(255,255,255,0.02)' : 'transparent',
        opacity: st === 'paid' ? 0.6 : 1,
        borderLeft: LEFT_BORDER[st] ? `2px solid ${LEFT_BORDER[st]}` : '2px solid transparent',
      }}
    >
      {/* Icon */}
      <div>
        <div style={{ width: 28, height: 28, background: 'var(--raised)', border: '1px solid var(--border)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--text3)', flexShrink: 0 }}>
          {bill.name.charAt(0).toUpperCase()}
        </div>
      </div>

      {/* Name + category */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>{bill.name}</div>
        <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{bill.category}</div>
      </div>

      {/* Status badge */}
      <div>
        <span onClick={() => onTogglePaid(bill._id, !bill.isPaid)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 4, fontSize: 10, fontFamily: 'var(--mono)', border: `1px solid ${ss.border}`, background: ss.bg, color: ss.color, cursor: 'pointer' }}>
          {ss.label}
        </span>
      </div>

      {/* Autopay */}
      <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', gap: 4 }}>
        {bill.isAutoPay
          ? <><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg><span style={{ color: 'var(--green)' }}>Autopay</span></>
          : <><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>Manual pay</>}
      </div>

      {/* Due date */}
      <div style={{ fontSize: 10, color: st === 'overdue' ? 'var(--red)' : 'var(--text3)', fontFamily: 'var(--mono)' }}>
        {dueDateLabel(bill, today, mm, monthAbbr)}
      </div>

      {/* Amount + hover actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
        {hov ? (
          <>
            <button onClick={() => onEdit(bill)} style={{ padding: '3px 8px', borderRadius: 5, border: '1px solid var(--border-l)', background: 'transparent', color: 'var(--text3)', cursor: 'pointer', fontSize: 10 }}>Edit</button>
            <button onClick={() => onDelete(bill._id)} style={{ padding: '3px 8px', borderRadius: 5, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)', color: 'var(--red)', cursor: 'pointer', fontSize: 10 }}>Del</button>
          </>
        ) : (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 500, color: st === 'overdue' ? 'var(--red)' : 'var(--text)' }}>
            {USD.format(bill.amount)}
          </div>
        )}
      </div>
    </div>
  );
}

const FILTER_CHIPS: { id: StatusFilter; label: string; dot?: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'overdue', label: 'Overdue', dot: 'var(--red)' },
  { id: 'due-soon', label: 'Due Soon', dot: 'var(--gold)' },
  { id: 'paid', label: 'Paid', dot: 'var(--green)' },
  { id: 'autopay', label: 'Autopay', dot: 'var(--accent)' },
];

export function BillListPanel({ bills, onEdit, onDelete, onTogglePaid, onToggleAutoPay }: Props) {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const today     = new Date().getDate();
  const mm        = yyyymm();
  const monthAbbr = new Date().toLocaleDateString('en-US', { month: 'short' });

  const filtered = bills.filter(b => {
    if (filter === 'all') return true;
    const st = billStatus(b, today, mm);
    if (filter === 'overdue')  return st === 'overdue';
    if (filter === 'due-soon') return st === 'due-soon';
    if (filter === 'paid')     return st === 'paid';
    if (filter === 'autopay')  return b.isAutoPay;
    return true;
  }).sort((a, b) => {
    const sa = billStatus(a, today, mm), sb = billStatus(b, today, mm);
    const ua = urgencyOrder(sa), ub = urgencyOrder(sb);
    if (ua !== ub) return ua - ub;
    return dayOfMonth(a) - dayOfMonth(b);
  });

  return (
    <div data-testid="bills-panel">
      <div data-testid="bill-status-filter" style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
        {FILTER_CHIPS.map(({ id, label, dot }) => (
          <button key={id} onClick={() => setFilter(id)} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6,
            fontSize: 11, cursor: 'pointer', fontFamily: 'var(--sans)',
            border: filter === id ? '1px solid rgba(232,201,126,0.25)' : '1px solid rgba(255,255,255,0.07)',
            background: filter === id ? 'rgba(232,201,126,0.08)' : 'transparent',
            color: filter === id ? 'var(--gold)' : 'var(--text3)',
          }}>
            {dot && <div style={{ width: 5, height: 5, borderRadius: '50%', background: dot }} />}
            {label}
          </button>
        ))}
      </div>

      <div data-testid="bill-list" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 110px 120px 90px 80px', padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
          {['', 'Bill', 'Status', 'Autopay', 'Due Date', 'Amount'].map((h, i) => (
            <div key={i} style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--text3)', textAlign: i === 5 ? 'right' : 'left' }}>{h}</div>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: '32px 24px', textAlign: 'center', fontSize: 13, color: 'var(--text3)', fontFamily: 'var(--sans)' }}>No bills match this filter</div>
        ) : filtered.map(bill => (
          <BillRowItem key={bill._id} bill={bill} today={today} mm={mm} monthAbbr={monthAbbr}
            onEdit={onEdit} onDelete={onDelete} onTogglePaid={onTogglePaid} onToggleAutoPay={onToggleAutoPay} />
        ))}
      </div>
    </div>
  );
}
