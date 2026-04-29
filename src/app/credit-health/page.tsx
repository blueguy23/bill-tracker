import type { Metadata } from 'next';
import type { CreditSummaryResponse } from '@/types/credit';
import type { CreditAdvisorResponse } from '@/types/creditAdvisor';
import { CreditView } from '@/components/CreditView';
import { getDb } from '@/adapters/db';
import { handleGetCreditSummary } from '@/handlers/credit';
import { handleGetCreditAdvisor } from '@/handlers/creditAdvisor';

export const metadata: Metadata = { title: 'Credit Health — Folio' };

const EMPTY_SUMMARY: CreditSummaryResponse = {
  accounts: [],
  overall: { totalBalance: 0, totalLimit: 0, utilization: null, accountCount: 0, accountsWithLimitData: 0 },
  recentPayments: [],
  score: null,
};

const EMPTY_ADVISOR: CreditAdvisorResponse = { trend: [], azeo: null };

export default async function CreditHealthPage() {
  const db = await getDb();

  const [summaryRes, advisorRes] = await Promise.all([
    handleGetCreditSummary(db),
    handleGetCreditAdvisor(db),
  ]);

  const summary = summaryRes.ok ? await summaryRes.json() as CreditSummaryResponse : EMPTY_SUMMARY;
  const advisor = advisorRes.ok ? await advisorRes.json() as CreditAdvisorResponse : EMPTY_ADVISOR;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg)' }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--sans)' }}>Credit Health</h1>
        <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2 }}>Credit utilization and payment activity</p>
      </div>
      <div style={{ padding: '24px 28px' }}>
        <CreditView initialData={summary} advisorData={advisor} />
      </div>
    </div>
  );
}
