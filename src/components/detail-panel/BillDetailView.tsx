'use client';

import { SectionTitle, Callout, ListItem, USD } from './shared';
import type { DetailPanelData } from '../DetailPanel';

function formatDueDate(d: string | number): string {
  if (typeof d === 'number') {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function currentYYYYMM(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function BillDetailView({ name, data }: { name: string; data: DetailPanelData }) {
  const bill = data.bills.find(b => b.name === name && !b.isPaid) ?? data.bills.find(b => b.name === name);
  if (!bill) return <div style={{ color: 'var(--text3)', fontSize: 12 }}>Bill not found</div>;

  const ym = currentYYYYMM();
  const isPaid = bill.isPaid && bill.paidMonth === ym;

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Callout value={USD.format(bill.amount)} label={`${bill.category} · Due ${formatDueDate(bill.dueDate)}`} />
      </div>
      <div style={{ marginBottom: 24 }}>
        <SectionTitle>Status</SectionTitle>
        <ListItem left="Payment status"
          badge={{ label: isPaid ? 'Paid' : 'Due', bg: isPaid ? 'var(--green-a, rgba(34,197,94,0.12))' : 'var(--gold-a, rgba(212,148,58,0.12))', color: isPaid ? 'var(--green)' : 'var(--gold)' }} />
        <ListItem left="Auto-pay" right={bill.isAutoPay ? 'Enabled' : 'Off'} />
        <ListItem left="Recurring" right={bill.recurrenceInterval ?? 'One-time'} />
      </div>
      {bill.renewalNote && (
        <div>
          <SectionTitle>Renewal Note</SectionTitle>
          <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{bill.renewalNote}</div>
        </div>
      )}
    </>
  );
}
