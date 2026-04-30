'use client';

import { useState, useEffect } from 'react';

export interface GoalData {
  id: string;
  name: string;
  target: number;
  saved: number;
  dueDate: string;      // ISO date string e.g. "2026-12-01"
  contribution: number; // monthly $ contribution
}

interface Props {
  goals?: GoalData[];
  onGoalAdded?: (g: GoalData) => void;
  onGoalDeleted?: (id: string) => void;
  onGoalUpdated?: (id: string, saved: number) => void;
  showAddModal?: boolean;
  onCloseAddModal?: () => void;
  onAddGoalClick?: () => void;
}

const USD0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const RING_CIRC = 2 * Math.PI * 58; // r=58 for 140px ring

export function goalState(g: GoalData): 'green' | 'amber' | 'idle' {
  if (g.contribution <= 0) return 'idle';
  const monthsNeeded = (g.target - g.saved) / g.contribution;
  const today = new Date();
  const due = new Date(g.dueDate);
  const monthsLeft = (due.getFullYear() - today.getFullYear()) * 12 + due.getMonth() - today.getMonth();
  return monthsNeeded <= monthsLeft ? 'green' : 'amber';
}

function finishDate(g: GoalData): string {
  if (g.contribution <= 0) return 'Never';
  const months = Math.ceil((g.target - g.saved) / g.contribution);
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function neededMonthly(g: GoalData): number {
  const today = new Date();
  const due = new Date(g.dueDate);
  const monthsLeft = Math.max(1, (due.getFullYear() - today.getFullYear()) * 12 + due.getMonth() - today.getMonth());
  return Math.ceil((g.target - g.saved) / monthsLeft);
}

// ── Goal card ────────────────────────────────────────────────────────────────

function GoalCard({ goal, onBoost }: { goal: GoalData; onBoost: (g: GoalData) => void }) {
  const [animPct, setAnimPct] = useState(0);
  const pct = Math.min((goal.saved / goal.target) * 100, 100);
  const state = goalState(goal);

  useEffect(() => {
    const t = setTimeout(() => setAnimPct(pct), 80);
    return () => clearTimeout(t);
  }, [pct]);

  const COLOR = { green: 'var(--green)', amber: 'var(--gold)', idle: 'rgba(255,255,255,0.15)' }[state];
  const BADGE_STYLE: Record<string, React.CSSProperties> = {
    green: { background: 'rgba(34,197,94,0.10)',  color: 'var(--green)', border: '1px solid rgba(74,222,128,0.2)' },
    amber: { background: 'rgba(245,158,11,0.10)', color: 'var(--gold)',  border: '1px solid rgba(245,158,11,0.2)' },
    idle:  { background: 'rgba(255,255,255,0.04)', color: 'var(--text3)', border: '1px solid var(--border)' },
  };
  const BADGE_LABEL = { green: '● On track', amber: '● Behind', idle: '● Idle' }[state];

  const fill = (animPct / 100) * RING_CIRC;
  const offset = RING_CIRC - fill;

  const finish = finishDate(goal);
  const needed = neededMonthly(goal);

  const boostText =
    state === 'green' ? `+$50/mo finishes earlier`
    : state === 'amber' ? `Need $${needed}/mo to hit deadline`
    : `Set $${needed}/mo to hit deadline`;

  return (
    <div data-testid="goal-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', minHeight: 300, cursor: 'pointer' }}>
      {/* Status stripe */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderRadius: '14px 14px 0 0', background: COLOR }} />
      {/* Badge */}
      <div style={{ position: 'absolute', top: 14, right: 14, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 4, fontSize: 9, fontFamily: 'var(--mono)', ...BADGE_STYLE[state] }}>
        {BADGE_LABEL}
      </div>

      {/* Ring */}
      <div style={{ position: 'relative', width: 140, height: 140, margin: '16px auto 8px', flexShrink: 0 }}>
        <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
          <circle fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" cx="70" cy="70" r="58"/>
          <circle fill="none" stroke={COLOR} strokeWidth="12" strokeLinecap="round" cx="70" cy="70" r="58"
            strokeDasharray={String(RING_CIRC)} strokeDashoffset={String(offset)}
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)', filter: state !== 'idle' ? `drop-shadow(0 0 10px ${COLOR}60)` : 'none' }}/>
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 32, fontWeight: 700, color: COLOR, lineHeight: 1 }}>{Math.round(pct)}%</span>
          <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>complete</span>
        </div>
      </div>

      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', textAlign: 'center', marginTop: 12, marginBottom: 2 }}>{goal.name}</div>
      <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', textAlign: 'center', marginBottom: 16 }}>Target {USD0.format(goal.target)} · {new Date(goal.dueDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 600, color: 'var(--text)', textAlign: 'center' }}>{USD0.format(goal.saved)}</div>
      <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', textAlign: 'center', marginBottom: 16 }}>of {USD0.format(goal.target)} saved</div>

      <div style={{ width: '100%', height: 1, background: 'var(--border)', margin: '4px 0 14px' }} />

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <span style={{ color: 'var(--text3)' }}>Contributing</span>
          <span style={{ fontFamily: 'var(--mono)', color: 'var(--text2)' }}>{goal.contribution > 0 ? `$${goal.contribution}/mo` : '$0/mo — nothing set'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <span style={{ color: 'var(--text3)' }}>{state === 'green' ? 'Finish date' : 'At this rate'}</span>
          <span style={{ fontFamily: 'var(--mono)', color: state === 'green' ? 'var(--green)' : 'var(--gold)' }}>
            {state === 'green' ? `${finish} ✓` : goal.contribution <= 0 ? 'Deadline missed' : `${finish} — too late`}
          </span>
        </div>
      </div>

      <button data-testid="boost-goal-btn" onClick={() => onBoost(goal)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, padding: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(232,201,126,0.2)', borderRadius: 8, fontSize: 11, color: 'var(--gold)', cursor: 'pointer' }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
        {boostText}
      </button>
    </div>
  );
}

