'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { CategoryBudgetSummary } from '@/types/budget';
import type { BillCategory } from '@/types/bill';
import { SetBudgetModal } from './SetBudgetModal';

interface Props {
  initialData: { month: string; budgets: CategoryBudgetSummary[] };
}

const USD0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const USD  = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const CAT_COLOR: Record<BillCategory, string> = {
  utilities:     '#60a5fa',
  subscriptions: '#6366f1',
  insurance:     '#34d399',
  rent:          '#a78bfa',
  loans:         '#f97316',
  other:         '#f59e0b',
};

const FLEXIBLE: BillCategory[] = ['utilities', 'other'];
const FIXED: BillCategory[]    = ['rent', 'insurance', 'subscriptions', 'loans'];

type PaceStatus = 'on-track' | 'watch-out' | 'over' | 'no-budget';

const PACE_COLOR: Record<PaceStatus, string> = {
  'on-track':  'var(--green)',
  'watch-out': 'var(--gold)',
  'over':      'var(--red)',
  'no-budget': 'rgba(255,255,255,0.15)',
};
const PACE_ALPHA: Record<PaceStatus, string> = {
  'on-track':  'rgba(34,197,94,0.85)',
  'watch-out': 'rgba(245,158,11,0.85)',
  'over':      'rgba(239,68,68,0.85)',
  'no-budget': 'transparent',
};
const PACE_LABEL: Record<PaceStatus, string> = {
  'on-track':  'On pace',
  'watch-out': 'Watch out',
  'over':      'Over budget',
  'no-budget': 'No budget set',
};
const PACE_CHIP: Record<PaceStatus, React.CSSProperties> = {
  'on-track':  { background: 'rgba(34,197,94,0.10)',   color: 'var(--green)', border: '1px solid rgba(34,197,94,0.2)' },
  'watch-out': { background: 'rgba(245,158,11,0.10)',  color: 'var(--gold)',  border: '1px solid rgba(245,158,11,0.2)' },
  'over':      { background: 'rgba(239,68,68,0.10)',   color: 'var(--red)',   border: '1px solid rgba(239,68,68,0.2)' },
  'no-budget': { background: 'rgba(255,255,255,0.04)', color: 'var(--text3)', border: '1px solid var(--border)' },
};

function paceStatus(b: CategoryBudgetSummary, todayPct: number): PaceStatus {
  if (!b.effectiveBudget || b.effectiveBudget === 0) return 'no-budget';
  if (b.spent > b.effectiveBudget) return 'over';
  const spentPct = (b.spent / b.effectiveBudget) * 100;
  if (spentPct > todayPct + 10) return 'watch-out';
  return 'on-track';
}

