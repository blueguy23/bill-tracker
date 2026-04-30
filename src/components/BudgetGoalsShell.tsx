'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { CategoryBudgetSummary } from '@/types/budget';
import { GoalData, goalState, GoalsView } from './GoalsView';
import { BudgetView } from './BudgetView';

type Tab = 'budget' | 'goals';

interface Props {
  initialTab: Tab;
  budgetData: { month: string; budgets: CategoryBudgetSummary[] };
}

const USD0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const HERO_CIRC = 2 * Math.PI * 32; // r=32, ≈201.06

export function BudgetGoalsShell({ initialTab, budgetData }: Props) {
  const [tab, setTab]               = useState<Tab>(initialTab);
  const [goals, setGoals]           = useState<GoalData[]>([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [animSpentPct, setAnimSpentPct] = useState(0);
  const [animGoalPct,  setAnimGoalPct]  = useState(0);
  const router   = useRouter();
  const pathname = usePathname();

  const now          = new Date();
  const todayDay     = now.getDate();
  const daysInMonth  = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const todayPct     = ((todayDay - 0.5) / daysInMonth) * 100;
  const daysLeft     = daysInMonth - todayDay;

  const { budgets } = budgetData;
  const totalBudgeted = budgets.reduce((s, b) => s + (b.effectiveBudget ?? 0), 0);
  const totalSpent    = budgets.reduce((s, b) => s + b.spent, 0);
  const remaining     = totalBudgeted - totalSpent;
  const spentPct      = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;
  const isOnPace      = spentPct <= todayPct + 5;
  const remainColor   = remaining < 0 ? 'var(--red)' : isOnPace ? 'var(--green)' : 'var(--gold)';
  const watchOut      = budgets.find(b => b.status === 'warning' || b.status === 'over_budget');

  const totalSaved  = goals.reduce((s, g) => s + g.saved, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target, 0);
  const overallPct  = totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : 0;
  const onTrackCount = goals.filter(g => goalState(g) === 'green').length;
  const behindCount  = goals.filter(g => goalState(g) === 'amber').length;
  const idleCount    = goals.filter(g => goalState(g) === 'idle').length;

  useEffect(() => {
    const t = setTimeout(() => setAnimSpentPct(Math.min(spentPct, 100)), 80);
    return () => clearTimeout(t);
  }, [spentPct]);

  useEffect(() => {
    const t = setTimeout(() => setAnimGoalPct(overallPct), 80);
    return () => clearTimeout(t);
  }, [overallPct]);

  const monthElapsedOffset = HERO_CIRC * (1 - todayPct / 100);
  const spentArcOffset     = HERO_CIRC * (1 - animSpentPct / 100);
  const goalArcOffset      = HERO_CIRC * (1 - animGoalPct / 100);

  function switchTab(next: Tab) {
    setTab(next);
    router.replace(next === 'budget' ? pathname : `${pathname}?tab=${next}`, { scroll: false });
  }

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Page title + subtitle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--sans)', marginBottom: 2 }}>Budget &amp; Goals</h1>
          <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
            {tab === 'budget' ? 'Monthly spending by category' : 'Track progress toward your goals'}
          </p>
        </div>
      </div>

      {/* ── MORPHING HERO ── */}
      <div data-testid="budget-goals-hero" style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderTop: '2px solid var(--green)', borderRadius: 12, padding: '22px 28px 20px',
      }}>

        {/* Budget hero state */}
        <div style={{ display: tab === 'budget' ? 'block' : 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(34,197,94,0.5)', fontFamily: 'var(--mono)', marginBottom: 6 }}>
                Remaining this month
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                <div data-testid="budget-hero-remaining" style={{ fontFamily: 'var(--mono)', fontSize: 52, fontWeight: 700, color: remainColor, letterSpacing: '-2px', lineHeight: 1 }}>
                  {remaining < 0 ? `-${USD0.format(Math.abs(remaining))}` : USD0.format(remaining)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingBottom: 4 }}>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>for {daysLeft} day{daysLeft !== 1 ? 's' : ''} left</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: isOnPace ? 'var(--green)' : 'var(--gold)' }}>
                    {isOnPace
                      ? <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> On pace · spending normally</>
                      : <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Ahead of pace — watch spending</>}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: 14 }}>
                {([
                  { label: 'Spent',       value: USD0.format(totalSpent),    sub: `${Math.round(spentPct)}% of budget`, color: 'var(--text2)' },
                  null,
                  { label: 'Budgeted',    value: USD0.format(totalBudgeted), sub: 'total this month',                   color: 'var(--text2)' },
                  null,
                  { label: 'Unallocated', value: '$0',                       sub: 'not assigned',                       color: 'var(--accent)' },
                  ...(watchOut ? [null as null, { label: 'Watch out', value: watchOut.category, sub: `${watchOut.effectiveBudget ? Math.round((watchOut.spent / watchOut.effectiveBudget) * 100) : 0}% used`, color: 'var(--gold)' }] : []),
                ] as ({ label: string; value: string; sub: string; color: string } | null)[]).map((s, i) =>
                  s === null
                    ? <div key={i} style={{ width: 1, alignSelf: 'stretch', background: 'var(--border)', margin: '0 20px' }} />
                    : <div key={i}>
                        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: s.label === 'Watch out' ? 'var(--gold)' : 'var(--text3)', marginBottom: 2 }}>{s.label}</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 14, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>{s.sub}</div>
                      </div>
                )}
              </div>
            </div>

            {/* Pace arc + edit button */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 14 }}>
              <button data-testid="edit-budget-btn" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: 'transparent', border: '1px solid var(--border-l)', borderRadius: 7, fontSize: 11, color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit budgets
              </button>
              <div style={{ position: 'relative', width: 80, height: 80 }}>
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" cx="40" cy="40" r="32"/>
                  <circle fill="none" stroke={remainColor} strokeWidth="8" strokeLinecap="round" cx="40" cy="40" r="32"
                    strokeDasharray={String(HERO_CIRC)} strokeDashoffset={String(monthElapsedOffset)}
                    transform="rotate(-90 40 40)"
                    style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)' }}/>
                  <circle fill="none" stroke={`${remainColor}40`} strokeWidth="8" strokeLinecap="round" cx="40" cy="40" r="32"
                    strokeDasharray={String(HERO_CIRC)} strokeDashoffset={String(spentArcOffset)}
                    transform="rotate(-90 40 40)"
                    style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)' }}/>
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 700, color: remainColor }}>{Math.round(todayPct)}%</span>
                  <span style={{ fontSize: 8, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>month</span>
                </div>
              </div>
              <div style={{ fontSize: 9, color: 'var(--text3)', textAlign: 'center', fontFamily: 'var(--mono)', lineHeight: 1.4 }}>
                {Math.round(spentPct)}% spent<br/>{Math.round(todayPct)}% elapsed<br/>{isOnPace ? 'on pace ✓' : 'watch out'}
              </div>
            </div>
          </div>
        </div>

        {/* Goals hero state */}
        <div style={{ display: tab === 'goals' ? 'block' : 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(34,197,94,0.5)', fontFamily: 'var(--mono)', marginBottom: 6 }}>
                Total saved across all goals
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                <div data-testid="goals-hero-total" style={{ fontFamily: 'var(--mono)', fontSize: 52, fontWeight: 700, color: 'var(--green)', letterSpacing: '-2px', lineHeight: 1 }}>
                  {USD0.format(totalSaved)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingBottom: 4 }}>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>of {USD0.format(totalTarget)} total target</div>
                  {behindCount > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--gold)' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      {behindCount} goal{behindCount !== 1 ? 's' : ''} need{behindCount === 1 ? 's' : ''} attention
                    </div>
                  )}
                </div>
              </div>

              {/* Status chips */}
              <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                {onTrackCount > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 6, fontSize: 11, color: 'var(--green)', fontFamily: 'var(--mono)' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />{onTrackCount} on track
                  </div>
                )}
                {behindCount > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 6, fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--mono)' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)' }} />{behindCount} behind
                  </div>
                )}
                {idleCount > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text3)' }} />{idleCount} idle
                  </div>
                )}
              </div>
            </div>

            {/* Overall ring + add-goal button */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 14 }}>
              <button data-testid="add-goal-btn" onClick={() => setShowAddGoal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--green)', color: '#0b0b0f', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                New Goal
              </button>
              <div style={{ position: 'relative', width: 80, height: 80 }}>
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" cx="40" cy="40" r="32"/>
                  <circle fill="none" stroke="var(--green)" strokeWidth="8" strokeLinecap="round" cx="40" cy="40" r="32"
                    strokeDasharray={String(HERO_CIRC)} strokeDashoffset={String(goalArcOffset)}
                    transform="rotate(-90 40 40)"
                    style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)', filter: 'drop-shadow(0 0 6px rgba(34,197,94,0.3))' }}/>
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>{Math.round(overallPct)}%</span>
                  <span style={{ fontSize: 8, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>overall</span>
                </div>
              </div>
              <div style={{ fontSize: 9, color: 'var(--text3)', textAlign: 'center', fontFamily: 'var(--mono)', lineHeight: 1.4 }}>
                {USD0.format(totalSaved)} saved<br/>of {USD0.format(totalTarget)} target
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, borderBottom: '1px solid var(--border)', marginTop: -8 }}>
        {(['budget', 'goals'] as Tab[]).map(t => (
          <button key={t} data-testid={`tab-${t}`} onClick={() => switchTab(t)} style={{
            padding: '8px 16px', fontSize: 12, fontWeight: 500, fontFamily: 'var(--sans)',
            cursor: 'pointer', background: 'transparent', border: 'none',
            borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
            color: tab === t ? 'var(--gold)' : 'var(--text3)',
            marginBottom: -1, transition: 'all .1s',
          }}>
            {t === 'budget' ? 'Budget' : 'Goals'}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      {tab === 'budget' && <BudgetView initialData={budgetData} />}
      {tab === 'goals' && (
        <GoalsView
          goals={goals}
          onGoalAdded={g => setGoals(prev => [...prev, g])}
          showAddModal={showAddGoal}
          onCloseAddModal={() => setShowAddGoal(false)}
          onAddGoalClick={() => setShowAddGoal(true)}
        />
      )}
    </div>
  );
}
