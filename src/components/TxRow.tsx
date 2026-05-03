'use client';
import { useState } from 'react';
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

// Category SVG paths — matched to the design's icon set
const CATEGORY_ICON_PATH: Record<string, React.ReactNode> = {
  food: <><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></>,
  transport: <><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,
  shopping: <><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></>,
  entertainment: <><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></>,
  health: <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>,
  utilities: <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>,
  subscriptions: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  income: <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
  transfer: <><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></>,
  other: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
};

const wrapStyle: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
  background: 'var(--raised)', border: '1px solid var(--border)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  overflow: 'hidden',
};

function CategorySvg({ category }: { category: string }) {
  const hex = CATEGORY_COLORS[category] ?? '#71717a';
  const paths = CATEGORY_ICON_PATH[category] ?? CATEGORY_ICON_PATH.other;
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke={`${hex}b3`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths}
    </svg>
  );
}

function IconBox({ category, merchantDomain }: { category?: string; merchantDomain?: string | null }) {
  const [imgError, setImgError] = useState(false);
  const cat = category ?? 'other';

  if (merchantDomain && !imgError) {
    return (
      <div style={wrapStyle}>
        <img
          src={`https://www.google.com/s2/favicons?domain=${merchantDomain}&sz=32`}
          alt=""
          width={18}
          height={18}
          style={{ borderRadius: 3 }}
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      <CategorySvg category={cat} />
    </div>
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
      <div><IconBox category={txn.category} merchantDomain={txn.merchantDomain} /></div>

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
