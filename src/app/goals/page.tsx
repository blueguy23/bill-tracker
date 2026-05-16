'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GoalResponse } from '@/types/goal';
import { GoalData, toGoalData, GoalsView } from '@/components/GoalsView';

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/goals')
      .then(r => r.json())
      .then((data: GoalResponse[]) => setGoals(data.map(toGoalData)))
      .catch(err => console.error('[Goals] fetch failed', err))
      .finally(() => setLoading(false));
  }, []);

  const handleGoalAdded = useCallback(async (g: GoalData) => {
    const res = await fetch('/api/v1/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: g.name,
        targetAmount: g.target,
        savedAmount: g.saved,
        monthlyContribution: g.contribution,
        targetDate: g.dueDate,
        linkedAccountId: g.linkedAccountId,
      }),
    });
    if (!res.ok) return;
    const created: GoalResponse = await res.json();
    setGoals(prev => [...prev, toGoalData(created)]);
  }, []);

  const handleGoalUpdated = useCallback(async (id: string, saved: number) => {
    const res = await fetch(`/api/v1/goals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ savedAmount: saved }),
    });
    if (!res.ok) return;
    setGoals(prev => prev.map(g => g.id === id ? { ...g, saved } : g));
  }, []);

  const handleGoalDeleted = useCallback(async (id: string) => {
    const res = await fetch(`/api/v1/goals/${id}`, { method: 'DELETE' });
    if (!res.ok) return;
    setGoals(prev => prev.filter(g => g.id !== id));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg)' }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--sans)' }}>Financial Goals</h1>
        <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2 }}>Track progress toward your targets</p>
      </div>
      <div style={{ padding: '24px 28px' }}>
        <GoalsView
          goals={goals}
          loading={loading}
          onGoalAdded={handleGoalAdded}
          onGoalUpdated={handleGoalUpdated}
          onGoalDeleted={handleGoalDeleted}
        />
      </div>
    </div>
  );
}