function BudgetChartRow({ b, todayPct, onEdit }: { b: CategoryBudgetSummary; todayPct: number; onEdit: () => void }) {
  const [animPct, setAnimPct] = useState(0);
  const hasLimit = b.effectiveBudget !== null && b.effectiveBudget > 0;
  const rawPct   = hasLimit ? Math.min((b.spent / b.effectiveBudget!) * 100, 100) : 0;
  const ps       = paceStatus(b, todayPct);

  useEffect(() => {
    const t = setTimeout(() => setAnimPct(rawPct), 80);
    return () => clearTimeout(t);
  }, [rawPct]);

  return (
    <div onClick={onEdit} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 100px', alignItems: 'center', gap: 12, cursor: 'pointer', borderRadius: 5, padding: '3px 2px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: CAT_COLOR[b.category], flexShrink: 0, opacity: hasLimit ? 1 : 0.4 }} />
        <span style={{ fontSize: 12, color: hasLimit ? 'var(--text2)' : 'var(--text3)' }}>{b.category.charAt(0).toUpperCase() + b.category.slice(1)}</span>
      </div>

      {hasLimit ? (
        <div style={{ position: 'relative', height: 22, background: 'rgba(255,255,255,0.05)', borderRadius: 5, overflow: 'visible' }}>
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 5 }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${animPct}%`, background: PACE_ALPHA[ps], borderRadius: 5, transition: 'width 0.8s cubic-bezier(.4,0,.2,1)' }} />
          </div>
          <div style={{ position: 'absolute', top: -3, bottom: -3, left: `${todayPct}%`, width: 2, background: 'rgba(255,255,255,0.45)', borderRadius: 1, zIndex: 2 }} />
          {ps === 'watch-out' && b.effectiveBudget && (
            <div style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 9, fontFamily: 'var(--mono)', color: '#0b0b0f', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {USD0.format(b.effectiveBudget - b.spent)} left
            </div>
          )}
          {ps === 'over' && (
            <div style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 9, fontFamily: 'var(--mono)', color: '#0b0b0f', fontWeight: 600, whiteSpace: 'nowrap' }}>
              OVER
            </div>
          )}
        </div>
      ) : (
        <div style={{ position: 'relative', height: 22, background: 'rgba(255,255,255,0.03)', borderRadius: 5, border: '1px dashed rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
          <span style={{ fontSize: 10, color: 'var(--text3)' }}>No budget set{b.spent > 0 ? ` — ${USD.format(b.spent)} spent` : ''}</span>
        </div>
      )}

      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: ps === 'watch-out' || ps === 'over' ? PACE_COLOR[ps] : 'var(--text3)', textAlign: 'right', whiteSpace: 'nowrap', cursor: 'pointer' }}>
        {hasLimit ? `${USD0.format(b.spent)} / ${USD0.format(b.effectiveBudget!)}` : <span style={{ color: 'var(--gold)' }}>Set limit →</span>}
      </div>
    </div>
  );
}

function DetailCard({ title, total, rows }: { title: string; total: string; rows: { category: string; chip: PaceStatus; amount: string }[] }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text3)' }}>{title}</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)' }}>{total}</span>
      </div>
      <div style={{ padding: '8px 0' }}>
        {rows.map(({ category, chip, amount }, i) => (
          <div key={category} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 16px', fontSize: 12, borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
            <span style={{ color: 'var(--text2)' }}>{category}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 9, borderRadius: 4, padding: '1px 6px', fontFamily: 'var(--mono)', ...PACE_CHIP[chip] }}>{PACE_LABEL[chip]}</span>
              <span style={{ fontFamily: 'var(--mono)', color: chip === 'watch-out' || chip === 'over' ? PACE_COLOR[chip] : 'var(--text2)' }}>{amount}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BudgetView({ initialData }: Props) {
  const router = useRouter();
  const [editCategory, setEditCategory] = useState<string | null>(null);

  const now         = new Date();
  const todayDay    = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const todayPct    = ((todayDay - 0.5) / daysInMonth) * 100;
  const daysLeft    = daysInMonth - todayDay;
  const monthLabel  = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const { budgets } = initialData;
  const totalBudgeted = budgets.reduce((s, b) => s + (b.effectiveBudget ?? 0), 0);
  const totalSpent    = budgets.reduce((s, b) => s + b.spent, 0);
  const remaining     = totalBudgeted - totalSpent;

  const flexBudgets    = budgets.filter(b => (FLEXIBLE as string[]).includes(b.category));
  const fixedBudgets   = budgets.filter(b => (FIXED as string[]).includes(b.category));
  const flexSpent      = flexBudgets.reduce((s, b) => s + b.spent, 0);
  const flexBudgeted   = flexBudgets.reduce((s, b) => s + (b.effectiveBudget ?? 0), 0);
  const fixedCommitted = fixedBudgets.reduce((s, b) => s + b.spent, 0);

  const currentBudget = editCategory
    ? (initialData.budgets.find(b => b.category === editCategory)?.monthlyAmount ?? null)
    : null;

  async function handleSaveBudget(category: string, monthlyAmount: number) {
    const res = await fetch(`/api/v1/budgets/${category}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthlyAmount }),
    });
    if (!res.ok) {
      let msg = `Failed (${res.status})`;
      try { const j = await res.json() as { error?: string }; msg = j.error ?? msg; } catch { /* empty */ }
      throw new Error(msg);
    }
    router.refresh();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {remaining > 50 && (
        <div data-testid="unallocated-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)', borderRadius: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 600, color: 'var(--green)' }}>{USD0.format(remaining)} unallocated</div>
              <div style={{ fontSize: 12, color: 'rgba(34,197,94,0.75)' }}>You have money that hasn&apos;t been assigned a job yet</div>
              <div style={{ fontSize: 10, color: 'rgba(34,197,94,0.45)', marginTop: 1 }}>Add it to a budget category or send it to a goal</div>
            </div>
          </div>
          <button data-testid="allocate-btn" style={{ fontSize: 11, color: 'var(--green)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 5, padding: '4px 10px', background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Allocate →
          </button>
        </div>
      )}

      {/* ── CHART HERO ── */}
      <div data-testid="budget-chart" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>Spending vs. Budget</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{monthLabel} · {daysLeft} days remaining · pace marker shows where you should be today</div>
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }}/> Budget limit</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--green)' }}/> On pace</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--gold)' }}/> Watch out</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 2, height: 14, background: 'rgba(255,255,255,0.4)', borderRadius: 1 }}/> Today&apos;s pace</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {budgets.map(b => (
            <BudgetChartRow key={b.category} b={b} todayPct={todayPct} onEdit={() => setEditCategory(b.category)} />
          ))}
        </div>
      </div>

      {/* ── DETAIL CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <DetailCard
          title="Flexible spending"
          total={`${USD0.format(flexSpent)} / ${USD0.format(flexBudgeted)}`}
          rows={flexBudgets.map(b => ({
            category: b.category.charAt(0).toUpperCase() + b.category.slice(1),
            chip: paceStatus(b, todayPct),
            amount: USD0.format(b.spent),
          }))}
        />
        <DetailCard
          title="Fixed & Savings"
          total={`${USD0.format(fixedCommitted)} committed`}
          rows={fixedBudgets.map(b => ({
            category: b.category.charAt(0).toUpperCase() + b.category.slice(1),
            chip: paceStatus(b, todayPct),
            amount: USD0.format(b.spent),
          }))}
        />
      </div>

      <SetBudgetModal
        category={editCategory}
        currentAmount={currentBudget}
        onClose={() => setEditCategory(null)}
        onSave={handleSaveBudget}
      />
    </div>
  );
}
