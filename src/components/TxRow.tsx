'use client';
import { useState, useRef, useEffect } from 'react';
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
  onAmortizeChanged: (id: string, amortize: boolean) => void;
  onCustomNameChanged: (id: string, name: string | null) => void;
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

export function TxRow({ txn, acct, onCategoryChanged, onTagsChanged, onNotesChanged, onAmortizeChanged, onCustomNameChanged }: Props) {
  const isPos = txn.amount >= 0;
  const [hovered, setHovered] = useState(false);
  const [amortizePending, setAmortizePending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(txn.customName ?? txn.payee ?? txn.description);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingName) nameRef.current?.select();
  }, [editingName]);

  async function saveName() {
    setEditingName(false);
    const val = nameInput.trim() || null;
    const original = txn.customName ?? null;
    if (val === original) return;
    onCustomNameChanged(txn._id, val);
    try {
      const res = await fetch(`/api/v1/transactions/${txn._id}/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customName: val }),
      });
      if (!res.ok) onCustomNameChanged(txn._id, original);
    } catch {
      onCustomNameChanged(txn._id, original);
    }
  }

  async function toggleAmortize() {
    if (amortizePending) return;
    const next = !txn.amortize;
    setAmortizePending(true);
    onAmortizeChanged(txn._id, next); // optimistic
    try {
      const res = await fetch(`/api/v1/transactions/${txn._id}/amortize`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amortize: next }),
      });
      if (!res.ok) {
        onAmortizeChanged(txn._id, !next);
        showToast('Failed to save');
      } else {
        showToast(next ? 'Spreading over 12 months — see dashboard' : 'Spread removed');
      }
    } catch {
      onAmortizeChanged(txn._id, !next);
      showToast('Failed to save');
    } finally {
      setAmortizePending(false);
    }
  }
  const time = new Date(txn.posted).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const dateStr = new Date(txn.posted).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div style={{ position: 'relative' }}>
      {toast && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 4px)', right: 16, zIndex: 20,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '6px 12px',
          fontSize: 12, fontFamily: 'var(--sans)', color: 'var(--text2)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          animation: 'btSlideUp .15s ease',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          {toast}
        </div>
      )}
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
      onMouseEnter={e => { setHovered(true); (e.currentTarget as HTMLDivElement).style.background = txn.pending ? 'rgba(96,165,250,0.06)' : 'rgba(255,255,255,0.02)'; if (txn.pending) (e.currentTarget as HTMLDivElement).style.opacity = '0.85'; }}
      onMouseLeave={e => { setHovered(false); (e.currentTarget as HTMLDivElement).style.background = txn.pending ? 'rgba(96,165,250,0.03)' : 'transparent'; if (txn.pending) (e.currentTarget as HTMLDivElement).style.opacity = '0.65'; }}
    >
      <div><IconBox category={txn.category} merchantDomain={txn.merchantDomain} /></div>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 1, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          {editingName ? (
            <input
              ref={nameRef}
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void saveName(); if (e.key === 'Escape') { setEditingName(false); setNameInput(txn.customName ?? txn.payee ?? txn.description); } }}
              onBlur={() => void saveName()}
              style={{ fontSize: 13, fontWeight: 500, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 5, padding: '1px 6px', color: 'var(--text)', outline: 'none', width: '100%', maxWidth: 280 }}
            />
          ) : (
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: txn.customName ? 'var(--text)' : 'var(--text2)' }}>
              {txn.customName ?? txn.payee ?? txn.description}
            </span>
          )}
          {txn.pending && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)', fontFamily: 'var(--mono)', flexShrink: 0 }}>PENDING</span>}
          {txn.customName && !editingName && <span style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{txn.payee ?? txn.description}</span>}
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
        {txn.amortize && (
          <div style={{ fontSize: 9, color: '#63b3ed', fontWeight: 600, marginTop: 2, letterSpacing: '0.03em' }}>
            ÷12 · {USD.format(Math.abs(txn.amount) / 12)}/mo
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, opacity: hovered || txn.amortize ? 1 : 0, transition: 'opacity .1s' }}>
        {!isPos && !txn.isTransfer && (
          <button
            onClick={e => { e.stopPropagation(); void toggleAmortize(); }}
            style={{ ...actionBtn, borderColor: txn.amortize ? 'rgba(99,179,237,0.4)' : 'rgba(255,255,255,0.1)', color: txn.amortize ? '#63b3ed' : 'var(--text3)', background: txn.amortize ? 'rgba(99,179,237,0.08)' : 'var(--raised)', opacity: amortizePending ? 0.5 : 1 }}
            title={txn.amortize ? 'Remove yearly spread' : 'Spread over 12 months'}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </button>
        )}
        <button style={actionBtn} title="Split">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="3" x2="12" y2="21"/><polyline points="8 7 12 3 16 7"/><polyline points="8 17 12 21 16 17"/></svg>
        </button>
        <button
          onClick={e => { e.stopPropagation(); setNameInput(txn.customName ?? txn.payee ?? txn.description); setEditingName(true); }}
          style={{ ...actionBtn, ...(txn.customName ? { borderColor: 'rgba(99,179,237,0.4)', color: '#63b3ed', background: 'rgba(99,179,237,0.08)' } : {}) }}
          title={txn.customName ? `Rename (currently: ${txn.customName})` : 'Rename transaction'}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button style={actionBtn} title="Delete">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
    </div>
    </div>
  );
}
