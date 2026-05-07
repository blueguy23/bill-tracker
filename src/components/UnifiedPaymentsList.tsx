'use client';
import { useState } from 'react';
import type { BillResponse } from '@/types/bill';

type BillType     = 'bill' | 'subscription' | 'recurring';
type Timing       = 'overdue' | 'due-soon' | 'upcoming' | 'paid';
type PillStatus   = 'overdue' | 'upcoming' | 'scheduled' | 'paid' | 'annual-paid' | 'annual';
type StatusFilter = 'all' | 'overdue' | 'due-soon' | 'paid';
type TypeFilter   = 'all' | 'bill' | 'subscription' | 'recurring';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function billType(b: BillResponse): BillType {
  if (b.isSubscription) return 'subscription';
  if (b.isRecurring)    return 'recurring';
  return 'bill';
}

function isYearly(b: BillResponse): boolean {
  return !!(b.isRecurring && b.recurrenceInterval === 'yearly');
}

function yyyymm(today: { y: number; m: number }): string {
  return `${today.y}-${String(today.m + 1).padStart(2, '0')}`;
}

// For yearly bills, always compute days to the NEXT annual occurrence (always future).
function nextAnnualDate(dueDate: string, today: { y: number; m: number; d: number }): Date {
  const base      = new Date(dueDate);
  const thisYear  = new Date(today.y, base.getMonth(), base.getDate());
  const todayDate = new Date(today.y, today.m, today.d);
  return thisYear <= todayDate
    ? new Date(today.y + 1, base.getMonth(), base.getDate())
    : thisYear;
}

function diffDays(bill: BillResponse, today: { d: number; m: number; y: number }): number | null {
  if (isYearly(bill)) {
    // Old buggy data has numeric dueDate (day-of-month) — can't compute annual diff from it.
    if (typeof bill.dueDate !== 'string') return null;
    const next    = nextAnnualDate(bill.dueDate, today);
    const todayMs = new Date(today.y, today.m, today.d).getTime();
    return Math.round((next.getTime() - todayMs) / 86400000);
  }
  if (typeof bill.dueDate === 'number') {
    if (!Number.isFinite(bill.dueDate)) return null; // guard: NaN stored from old yearly bug
    return bill.dueDate - today.d;
  }
  const d = new Date(bill.dueDate);
  if (isNaN(d.getTime())) return null;
  const todayMs = new Date(today.y, today.m, today.d).getTime();
  const dueMs   = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((dueMs - todayMs) / 86400000);
}

function timing(bill: BillResponse, today: { d: number; m: number; y: number }, mm: string): Timing {
  if (isYearly(bill)) {
    // Yearly bills: paid = covered for the whole year; not paid = upcoming/due-soon only.
    if (bill.isPaid) return 'paid';
    const diff = diffDays(bill, today); // always points to next annual date (future)
    if (diff === null) return 'upcoming';
    if (diff <= 7) return 'due-soon';
    return 'upcoming';
  }
  if (bill.isPaid && bill.paidMonth === mm) return 'paid';
  const diff = diffDays(bill, today);
  if (diff === null) return 'upcoming';
  if (diff < 0)  return 'overdue';
  if (diff <= 7) return 'due-soon';
  return 'upcoming';
}

function pillStatus(bill: BillResponse, t: Timing): PillStatus {
  if (isYearly(bill)) return t === 'paid' ? 'annual-paid' : 'annual';
  if (t === 'paid')    return 'paid';
  if (t === 'overdue') return 'overdue';
  return bill.isAutoPay ? 'scheduled' : 'upcoming';
}

const AVATAR_PALETTES = [
  { bg: 'rgba(108,99,255,0.18)', color: 'var(--accent)' },
  { bg: 'rgba(76,175,136,0.18)', color: 'var(--green)' },
  { bg: 'oklch(0.67 0.13 40 / 0.18)', color: 'var(--gold)' },
  { bg: 'rgba(122,181,240,0.18)', color: '#7ab5f0' },
  { bg: 'rgba(240,128,128,0.18)', color: 'var(--red)' },
] as const;
function avatarPalette(name: string) {
  return AVATAR_PALETTES[name.charCodeAt(0) % AVATAR_PALETTES.length]!;
}

const TYPE_BADGE: Record<BillType, { bg: string; color: string; label: string }> = {
  bill:         { bg: 'rgba(96,165,250,0.15)',  color: '#7ab5f0',       label: 'bill' },
  subscription: { bg: 'rgba(108,99,255,0.15)',  color: 'var(--accent)', label: 'subscription' },
  recurring:    { bg: 'rgba(76,175,136,0.15)',  color: 'var(--green)',  label: 'recurring' },
};

