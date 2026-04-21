'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { CategoryBudgetSummary } from '@/types/budget';
import { SetBudgetModal } from './SetBudgetModal';

interface Props {
  initialData: { month: string; budgets: CategoryBudgetSummary[] };
}

const PERIODS = ['1W', '1M', '3M', 'YTD', '1Y'] as const;
type Period = (typeof PERIODS)[number];
const MULT: Record<Period, number> = { '1W': 0.23, '1M': 1, '3M': 3, 'YTD': 3.6, '1Y': 12 };
const USD0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const USD  = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function BudgetBar({
  category, spent, limit, onEdit,
}: { category: string; spent: number; limit: number | null; onEdit: () => void }) {
  const hasLimit = limit !== null && limit > 0;
  const pct      = hasLimit ? Math.min((spent / limit!) * 100, 100) : 0;
  const over     = hasLimit && spent > limit!;
  const warn     = hasLimit && !over && pct > 80;
  const barColor = over ? 'var(--red)' : warn ? 'var(--gold)' : 'var(--accent)';
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 80);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--sans)', marginBottom: 3 }}>{category}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
            {!hasLimit ? 'No budget set' : over ? `OVER BY ${USD.format(spent - limit!)}` : `${USD.format(limit! - spent)} remaining`}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 400, color: over ? 'var(--red)' : 'var(--text)' }}>{USD0.format(spent)}</div>
          {hasLimit && (
            <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2 }}>of {USD0.format(limit!)}</div>
          )}
          <button
            onClick={onEdit}
            style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--mono)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4, letterSpacing: '.04em' }}
          >
            {hasLimit ? 'EDIT →' : 'SET →'}
          </button>
        </div>
      </div>
      <div style={{ height: 6, background: 'var(--raised)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${width}%`, background: barColor, borderRadius: 3,
          transition: 'width 0.8s cubic-bezier(.4,0,.2,1)',
          boxShadow: over ? '0 0 8px var(--red)' : warn ? '0 0 8px var(--gold)' : '0 0 8px oklch(0.68 0.22 265 / 0.4)',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        {hasLimit && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--mono)', background: over ? 'rgba(239,68,68,.15)' : warn ? 'rgba(234,179,8,.15)' : 'oklch(0.68 0.22 265 / 0.15)', color: barColor }}>
            {Math.round(pct)}%
          </span>
        )}
        {over && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--mono)', background: 'rgba(239,68,68,.12)', color: 'var(--red)' }}>
            ⚠ OVER BUDGET
          </span>
        )}
      </div>
    </div>
  );
}

export function BudgetView({ initialData }: Props) {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('1M');
  const [editCategory, setEditCategory] = useState<string | null>(null);
  const mul = MULT[period];

  const budgets = initialData.budgets.map((b) => ({
    ...b,
    effectiveBudget: b.effectiveBudget !== null ? Math.round(b.effectiveBudget * mul) : null,
    spent: Math.round(b.spent * mul),
  }));

  const totalLimit = budgets.reduce((s, b) => s + (b.effectiveBudget ?? 0), 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const remaining  = totalLimit - totalSpent;
  const overCount  = budgets.filter((b) => b.effectiveBudget !== null && b.spent > b.effectiveBudget).length;

  const currentBudget = editCategory
    ? (initialData.budgets.find((b) => b.category === editCategory)?.monthlyAmount ?? null)
    : null;

  async function handleSaveBudget(category: string, monthlyAmount: number) {
    const res = await fetch(`/api/v1/budgets/${category}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthlyAmount }),
    });
    if (!res.ok) {
      let msg = `Failed (${res.status})`;
      try { const j = await res.json() as { error?: string }; msg = j.error ?? msg; } catch { /* empty body */ }
      throw new Error(msg);
    }
    router.refresh();
  }

  return (
    <>
      {/* Sticky header with period selector */}
      <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--sans)' }}>Budget</h1>
          <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2 }}>Spending limits by category</p>
        </div>
        <div style={{ display: 'flex', background: 'var(--raised)', border: '1px solid var(--border)', borderRadius: 8, padding: 3, gap: 2 }}>
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '5px 11px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                cursor: 'pointer', border: 'none', fontFamily: 'var(--mono)',
                background: period === p ? 'var(--surface)' : 'transparent',
                color: period === p ? 'var(--text)' : 'var(--text3)',
                transition: 'all .12s',
                boxShadow: period === p ? '0 0 0 1px var(--border)' : 'none',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '24px 28px' }}>
      {/* 4 summary metric cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'TOTAL BUDGETED', value: USD0.format(totalLimit), color: 'var(--text)' },
          { label: 'TOTAL SPENT', value: USD0.format(totalSpent), color: totalSpent > totalLimit && totalLimit > 0 ? 'var(--red)' : 'var(--text)' },
          { label: 'REMAINING', value: `${remaining < 0 ? '-' : ''}${USD0.format(Math.abs(remaining))}`, color: remaining < 0 ? 'var(--red)' : 'var(--green)' },
          { label: 'OVER BUDGET', value: overCount > 0 ? `${overCount} categor${overCount === 1 ? 'y' : 'ies'}` : 'None ✓', color: overCount > 0 ? 'var(--red)' : 'var(--green)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 22px', flex: 1 }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>{label}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 300, color, letterSpacing: '.01em' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Budget bars */}
      {budgets.map((b) => (
        <BudgetBar
          key={b.category}
          category={b.category}
          spent={b.spent}
          limit={b.effectiveBudget}
          onEdit={() => setEditCategory(b.category)}
        />
      ))}

      <SetBudgetModal
        category={editCategory}
        currentAmount={currentBudget}
        onClose={() => setEditCategory(null)}
        onSave={handleSaveBudget}
      />
      </div>
    </>
  );
}
