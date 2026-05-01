import type { Metadata } from 'next';
import type { CreditSummaryResponse } from '@/types/credit';
import type { CreditAdvisorResponse } from '@/types/creditAdvisor';
import { CreditVerdictCard } from '@/components/CreditVerdictCard';
import { CreditLenderLens } from '@/components/CreditLenderLens';
import { CreditActionsGrid } from '@/components/CreditActionsGrid';
import { getDb } from '@/adapters/db';
import { handleGetCreditSummary } from '@/handlers/credit';
import { handleGetCreditAdvisor } from '@/handlers/creditAdvisor';

export const metadata: Metadata = { title: 'Credit Health' };

const EMPTY_SUMMARY: CreditSummaryResponse = {
  accounts: [],
  overall: { totalBalance: 0, totalLimit: 0, utilization: null, accountCount: 0, accountsWithLimitData: 0 },
  recentPayments: [],
  score: null,
};

const EMPTY_ADVISOR: CreditAdvisorResponse = { trend: [], azeo: null };

export default async function CreditPage() {
  const db = await getDb();

  const [summaryRes, advisorRes] = await Promise.all([
    handleGetCreditSummary(db),
    handleGetCreditAdvisor(db),
  ]);

  const summary = summaryRes.ok ? await summaryRes.json() as CreditSummaryResponse : EMPTY_SUMMARY;
  const advisor = advisorRes.ok ? await advisorRes.json() as CreditAdvisorResponse : EMPTY_ADVISOR;
  const displayScore = summary.score;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'rgba(255,255,255,0.9)', fontFamily: 'var(--sans)', marginBottom: 2 }}>Credit Health</h1>
          <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>Utilization, payments, and score tracking</span>
        </div>
        <button data-testid="refresh-score-btn" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 7, fontSize: 11.5, color: 'var(--text3)', cursor: 'pointer' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Refresh
        </button>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {summary.accounts.length === 0 ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>💳</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', fontFamily: 'var(--sans)', marginBottom: 6 }}>No credit accounts synced</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--sans)' }}>
              Connect your credit cards through SimpleFIN to track utilization.
            </div>
          </div>
        ) : (
          <>
            <CreditVerdictCard
              displayScore={displayScore}
              overall={summary.overall}
              accounts={summary.accounts}
              recentPayments={summary.recentPayments}
              trend={advisor.trend}
            />
            <CreditLenderLens displayScore={displayScore} />
            <CreditActionsGrid
              overall={summary.overall}
              azeo={advisor.azeo}
              displayScore={displayScore}
            />
          </>
        )}
      </div>
    </div>
  );
}