const PILL_STYLE: Record<PillStatus, { bg: string; color: string; label: string }> = {
  overdue:      { bg: 'rgba(239,68,68,0.12)',   color: 'var(--red)',    label: 'Overdue' },
  upcoming:     { bg: 'rgba(108,99,255,0.15)',  color: 'var(--accent)', label: 'Upcoming' },
  scheduled:    { bg: 'rgba(96,165,250,0.15)',  color: '#7ab5f0',       label: 'Scheduled' },
  paid:         { bg: 'rgba(76,175,136,0.15)',  color: 'var(--green)',  label: 'Paid' },
  'annual-paid':{ bg: 'rgba(76,175,136,0.15)',  color: 'var(--green)',  label: 'Paid · yearly' },
  'annual':     { bg: 'rgba(108,99,255,0.12)',  color: 'var(--accent)', label: 'Annual' },
};

function dueLine(bill: BillResponse, diff: number | null, t: Timing, today: { d: number; m: number; y: number }): string {
  if (isYearly(bill)) {
    if (t === 'paid') return 'Covered for the year';
    if (typeof bill.dueDate === 'string') {
      const next = nextAnnualDate(bill.dueDate, today);
      return `Due ${MONTHS_SHORT[next.getMonth()]} ${next.getFullYear()}`;
    }
    return 'Annual'; // fallback for old buggy numeric dueDate
  }
  if (t === 'paid') return MONTHS_SHORT[today.m] ?? '';
  if (diff === null || !Number.isFinite(diff)) return '';
  if (diff < 0)  return `${Math.abs(diff)}d ago`;
  if (diff === 0) return 'Due today';
  return `Due in ${diff} day${diff !== 1 ? 's' : ''}`;
}

// ─── BillRow ─────────────────────────────────────────────────────────────────

interface BillRowProps {
  bill: BillResponse;
  today: { d: number; m: number; y: number };
  mm: string;
  onEdit: (b: BillResponse) => void;
  onDelete: (id: string) => void;
  onTogglePaid: (id: string, isPaid: boolean) => void;
}

function BillRow({ bill, today, mm, onEdit, onDelete, onTogglePaid }: BillRowProps) {
  const [hov, setHov] = useState(false);
  const t    = timing(bill, today, mm);
  const ps   = pillStatus(bill, t);
  const diff = diffDays(bill, today);
  const av   = avatarPalette(bill.name);
  const tb   = TYPE_BADGE[billType(bill)];
  const pill = PILL_STYLE[ps];
  const due  = dueLine(bill, diff, t, today);

  return (
    <div
      data-testid="bill-row"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
        background: hov ? 'rgba(255,255,255,0.03)' : 'var(--surface)',
        borderRadius: 8, border: '0.5px solid rgba(255,255,255,0.05)',
        opacity: t === 'paid' ? 0.58 : 1, cursor: 'pointer',
        transition: 'background 0.12s',
      }}
    >
      {/* Avatar */}
      <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0, background: av.bg, color: av.color }}>
        {bill.name[0]?.toUpperCase()}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--sans)' }}>{bill.name}</span>
          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: tb.bg, color: tb.color, fontFamily: 'var(--sans)' }}>{tb.label}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, fontFamily: 'var(--sans)' }}>
          {bill.category} · {bill.isAutoPay ? 'autopay' : 'manual pay'}
        </div>
      </div>

      {/* Status pill */}
      <span
        onClick={(e) => { e.stopPropagation(); onTogglePaid(bill._id, !bill.isPaid); }}
        style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, fontWeight: 500, background: pill.bg, color: pill.color, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'var(--sans)' }}
      >
        {pill.label}
      </span>

      {/* Amount / actions */}
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 96 }}>
        {hov ? (
          <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
            <button onClick={(e) => { e.stopPropagation(); onEdit(bill); }} style={{ padding: '3px 8px', borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', cursor: 'pointer', fontSize: 10 }}>Edit</button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(bill._id); }} style={{ padding: '3px 8px', borderRadius: 5, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)', color: 'var(--red)', cursor: 'pointer', fontSize: 10 }}>Del</button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 14, fontWeight: 500, color: t === 'overdue' ? 'var(--red)' : 'var(--text)', fontFamily: 'var(--mono)' }}>
              {USD.format(bill.amount)}
            </div>
            {due && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, fontFamily: 'var(--sans)' }}>{due}</div>}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', padding: '10px 0 5px', fontFamily: 'var(--sans)' }}>
      {label}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface Props {
  bills: BillResponse[];
  today: { d: number; m: number; y: number };
  onEdit: (b: BillResponse) => void;
  onDelete: (id: string) => void;
  onTogglePaid: (id: string, isPaid: boolean) => void;
  onToggleAutoPay: (id: string, isAutoPay: boolean) => void;
}

