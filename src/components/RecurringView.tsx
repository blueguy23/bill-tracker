'use client';

import { useState, useRef } from 'react';
import type { BillResponse } from '@/types/bill';
import { BillsView, type BillsViewHandle } from './BillsView';
import { RecurringStats } from './RecurringStats';

type Filter = 'all' | 'unpaid' | 'paid' | 'autopay';

interface RecurringViewProps {
  bills: BillResponse[];
  totalMonthly: number;
  totalPaid: number;
  autoPayCount: number;
}

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const FILTERS: Filter[] = ['all', 'unpaid', 'paid', 'autopay'];

export function RecurringView({ bills, totalMonthly, totalPaid, autoPayCount }: RecurringViewProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const billsViewRef = useRef<BillsViewHandle>(null);

  const filtered = filter === 'all'    ? bills
    : filter === 'paid'    ? bills.filter(b => b.isPaid)
    : filter === 'unpaid'  ? bills.filter(b => !b.isPaid)
    : bills.filter(b => b.isAutoPay);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stats + actions row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'TOTAL / MO', value: USD.format(totalMonthly), color: 'var(--text)' },
            { label: 'PAID',       value: USD.format(totalPaid),    color: 'var(--green)' },
            { label: 'REMAINING',  value: USD.format(totalMonthly - totalPaid), color: 'var(--red)' },
            { label: 'AUTOPAY',    value: `${autoPayCount} bills`,  color: 'var(--green)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 16px' }}>
              <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--mono)', marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 14, color }}>{value}</div>
            </div>
          ))}
        </div>
        <button
          data-testid="add-bill-btn"
          onClick={() => billsViewRef.current?.openCreate()}
          style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--gold)', color: '#0b0b0f', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--sans)', fontWeight: 600, flexShrink: 0 }}
        >
          + Add Bill
        </button>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 4 }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
            fontSize: 11, fontWeight: 600, fontFamily: 'var(--mono)', letterSpacing: '.04em', textTransform: 'uppercase',
            background: filter === f ? 'rgba(232,201,126,0.12)' : 'var(--raised)',
            color: filter === f ? 'var(--gold)' : 'var(--text3)',
            transition: 'all .12s',
          }}>
            {f}
          </button>
        ))}
      </div>

      <RecurringStats bills={bills} />

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <BillsView ref={billsViewRef} initialBills={filtered} hideAddButton />
      </div>
    </div>
  );
}
