'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SectionTitle, ListItem, USD } from './shared';
import type { DetailPanelData } from '../DetailPanel';

const CATEGORIES = ['food','transport','shopping','entertainment','health','utilities','subscriptions','income','transfer','rent','insurance','other'];

export function TransactionView({ index, data }: { index: number; data: DetailPanelData }) {
  const tx = data.transactions[index];
  if (!tx) return <div style={{ color: 'var(--text3)', fontSize: 12 }}>Transaction not found</div>;

  const amt = Number(tx.amount);
  const pos = amt >= 0;
  const date = tx.posted
    ? (tx.posted instanceof Date ? tx.posted : new Date(typeof tx.posted === 'number' ? tx.posted * 1000 : tx.posted))
        .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  const merchantTxns = data.transactions.filter(t => t.description === tx.description);
  const thisMonth = merchantTxns.filter(t => {
    if (!t.posted) return false;
    const d = t.posted instanceof Date ? t.posted : new Date(typeof t.posted === 'number' ? Number(t.posted) * 1000 : t.posted);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 12, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{thisMonth}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>This month</div>
        </div>
        <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 12, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{merchantTxns.length}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>All time</div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <SectionTitle>Details</SectionTitle>
        <ListItem left="Amount" right={`${pos ? '+' : '-'}${USD.format(Math.abs(amt))}`} rightColor={pos ? 'var(--green)' : 'var(--text)'} />
        <ListItem left="Date" right={date} />
        <ListItem left="Category" right={tx.category ?? 'Uncategorized'} />
      </div>

      <div>
        <SectionTitle>Recategorize</SectionTitle>
        <Select defaultValue={tx.category ?? 'other'}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