// ── Add Goal Modal ───────────────────────────────────────────────────────────

function AddGoalModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (g: GoalData) => void }) {
  const [form, setForm] = useState({ name: '', target: '', saved: '', dueDate: '', contribution: '' });
  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));
  if (!open) return null;

  function handleSubmit() {
    if (!form.name || !form.target || !form.dueDate) return;
    onSave({ id: `goal-${Date.now()}`, name: form.name, target: parseFloat(form.target) || 0, saved: parseFloat(form.saved) || 0, dueDate: form.dueDate, contribution: parseFloat(form.contribution) || 0 });
    setForm({ name: '', target: '', saved: '', dueDate: '', contribution: '' });
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-l)', borderRadius: 16, width: '100%', maxWidth: 480, margin: '0 16px', boxShadow: '0 32px 80px rgba(0,0,0,.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--sans)' }}>New Goal</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {([['Goal Name', 'name', 'e.g. Emergency Fund', ''], ['Target Amount ($)', 'target', '10000', '$'], ['Already Saved ($)', 'saved', '0', '$'], ['Monthly Contribution ($)', 'contribution', '200', '$']] as [string, keyof typeof form, string, string][]).map(([lbl, key, ph, pfx]) => (
              <div key={key}>
                <label style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--sans)', fontWeight: 600, display: 'block', marginBottom: 6 }}>{lbl}</label>
                <input value={form[key]} onChange={e => set(key, e.target.value)} placeholder={ph} type={pfx ? 'number' : 'text'}
                  style={{ width: '100%', background: 'var(--raised)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--sans)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--sans)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Target Date</label>
            <input value={form.dueDate} onChange={e => set('dueDate', e.target.value)} type="date"
              style={{ width: '100%', background: 'var(--raised)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--sans)', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--sans)' }}>Cancel</button>
            <button onClick={handleSubmit} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--green)', color: '#0b0b0f', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--sans)', fontWeight: 600 }}>Create Goal</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main view ────────────────────────────────────────────────────────────────

export function GoalsView({ goals: externalGoals, onGoalAdded, onGoalDeleted: _onGoalDeleted, onGoalUpdated: _onGoalUpdated, showAddModal: externalShowAdd, onCloseAddModal, onAddGoalClick }: Props = {}) {
  const [localGoals, setLocalGoals] = useState<GoalData[]>([]);
  const [localShowAdd, setLocalShowAdd] = useState(false);

  const isControlled = externalGoals !== undefined;
  const goals = isControlled ? externalGoals! : localGoals;
  const showAdd = externalShowAdd ?? localShowAdd;

  function handleAddGoal(g: GoalData) {
    if (isControlled && onGoalAdded) {
      onGoalAdded(g);
    } else {
      setLocalGoals(prev => [...prev, g]);
    }
  }

  function handleCloseAdd() {
    if (onCloseAddModal) onCloseAddModal();
    else setLocalShowAdd(false);
  }

  function handleBoost(g: GoalData) {
    if (!isControlled) {
      const amount = parseFloat(prompt(`Deposit to ${g.name}:`) ?? '0') || 0;
      if (amount > 0) setLocalGoals(prev => prev.map(x => x.id === g.id ? { ...x, saved: Math.min(x.saved + amount, x.target) } : x));
    }
  }

  return (
    <>
      <div data-testid="goals-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {goals.map(g => <GoalCard key={g.id} goal={g} onBoost={handleBoost} />)}

        <div data-testid="add-goal-card" onClick={() => onAddGoalClick ? onAddGoalClick() : setLocalShowAdd(true)}
          style={{ background: 'transparent', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 300, cursor: 'pointer' }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(232,201,126,0.3)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--interactive-a)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}>
          <div style={{ width: 44, height: 44, background: 'var(--raised)', border: '1px solid var(--border-l)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text3)' }}>New goal</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', opacity: 0.5 }}>house · retirement · holiday</div>
        </div>
      </div>

      <AddGoalModal
        open={showAdd}
        onClose={handleCloseAdd}
        onSave={handleAddGoal}
      />
    </>
  );
}
