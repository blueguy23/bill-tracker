'use client';

import type { DetailPanelData } from '../DetailPanel';
import { USD, SectionTitle, ListItem, SummaryRow } from './shared';

function currentYYYYMM(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatDueDate(d: string | number): string {
  if (typeof d === 'number') {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface BillsViewProps {
  data: DetailPanelData;
}

export function BillsView({ data }: BillsViewProps) {
  const ym = currentYYYYMM();
  const paid = data.bills.filter(b => b.isPaid && b.paidMonth === ym);
  const unpaid = data.bills.filter(b => !b.isPaid || b.paidMonth !== ym);
  const totalPaid = paid.reduce((s, b) => s + b.amount, 0);
  const totalUnpaid = unpaid.reduce((s, b) => s + b.amount, 0);

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <SectionTitle>Paid</SectionTitle>
        {paid.length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>No bills paid yet</div>}
        {paid.map(b => (
          <ListItem key={b.name + b.amount} left={b.name} detail={`${b.category} · Due ${formatDueDate(b.dueDate)}`} right={USD.format(b.amount)}
            badge={{ label: b.isAutoPay ? 'Auto' : 'Paid', bg: 'var(--green-a, rgba(34,197,94,0.12))', color: 'var(--green)' }} />
        ))}
      </div>
      <div style={{ marginBottom: 24 }}>
        <SectionTitle>Upcoming / Unpaid</SectionTitle>
        {unpaid.length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>All bills covered!</div>}
        {unpaid.map(b => (
          <ListItem key={b.name + b.amount} left={b.name} detail={`${b.category} · Due ${formatDueDate(b.dueDate)}`} right={USD.format(b.amount)}
            badge={{ label: b.isAutoPay ? 'Auto' : 'Due', bg: 'var(--gold-a, rgba(212,148,58,0.12))', color: 'var(--gold)' }} />
        ))}
      </div>
      <SummaryRow label="Total paid" value={USD.format(totalPaid)} color="var(--green)" />
      <SummaryRow label="Remaining" value={USD.format(totalUnpaid)} color="var(--gold)" />
    </>
  );
}
