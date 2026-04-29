'use client';
import type { BillResponse } from '@/types/bill';

interface Props {
  allBills: BillResponse[];
  onAddBill: () => void;
}

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function currentYYYYMM(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

function billDay(bill: BillResponse): number | null {
  if (typeof bill.dueDate === 'number') return bill.dueDate;
  const d = new Date(bill.dueDate);
  const now = new Date();
  if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) return null;
  return d.getDate();
}

type DotStatus = 'paid' | 'overdue' | 'due-soon' | 'upcoming';

function dotStatus(bill: BillResponse, day: number, todayDay: number, yyyymm: string): DotStatus {
  if (bill.isPaid && bill.paidMonth === yyyymm) return 'paid';
  if (day < todayDay) return 'overdue';
  if (day - todayDay <= 3) return 'due-soon';
  return 'upcoming';
}

const DOT_COLOR: Record<DotStatus, string> = {
  paid: 'var(--green)', overdue: 'var(--red)', 'due-soon': 'var(--gold)', upcoming: 'rgba(255,255,255,0.22)',
};
const DOT_LABELS: Record<DotStatus, string> = {
  paid: 'Paid', overdue: 'Overdue', 'due-soon': 'Due soon', upcoming: 'Upcoming',
};

export function PaymentsHero({ allBills, onAddBill }: Props) {
  const now         = new Date();
  const todayDay    = now.getDate();
  const yyyymm      = currentYYYYMM();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const todayPct    = ((todayDay - 0.5) / daysInMonth) * 100;
  const monthName   = now.toLocaleDateString('en-US', { month: 'long' });

  const paidBills    = allBills.filter(b => b.isPaid && b.paidMonth === yyyymm);
  const unpaid       = allBills.filter(b => !(b.isPaid && b.paidMonth === yyyymm));
  const stillOwed    = unpaid.reduce((s, b) => s + b.amount, 0);
  const paidAmount   = paidBills.reduce((s, b) => s + b.amount, 0);
  const committed    = allBills.reduce((s, b) => s + b.amount, 0);
  const autoPayCount = allBills.filter(b => b.isAutoPay).length;
  const autoPayPct   = allBills.length > 0 ? Math.round((autoPayCount / allBills.length) * 100) : 0;

  const nextDue = unpaid
    .map(b => ({ bill: b, day: billDay(b) ?? 999 }))
    .filter(({ day, bill }) => typeof bill.dueDate === 'number' ? bill.dueDate >= todayDay : new Date(bill.dueDate) >= now)
    .sort((a, b) => a.day - b.day)[0];

  const nextDueDays = nextDue ? Math.max(0, nextDue.day - todayDay) : null;

  const dots = allBills
    .map(b => { const day = billDay(b); return day ? { b, day, pct: ((day - 0.5) / daysInMonth) * 100, st: dotStatus(b, day, todayDay, yyyymm) } : null; })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const overdueBills = allBills.filter(b => {
    const day = billDay(b);
    return day !== null && day < todayDay && !(b.isPaid && b.paidMonth === yyyymm);
  });

  const stats = [
    { label: 'Paid',      value: USD.format(paidAmount),  sub: `${paidBills.length} of ${allBills.length}`, color: 'var(--green)' },
    { label: 'Committed', value: USD.format(committed),   sub: 'this month',                                 color: 'var(--text2)' },
    { label: 'Autopay',   value: `${autoPayPct}%`,        sub: `${autoPayCount} of ${allBills.length}`,      color: 'var(--text2)' },
  ];

  return (
    <div data-testid="payments-hero" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '2px solid var(--gold)', borderRadius: 12, padding: '22px 28px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(245,158,11,0.5)', fontFamily: 'var(--mono)', marginBottom: 6 }}>
            Still owed this month
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <div data-testid="payments-hero-amount" style={{ fontFamily: 'var(--mono)', fontSize: 52, fontWeight: 700, color: 'var(--gold)', letterSpacing: '-2px', lineHeight: 1 }}>
              {USD.format(stillOwed)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingBottom: 4 }}>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>across {unpaid.length} bill{unpaid.length !== 1 ? 's' : ''}</div>
              {nextDue && nextDueDays !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--gold)' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {nextDueDays === 0 ? 'Due today' : `Next due in ${nextDueDays} day${nextDueDays !== 1 ? 's' : ''}`} — {nextDue.bill.name} {USD.format(nextDue.bill.amount)}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: 14 }}>
            {stats.flatMap(({ label, value, sub, color }, i) => [
              ...(i > 0 ? [<div key={`sep-${i}`} style={{ width: 1, alignSelf: 'stretch', background: 'var(--border)', margin: '0 20px' }} />] : []),
              <div key={label}>
                <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)', marginBottom: 2 }}>{label}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 14, color }}>{value}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>{sub}</div>
              </div>,
            ])}
          </div>
        </div>
        <button onClick={onAddBill} data-testid="add-bill-hero-btn" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--gold)', color: '#0b0b0f', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Bill
        </button>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text2)' }}>{monthName} · when bills hit</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
            {(['paid', 'overdue', 'due-soon', 'upcoming'] as DotStatus[]).map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: DOT_COLOR[s] }} />
                {DOT_LABELS[s]}
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', height: 56, margin: '0 4px' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
            {['1','5','10','15','20','25','30'].map(d => <span key={d}>{d}</span>)}
          </div>
          <div style={{ position: 'absolute', top: 18, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1 }} />
          <div style={{ position: 'absolute', top: 18, left: 0, width: `${todayPct}%`, height: 2, background: 'rgba(255,255,255,0.12)', borderRadius: 1 }} />
          <div style={{ position: 'absolute', left: `${todayPct}%`, top: 10, bottom: -2, width: 1, background: 'rgba(255,255,255,0.25)' }}>
            <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', fontSize: 8, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>TODAY</div>
          </div>
          {dots.map(({ b, pct, st }) => {
            const urgent = st === 'overdue' || st === 'due-soon';
            const sz = urgent ? 12 : 10;
            return (
              <div key={b._id} style={{ position: 'absolute', left: `${pct}%`, top: urgent ? 11 : 13, transform: 'translateX(-50%)' }}>
                <div style={{ width: sz, height: sz, borderRadius: '50%', background: DOT_COLOR[st], boxShadow: urgent ? `0 0 10px ${DOT_COLOR[st]}88` : undefined }} />
                <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', fontSize: 8, color: DOT_COLOR[st], fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
                  {b.name.length > 7 ? b.name.slice(0, 6) + '…' : b.name}
                </div>
              </div>
            );
          })}
        </div>

        {overdueBills.length > 0 && (
          <div data-testid="gap-warning" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 32, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 6, fontSize: 11, color: 'var(--red)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {overdueBills.length === 1
              ? `${overdueBills[0]!.name} (${USD.format(overdueBills[0]!.amount)}) is overdue — mark as paid or set up autopay.`
              : `${overdueBills.length} bills are overdue — mark as paid or set up autopay.`}
          </div>
        )}
      </div>
    </div>
  );
}
