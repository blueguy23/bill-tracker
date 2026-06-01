'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { BillResponse } from '@/types/bill';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const CAT_ICONS: Record<string, string> = {
  Housing: '🏠', Utilities: '💡', Subscriptions: '📺', Fitness: '💪',
  Insurance: '🛡️', Credit: '💳', Food: '🍔', Transport: '🚗',
  Healthcare: '💊', Other: '📄',
};

function currentYYYYMM(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getDueDayLabel(
  dueDate: string | number,
  isPaid: boolean,
  paidMonth?: string,
): { label: string; overdue: boolean } {
  const effectivelyPaid = isPaid && paidMonth === currentYYYYMM();
  if (effectivelyPaid) return { label: '✓ PAID', overdue: false };

  const today    = new Date();
  const todayDay = today.getDate();

  if (typeof dueDate === 'number') {
    const overdue = dueDate < todayDay;
    const suffix  = dueDate === 1 ? 'ST' : dueDate === 2 ? 'ND' : dueDate === 3 ? 'RD' : 'TH';
    return { label: overdue ? '⚠ OVERDUE' : `DUE ${dueDate}${suffix}`, overdue };
  }

  const due  = new Date(dueDate);
  const diff = (due.getTime() - today.getTime()) / 86400000;
  const overdue = diff < 0;
  return {
    label: overdue ? '⚠ OVERDUE' : `DUE ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}`,
    overdue,
  };
}

interface BillRowProps {
  bill: BillResponse;
  onEdit: (bill: BillResponse) => void;
  onDelete: (id: string) => void;
  onTogglePaid: (id: string, isPaid: boolean) => void;
  onToggleAutoPay?: (id: string, isAutoPay: boolean) => void;
}

function BillRow({ bill, onEdit, onDelete, onTogglePaid, onToggleAutoPay }: BillRowProps) {
  const [hov, setHov]       = useState(false);
  const [paying, setPaying] = useState(false);
  const { label: dueLabel, overdue } = getDueDayLabel(bill.dueDate, bill.isPaid, bill.paidMonth);

  function handlePay() {
    setPaying(true);
    setTimeout(() => { onTogglePaid(bill._id, !bill.isPaid); setPaying(false); }, 350);
  }

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        background: hov ? 'rgba(237,237,245,0.02)' : 'transparent',
        transition: 'background .1s',
        opacity: bill.isPaid ? 0.6 : 1,
      }}
    >
      {/* Paid checkbox */}
      <button
        onClick={handlePay}
        style={{
          width: 22, height: 22, borderRadius: '50%',
          border: `2px solid ${bill.isPaid ? 'var(--green)' : 'var(--border-l)'}`,
          background: bill.isPaid ? 'var(--green)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0, transition: 'all .2s',
          transform: paying ? 'scale(0.85)' : 'scale(1)',
        }}
      >
        {bill.isPaid && <span style={{ color: '#000', fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}
      </button>

      {/* Icon + name + category */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{CAT_ICONS[bill.category] ?? '📄'}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--sans)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            textDecoration: bill.isPaid ? 'line-through' : 'none',
          }}>
            {bill.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2 }}>
            {bill.category.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Due date */}
      <div style={{ textAlign: 'center', flexShrink: 0, width: 90 }}>
        <div style={{ fontSize: 11, color: overdue ? 'var(--red)' : 'var(--text3)', fontFamily: 'var(--mono)', fontWeight: overdue ? 700 : 400 }}>
          {dueLabel}
        </div>
      </div>

      {/* AutoPay toggle */}
      {onToggleAutoPay && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <Switch checked={bill.isAutoPay} onCheckedChange={() => onToggleAutoPay(bill._id, bill.isAutoPay)} />
          <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', width: 44 }}>
            {bill.isAutoPay ? 'AUTO' : 'MANUAL'}
          </span>
        </div>
      )}

      {/* Amount */}
      <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 400, color: 'var(--text)', minWidth: 80, textAlign: 'right', flexShrink: 0 }}>
        {USD.format(bill.amount)}
      </div>

      {/* Edit / delete */}
      <div style={{ display: 'flex', gap: 6, opacity: hov ? 1 : 0, transition: 'opacity .1s', flexShrink: 0 }}>
        <Button variant="outline" size="sm" onClick={() => onEdit(bill)} className="px-2.5 h-7">
          ✎
        </Button>
        <Button variant="destructive" size="sm" onClick={() => onDelete(bill._id)} className="px-2.5 h-7">
          ✕
        </Button>
      </div>
    </div>
  );
}

interface BillTableProps {
  bills: BillResponse[];
  onEdit: (bill: BillResponse) => void;
  onDelete: (id: string) => void;
  onTogglePaid: (id: string, isPaid: boolean) => void;
  onToggleAutoPay?: (id: string, isAutoPay: boolean) => void;
}

export function BillTable({ bills, onEdit, onDelete, onTogglePaid, onToggleAutoPay }: BillTableProps) {
  if (bills.length === 0) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', fontFamily: 'var(--sans)', marginBottom: 6 }}>No bills yet</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--sans)' }}>Click &ldquo;Add Bill&rdquo; to get started</div>
      </div>
    );
  }

  return (
    <div data-testid="bills-table">
      {bills.map((bill) => (
        <BillRow
          key={bill._id}
          bill={bill}
          onEdit={onEdit}
          onDelete={onDelete}
          onTogglePaid={onTogglePaid}
          onToggleAutoPay={onToggleAutoPay}
        />
      ))}
    </div>
  );
}
