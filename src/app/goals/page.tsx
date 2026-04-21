import type { Metadata } from 'next';
import { GoalsView } from '@/components/GoalsView';

export const metadata: Metadata = { title: 'Goals — Folio' };

export default function GoalsPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg)' }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--sans)' }}>Financial Goals</h1>
        <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2 }}>Track progress toward your targets</p>
      </div>
      <div style={{ padding: '24px 28px' }}>
        <GoalsView />
      </div>
    </div>
  );
}