export function UnifiedPaymentsList({ bills, today, onEdit, onDelete, onTogglePaid, onToggleAutoPay: _onToggleAutoPay }: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter]     = useState<TypeFilter>('all');
  const mm = yyyymm(today);

  const visible = bills.filter(b => {
    if (typeFilter !== 'all' && billType(b) !== typeFilter) return false;
    const t = timing(b, today, mm);
    if (statusFilter === 'overdue')  return t === 'overdue';
    if (statusFilter === 'due-soon') return t === 'due-soon';
    if (statusFilter === 'paid')     return t === 'paid';
    return true;
  });

  const overdue  = visible.filter(b => timing(b, today, mm) === 'overdue');
  const dueSoon  = visible.filter(b => timing(b, today, mm) === 'due-soon');
  const upcoming = visible.filter(b => timing(b, today, mm) === 'upcoming');
  const paid     = visible.filter(b => timing(b, today, mm) === 'paid');

  const STATUS_CHIPS: { id: StatusFilter; label: string; danger?: boolean }[] = [
    { id: 'all',      label: 'All' },
    { id: 'overdue',  label: 'Overdue', danger: true },
    { id: 'due-soon', label: 'Due soon' },
    { id: 'paid',     label: 'Paid' },
  ];
  const TYPE_CHIPS: { id: TypeFilter; label: string }[] = [
    { id: 'all',          label: 'All types' },
    { id: 'bill',         label: 'Bills' },
    { id: 'subscription', label: 'Subscriptions' },
    { id: 'recurring',    label: 'Recurring' },
  ];

  function chipStyle(active: boolean, danger?: boolean): React.CSSProperties {
    if (active && danger) return { background: 'rgba(239,68,68,0.1)', border: '0.5px solid rgba(239,68,68,0.3)', color: 'var(--red)' };
    if (active) return { background: 'rgba(108,99,255,0.15)', border: '0.5px solid var(--accent)', color: 'var(--accent)' };
    if (danger) return { background: 'rgba(239,68,68,0.06)', border: '0.5px solid rgba(239,68,68,0.2)', color: 'var(--red)' };
    return { background: 'transparent', border: '0.5px solid rgba(255,255,255,0.15)', color: 'var(--text2)' };
  }
  function typeChipStyle(active: boolean): React.CSSProperties {
    return active
      ? { background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.8)' }
      : { background: 'transparent', border: '0.5px solid var(--border)', color: 'var(--text3)' };
  }

  const rowProps = { today, mm, onEdit, onDelete, onTogglePaid };

  return (
    <div data-testid="bills-panel" style={{ padding: '0 20px 24px' }}>
      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {STATUS_CHIPS.map(({ id, label, danger }) => (
          <button key={id} onClick={() => setStatusFilter(id)} style={{ fontSize: 12, padding: '4px 11px', borderRadius: 20, cursor: 'pointer', fontFamily: 'var(--sans)', transition: 'all 0.15s', ...chipStyle(statusFilter === id, danger) }}>
            {label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
          {TYPE_CHIPS.map(({ id, label }) => (
            <button key={id} onClick={() => setTypeFilter(id)} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, cursor: 'pointer', fontFamily: 'var(--sans)', transition: 'all 0.15s', ...typeChipStyle(typeFilter === id) }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Bill sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {overdue.length > 0 && <><SectionLabel label="Overdue" />{overdue.map(b => <BillRow key={b._id} bill={b} {...rowProps} />)}</>}
        {dueSoon.length > 0 && <><SectionLabel label="Due soon" />{dueSoon.map(b => <BillRow key={b._id} bill={b} {...rowProps} />)}</>}
        {upcoming.length > 0 && <><SectionLabel label="Upcoming" />{upcoming.map(b => <BillRow key={b._id} bill={b} {...rowProps} />)}</>}
        {paid.length > 0 && <><SectionLabel label="Paid this month" />{paid.map(b => <BillRow key={b._id} bill={b} {...rowProps} />)}</>}
        {visible.length === 0 && (
          <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 13, color: 'var(--text3)', fontFamily: 'var(--sans)' }}>
            {bills.length === 0 ? 'No bills yet — add one to get started' : 'No bills match this filter'}
          </div>
        )}
      </div>
    </div>
  );
}
