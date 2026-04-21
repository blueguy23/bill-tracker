'use client';

import { useState, useEffect } from 'react';

interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  emoji: string;
  color: string;
  deadline?: string;
  isMonthly?: boolean;
}

const DEFAULT_GOALS: Goal[] = [];
const GOAL_COLORS = ['#3b82f6', '#22c55e', '#c084fc', '#f59e0b', '#ef4444', '#06b6d4'];
const USD0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const USD  = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

// ── Animated SVG arc ring ─────────────────────────────────────────────────
function GoalRing({ pct, color, size = 120 }: { pct: number; color: string; size?: number }) {
  const [animPct, setAnimPct] = useState(0);
  useEffect(() => { requestAnimationFrame(() => setTimeout(() => setAnimPct(pct), 80)); }, [pct]);
  const r    = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (animPct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--raised)" strokeWidth={8} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 6px ${color}80)` }}
      />
    </svg>
  );
}

// ── Goal card ─────────────────────────────────────────────────────────────
function GoalCard({ goal, onDeposit, onEdit }: { goal: Goal; onDeposit: (g: Goal) => void; onEdit: (g: Goal) => void }) {
  const [hov, setHov] = useState(false);
  const pct       = Math.min((goal.current / goal.target) * 100, 100);
  const remaining = goal.target - goal.current;
  const deadline  = goal.deadline ? new Date(goal.deadline) : null;
  const daysLeft  = deadline ? Math.ceil((deadline.getTime() - Date.now()) / 86400000) : null;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'var(--surface)', border: `1px solid ${hov ? 'var(--border-l)' : 'var(--border)'}`,
        borderRadius: 12, padding: '24px',
        transition: 'border-color .15s, transform .15s, box-shadow .15s',
        transform: hov ? 'translateY(-1px)' : 'none',
        boxShadow: hov ? '0 8px 32px rgba(0,0,0,0.4)' : 'none',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Glow bg */}
      <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: `${goal.color}08`, pointerEvents: 'none' }} />

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Ring */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <GoalRing pct={pct} color={goal.color} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: goal.color, fontFamily: 'var(--mono)', letterSpacing: '.02em' }}>{Math.round(pct)}%</div>
            <div style={{ fontSize: 18, lineHeight: 1 }}>{goal.emoji}</div>
          </div>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--sans)', marginBottom: 4 }}>{goal.name}</h3>
              {daysLeft !== null && (
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--mono)', background: daysLeft < 30 ? 'rgba(239,68,68,.12)' : 'rgba(34,197,94,.12)', color: daysLeft < 30 ? 'var(--red)' : 'var(--green)' }}>
                  {daysLeft}d left
                </span>
              )}
            </div>
            <div style={{ opacity: hov ? 1 : 0, transition: 'opacity .15s', display: 'flex', gap: 6 }}>
              <button onClick={() => onEdit(goal)} style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: 'rgba(237,237,245,0.06)', color: 'var(--text2)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--sans)' }}>✎</button>
              <button onClick={() => onDeposit(goal)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(34,197,94,.3)', background: 'rgba(34,197,94,.1)', color: 'var(--green)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--sans)', fontWeight: 600 }}>+ Deposit</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
            {[['SAVED', USD0.format(goal.current), 'var(--text)'], ['TARGET', USD0.format(goal.target), 'var(--text2)'], ['REMAINING', remaining <= 0 ? 'COMPLETE ✓' : USD0.format(remaining), remaining <= 0 ? 'var(--green)' : 'var(--text2)']].map(([lbl, val, clr]) => (
              <div key={lbl}>
                <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginBottom: 3 }}>{lbl}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 17, fontWeight: 400, color: clr, letterSpacing: '.01em' }}>{val}</div>
              </div>
            ))}
          </div>

          <div style={{ height: 4, background: 'var(--raised)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: goal.color, borderRadius: 2, transition: 'width 1s ease', boxShadow: `0 0 8px ${goal.color}60` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Deposit modal ──────────────────────────────────────────────────────────
function DepositModal({ goal, onClose, onSave }: { goal: Goal | null; onClose: () => void; onSave: (id: string, amount: number) => void }) {
  const [amount, setAmount] = useState('');
  if (!goal) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', animation: 'btFadeIn .15s ease' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-l)', borderRadius: 16, width: '100%', maxWidth: 480, margin: '0 16px', boxShadow: '0 32px 80px rgba(0,0,0,.6)', animation: 'btSlideUp .18s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--sans)' }}>Deposit to {goal.name}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '24px' }}>
          <div style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--sans)', marginBottom: 12 }}>Current balance: {USD.format(goal.current)}</div>
          <label style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--sans)', fontWeight: 600, display: 'block', marginBottom: 8 }}>Deposit amount</label>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: 13, fontFamily: 'var(--sans)' }}>$</span>
            <input autoFocus value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" type="text"
              style={{ width: '100%', background: 'var(--raised)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px 9px 28px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--sans)', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[100, 250, 500, 1000].map(v => (
              <button key={v} onClick={() => setAmount(String(v))} style={{ padding: '5px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--raised)', color: 'var(--text2)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--sans)' }}>
                ${v}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--sans)' }}>Cancel</button>
            <button onClick={() => { onSave(goal.id, parseFloat(amount) || 0); onClose(); }} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--sans)', fontWeight: 600 }}>Deposit</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add goal modal ─────────────────────────────────────────────────────────
function AddGoalModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (g: Goal) => void }) {
  const [form, setForm] = useState({ name: '', target: '', current: '', emoji: '🎯', color: '#3b82f6', deadline: '' });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', animation: 'btFadeIn .15s ease' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-l)', borderRadius: 16, width: '100%', maxWidth: 520, margin: '0 16px', boxShadow: '0 32px 80px rgba(0,0,0,.6)', animation: 'btSlideUp .18s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--sans)' }}>New Goal</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {([['Goal Name', 'name', 'e.g. New Car', 'text', ''], ['Emoji', 'emoji', '🎯', 'text', ''], ['Target Amount', 'target', '10000', 'text', '$'], ['Already Saved', 'current', '0', 'text', '$']] as [string,string,string,string,string][]).map(([lbl, key, ph, type, pfx]) => (
              <div key={key}>
                <label style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--sans)', fontWeight: 600, display: 'block', marginBottom: 6 }}>{lbl}</label>
                <div style={{ position: 'relative' }}>
                  {pfx && <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: 13, fontFamily: 'var(--sans)' }}>{pfx}</span>}
                  <input autoFocus={key === 'name'} value={(form as Record<string, string>)[key]} onChange={e => set(key, e.target.value)} placeholder={ph} type={type}
                    style={{ width: '100%', background: 'var(--raised)', border: '1px solid var(--border)', borderRadius: 8, padding: pfx ? '9px 12px 9px 28px' : '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--sans)', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
            ))}
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--sans)', fontWeight: 600, display: 'block', marginBottom: 8 }}>Color</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {GOAL_COLORS.map(c => (
                <button key={c} onClick={() => set('color', c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: form.color === c ? '3px solid var(--text)' : '3px solid transparent', cursor: 'pointer', boxShadow: `0 0 8px ${c}60`, transition: 'border .1s' }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--sans)' }}>Cancel</button>
            <button
              onClick={() => {
                if (!form.name || !form.target) return;
                onSave({ id: `goal-${Date.now()}`, name: form.name, target: parseFloat(form.target) || 0, current: parseFloat(form.current) || 0, emoji: form.emoji || '🎯', color: form.color, deadline: form.deadline || undefined });
                onClose();
              }}
              style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--sans)', fontWeight: 600 }}
            >
              Create Goal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main view ──────────────────────────────────────────────────────────────
