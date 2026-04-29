'use client';
import type { Account, Transaction } from '@/lib/simplefin/types';
import type { TransactionCategory } from '@/lib/categorization/types';
import { CATEGORY_COLORS } from '@/lib/category-colors';
import { TxCategoryBadge } from './TxCategoryBadge';
import { TxTagsRow } from './TxTagsRow';

interface Props {
  txn: Transaction;
  acct: Account | undefined;
  onCategoryChanged: (id: string, cat: TransactionCategory) => void;
  onTagsChanged: (id: string, tags: string[]) => void;
  onNotesChanged: (id: string, notes: string | null) => void;
}

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function shortAccount(acct: Account): string {
  const m = acct.name.match(/\d{4}$/);
  const type = acct.accountType === 'credit' ? 'Visa' :
               acct.accountType === 'checking' ? 'Checking' :
               acct.accountType === 'savings' ? 'Savings' : 'Acct';
  return m ? `${type} ···${m[0]}` : acct.name.slice(0, 14);
}

function IconBox({ category }: { category?: string }) {
  const hex = CATEGORY_COLORS[category ?? 'other'] ?? '#71717a';
  const initial = (category ?? 'other')[0]!.toUpperCase();
  return (
    <div style={{
      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
      background: `${hex}1a`, border: `1px solid ${hex}33`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: hex,
    }}>{initial}</div>
  );
}

const actionBtn: React.CSSProperties = {
  width: 22, height: 22, borderRadius: 5, border: '1px solid rgba(255,255,255,0.1)',
  background: 'var(--raised)', display: 'flex', alignItems: 'center',
  justifyContent: 'center', cursor: 'pointer', color: 'var(--text3)', flexShrink: 0,
};

export function TxRow({ txn, acct, onCategoryChanged, onTagsChanged, onNotesChanged }: Props) {
  const isPos = txn.amount >= 0;
  const time = new Date(txn.posted).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const dateStr = new Date(txn.posted).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div
      className="group/row"
      data-testid={txn.pending ? 'tx-row-pending' : 'tx-row'}
      style={{
        display: 'grid', gridTemplateColumns: '40px 1fr 120px 80px 100px 82px',
        padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)',
        alignItems: 'center', cursor: 'pointer', transition: 'background .1s',
        background: txn.pending ? 'rgba(96,165,250,0.03)' : 'transparent',
        opacity: txn.pending ? 0.65 : 1,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = txn.pending ? 'rgba(96,165,250,0.06)' : 'rgba(255,255,255,0.02)'; if (txn.pending) (e.currentTarget as HTMLDivElement).style.opacity = '0.85'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = txn.pending ? 'rgba(96,165,250,0.03)' : 'transparent'; if (txn.pending) (e.currentTarget as HTMLDivElement).style.opacity = '0.65'; }}
    >
      <div><IconBox category={txn.category} /></div>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 1, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{txn.payee ?? txn.description}</span>
          {txn.pending && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)', fontFamily: 'var(--mono)', flexShrink: 0 }}>PENDING</span>}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{dateStr} · {time}</div>
        {txn.memo && <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{txn.memo}</div>}
        <TxTagsRow txnId={txn._id} tags={txn.tags} notes={txn.notes} onTagsChanged={onTagsChanged} onNotesChanged={onNotesChanged} />
      </div>

      <div><TxCategoryBadge txnId={txn._id} category={txn.category} onChanged={onCategoryChanged} /></div>

      <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
        {acct ? shortAccount(acct) : '—'}
      </div>

      <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, textAlign: 'right', color: isPos ? 'var(--positive)' : 'var(--text)' }}>
        {isPos ? '+' : '−'}{USD.format(Math.abs(txn.amount))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, opacity: 0, transition: 'opacity .1s' }} className="group-hover/row:opacity-100">
        <button style={actionBtn} title="Split">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="3" x2="12" y2="21"/><polyline points="8 7 12 3 16 7"/><polyline points="8 17 12 21 16 17"/></svg>
        </button>
        <button style={actionBtn} title="Edit">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button style={actionBtn} title="Delete">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
    </div>
  );
}
