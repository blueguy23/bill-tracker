'use client';
import type { BillResponse } from '@/types/bill';

interface Props {
  bills: BillResponse[];
  today: { d: number; m: number; y: number };
  onAddBill: () => void;
}

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

type DotStatus = 'paid' | 'overdue' | 'due-soon' | 'upcoming';
const DOT_COLOR: Record<DotStatus, string> = {
  paid: 'var(--green)', overdue: 'var(--red)', 'due-soon': 'var(--gold)', upcoming: 'rgba(255,255,255,0.2)',
};

function yyyymm(today: { y: number; m: number }): string {
  return `${today.y}-${String(today.m + 1).padStart(2, '0')}`;
}

function dayOfMonth(bill: BillResponse): number | null {
  if (typeof bill.dueDate === 'number') return bill.dueDate;
  const d = new Date(bill.dueDate);
  return isNaN(d.getTime()) ? null : d.getDate();
}

function dotStatus(bill: BillResponse, day: number, todayDay: number, mm: string): DotStatus {
  if (bill.isPaid && bill.paidMonth === mm) return 'paid';
  if (day < todayDay) return 'overdue';
  if (day - todayDay <= 3) return 'due-soon';
  return 'upcoming';
}

export function PaymentsHero({ bills, today, onAddBill }: Props) {
  const mm          = yyyymm(today);
  const daysInMonth = new Date(today.y, today.m + 1, 0).getDate();
  const todayPct    = ((today.d - 0.5) / daysInMonth) * 100;
  const monthName   = MONTHS[today.m] ?? '';

  const paidBills      = bills.filter(b => b.isPaid && b.paidMonth === mm);
  const unpaidBills    = bills.filter(b => !(b.isPaid && b.paidMonth === mm));
  const totalAmount    = bills.reduce((s, b) => s + b.amount, 0);
  const paidAmount     = paidBills.reduce((s, b) => s + b.amount, 0);
  const remainingAmount = totalAmount - paidAmount;
  const paidPct        = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;
  const autoPayCount   = bills.filter(b => b.isAutoPay).length;
  const autoPayPct     = bills.length > 0 ? Math.round((autoPayCount / bills.length) * 100) : 0;

  const nextDue = unpaidBills
    .map(b => ({ bill: b, day: dayOfMonth(b) }))
    .filter((x): x is { bill: BillResponse; day: number } => x.day !== null && x.day >= today.d)
    .sort((a, b) => a.day - b.day)[0];
  const nextDueDays = nextDue ? nextDue.day - today.d : null;

  const overdueBills = unpaidBills.filter(b => {
    const day = dayOfMonth(b);
    return day !== null && day < today.d;
  });

  const dots = bills
    .map(b => ({ b, day: dayOfMonth(b) }))
    .filter((x): x is { b: BillResponse; day: number } => x.day !== null && x.day >= 1 && x.day <= daysInMonth)
    .map(({ b, day }) => ({ b, day, pct: ((day - 0.5) / daysInMonth) * 100, st: dotStatus(b, day, today.d, mm) }));

  const alertBill = nextDue ?? (overdueBills.length > 0 ? { bill: overdueBills[0]!, day: dayOfMonth(overdueBills[0]!) ?? 0 } : null);
  const isOverdueAlert = !nextDue && overdueBills.length > 0;

  return (
    <div data-testid="payments-hero" style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '20px 24px', margin: '16px 20px' }}>

      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.06em', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4, fontFamily: 'var(--sans)' }}>
            This month's progress
          </div>
          <div data-testid="payments-hero-amount" style={{ fontSize: 28, fontWeight: 600, lineHeight: 1, color: 'var(--green)', fontFamily: 'var(--sans)' }}>
            {paidBills.length} of {bills.length} covered
          </div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 5, fontFamily: 'var(--sans)' }}>
            {USD.format(totalAmount)} committed · {autoPayPct}% on autopay
          </div>
        </div>
        <button onClick={onAddBill} data-testid="add-bill-btn" style={{ background: 'var(--gold)', color: '#1a0a00', fontSize: 13, fontWeight: 500, padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
          + Add bill
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
          <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 500, fontFamily: 'var(--sans)' }}>{USD.format(paidAmount)} paid</span>
          <span style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 500, fontFamily: 'var(--sans)' }}>{USD.format(remainingAmount)} remaining</span>
        </div>
        <div role="progressbar" aria-valuenow={paidPct} aria-valuemin={0} aria-valuemax={100} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 4, background: 'var(--green)', width: `${paidPct}%`, transition: 'width 0.5s ease' }} />
        </div>
      </div>

      {/* Alert row */}
      {alertBill && (
        <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 12, padding: '8px 12px', background: isOverdueAlert ? 'rgba(239,68,68,0.08)' : 'oklch(0.67 0.13 40 / 0.12)', borderLeft: `2px solid ${isOverdueAlert ? 'var(--red)' : 'var(--gold)'}` }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isOverdueAlert ? 'var(--red)' : 'var(--gold)'} strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--sans)' }}>
            {isOverdueAlert
              ? <>{overdueBills.length > 1 ? <><strong style={{ color: 'var(--text)' }}>{overdueBills.length} bills</strong> are overdue</> : <><strong style={{ color: 'var(--text)' }}>{alertBill.bill.name}</strong> is overdue</>} — mark as paid or set up autopay</>
              : <>{nextDueDays === 0 ? 'Due today' : `Next due in ${nextDueDays ?? 0} day${nextDueDays !== 1 ? 's' : ''}`} — <strong style={{ color: 'var(--text)' }}>{alertBill.bill.name}</strong> · {USD.format(alertBill.bill.amount)}{alertBill.bill.isAutoPay ? ' · autopay on' : ''}</>
            }
          </span>
        </div>
      )}

      {/* Timeline */}
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
          <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--sans)' }}>{monthName} · when bills hit</span>
          <div style={{ display: 'flex', gap: 12 }} aria-hidden="true">
            {(['paid','overdue','due-soon','upcoming'] as DotStatus[]).map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--sans)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: DOT_COLOR[s] }} />
                {s === 'due-soon' ? 'due soon' : s}
              </div>
            ))}
          </div>
        </div>
        <div aria-label={`Bill timeline for ${monthName}`} style={{ display: 'flex', alignItems: 'center', height: 28, background: 'rgba(255,255,255,0.05)', borderRadius: 6, padding: '0 12px', position: 'relative', overflow: 'hidden' }}>
          <div aria-hidden="true" style={{ position: 'absolute', left: `${todayPct}%`, top: 0, bottom: 0, width: 1.5, background: 'rgba(255,255,255,0.25)' }} />
          <div style={{ flex: 1, position: 'relative', height: '100%' }}>
            {dots.map(({ b, pct, st }) => (
              <div key={b._id} aria-hidden="true" style={{ position: 'absolute', left: `${pct}%`, top: '50%', transform: 'translate(-50%, -50%)' }}>
                <div title={`${b.name} — ${MONTHS_SHORT[today.m]} ${b.dueDate}`} style={{ width: 8, height: 8, borderRadius: '50%', background: DOT_COLOR[st] }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