export function GoalsView() {
  const [goals, setGoals]     = useState<Goal[]>(DEFAULT_GOALS);
  const [deposit, setDeposit] = useState<Goal | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const totalSaved  = goals.reduce((s, g) => s + g.current, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target, 0);
  const completed   = goals.filter(g => g.current >= g.target).length;
  const overallPct  = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  function handleDeposit(id: string, amount: number) {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, current: Math.min(g.current + amount, g.target) } : g));
  }

  return (
    <>
      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'TOTAL SAVED', value: USD0.format(totalSaved), color: 'var(--green)' },
          { label: 'TOTAL TARGET', value: USD0.format(totalTarget), color: 'var(--text)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 22px', flex: 1 }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginBottom: 6 }}>{label}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 300, color, letterSpacing: '.01em' }}>{value}</div>
          </div>
        ))}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 22px', flex: 2 }}>
          <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginBottom: 6 }}>OVERALL PROGRESS</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 6, background: 'var(--raised)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${overallPct}%`, background: 'var(--accent)', borderRadius: 3, transition: 'width 1s ease', boxShadow: '0 0 8px oklch(0.68 0.22 265 / 0.5)' }} />
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{Math.round(overallPct)}%</div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 6 }}>{completed}/{goals.length} goals complete</div>
        </div>
      </div>

      {/* Header + Add button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', fontFamily: 'var(--mono)', letterSpacing: '.06em' }}>YOUR GOALS</div>
        <button onClick={() => setShowAdd(true)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--sans)', fontWeight: 600 }}>+ New Goal</button>
      </div>

      {/* Goal cards */}
      {goals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--text3)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', fontFamily: 'var(--sans)', marginBottom: 6 }}>No goals yet</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--sans)', marginBottom: 24 }}>Set a financial goal to start tracking your progress</div>
          <button onClick={() => setShowAdd(true)} style={{ padding: '10px 22px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--sans)', fontWeight: 600 }}>Create your first goal</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {goals.map(g => (
            <GoalCard key={g.id} goal={g} onDeposit={setDeposit} onEdit={() => {}} />
          ))}
        </div>
      )}

      <DepositModal goal={deposit} onClose={() => setDeposit(null)} onSave={handleDeposit} />
      <AddGoalModal open={showAdd} onClose={() => setShowAdd(false)} onSave={g => setGoals(p => [...p, g])} />
    </>
  );
}
