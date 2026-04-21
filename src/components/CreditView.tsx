'use client';

import type { CreditSummaryResponse, CreditAccountSummary, OverallCreditStats, CreditPaymentRecord } from '@/types/credit';
import type { CreditAdvisorResponse } from '@/types/creditAdvisor';
import { RecentPaymentsPanel } from './RecentPaymentsPanel';
import { CreditAdvisorPanel } from './CreditAdvisorPanel';

interface CreditViewProps {
  initialData: CreditSummaryResponse;
  advisorData: CreditAdvisorResponse;
}

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function scoreFactors(
  overall: OverallCreditStats,
  accounts: CreditAccountSummary[],
  recentPayments: CreditPaymentRecord[],
): { label: string; status: string; value: number; color: string }[] {
  function statusColor(s: string) {
    return s === 'excellent' ? 'var(--green)' : s === 'good' ? 'oklch(0.68 0.22 265)' : s === 'fair' ? 'var(--gold)' : 'var(--text3)';
  }

  const utilPct = overall.utilization !== null ? overall.utilization * 100 : null;
  const utilStatus = utilPct === null ? 'no data' : utilPct <= 10 ? 'excellent' : utilPct <= 30 ? 'good' : utilPct <= 50 ? 'fair' : 'high';
  const utilBar    = utilPct === null ? 0 : utilPct <= 10 ? 95 : utilPct <= 30 ? 75 : utilPct <= 50 ? 50 : 20;

  const pmtCount  = recentPayments.length;
  const pmtStatus = pmtCount >= 5 ? 'excellent' : pmtCount >= 1 ? 'good' : 'no data';
  const pmtBar    = pmtCount >= 5 ? 100 : pmtCount >= 1 ? 72 : 0;

  const mixStatus = accounts.length >= 4 ? 'excellent' : accounts.length >= 2 ? 'good' : 'fair';
  const mixBar    = accounts.length >= 4 ? 90 : accounts.length >= 2 ? 68 : 45;

  return [
    { label: 'Credit Utilization', status: utilStatus,  value: utilBar,  color: statusColor(utilStatus) },
    { label: 'Payment History',    status: pmtStatus,   value: pmtBar,   color: statusColor(pmtStatus) },
    { label: 'Account Mix',        status: mixStatus,   value: mixBar,   color: statusColor(mixStatus) },
    { label: 'Credit Age',         status: 'no data',   value: 0,        color: 'var(--text3)' },
    { label: 'New Credit',         status: 'no data',   value: 0,        color: 'var(--text3)' },
  ];
}

function UtilizationGauge({ utilization }: { utilization: number | null }) {
  const pct    = utilization !== null ? Math.min(utilization * 100, 100) : 0;
  const angle  = (pct / 100) * 180 - 90;
  const rad    = (angle * Math.PI) / 180;
  const r = 80;
  const cx = 100, cy = 100;
  const nx = cx + r * Math.cos(rad);
  const ny = cy + r * Math.sin(rad);
  const da    = (pct / 100) * Math.PI * r;
  const total = Math.PI * r;
  const arcColor = pct <= 10 ? 'var(--green)' : pct <= 30 ? '#22c55e' : pct <= 50 ? 'var(--gold)' : 'var(--red)';
  const label = pct <= 10 ? 'Excellent' : pct <= 30 ? 'Very Good' : pct <= 50 ? 'Good' : 'High';

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="200" height="110" viewBox="0 0 200 110">
        <path d="M 10 100 A 90 90 0 0 1 190 100" fill="none" stroke="var(--raised)" strokeWidth="12" strokeLinecap="round" />
        <path
          d="M 10 100 A 90 90 0 0 1 190 100" fill="none" stroke={arcColor} strokeWidth="12"
          strokeLinecap="round" strokeDasharray={`${da} ${total}`}
          style={{ filter: `drop-shadow(0 0 8px ${arcColor}80)`, transition: 'stroke-dasharray 1s ease' }}
        />
        {utilization !== null && (
          <circle cx={nx} cy={ny} r="7" fill={arcColor} style={{ filter: `drop-shadow(0 0 6px ${arcColor})` }} />
        )}
        <text x="100" y="86" textAnchor="middle" fontFamily="var(--mono)" fontSize="28" fontWeight="300" fill="var(--text)">
          {utilization !== null ? `${Math.round(pct)}%` : '—'}
        </text>
        <text x="100" y="102" textAnchor="middle" fontFamily="var(--sans)" fontSize="11" fill="var(--text3)">
          {utilization !== null ? label : 'No limit data'}
        </text>
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--mono)', width: 180, margin: '0 auto' }}>
        <span>0%</span><span>100%</span>
      </div>
    </div>
  );
}

export function CreditView({ initialData, advisorData }: CreditViewProps) {
  const { accounts, overall, recentPayments } = initialData;

  if (accounts.length === 0) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>💳</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', fontFamily: 'var(--sans)', marginBottom: 6 }}>No credit accounts synced</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--sans)' }}>
          Connect your credit cards through SimpleFIN to track utilization.
        </div>
      </div>
    );
  }

  const utilPct = overall.utilization !== null ? overall.utilization * 100 : null;
  const arcColor = utilPct === null ? 'var(--text3)' : utilPct <= 10 ? 'var(--green)' : utilPct <= 30 ? '#22c55e' : utilPct <= 50 ? 'var(--gold)' : 'var(--red)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Gauge + factors */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
        {/* Gauge card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <UtilizationGauge utilization={overall.utilization} />
          {utilPct !== null && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 4, fontFamily: 'var(--mono)', background: `${arcColor}18`, color: arcColor }}>
              {utilPct <= 30 ? '↓' : '↑'} {Math.round(utilPct)}% UTILIZATION
            </span>
          )}
        </div>

        {/* Score Factors */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--sans)', marginBottom: 20 }}>Score Factors</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {scoreFactors(overall, accounts, recentPayments).map(({ label, status, value, color }) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--text2)', fontFamily: 'var(--sans)', fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--mono)', background: `${color}18`, color }}>{status.toUpperCase()}</span>
                </div>
                <div style={{ height: 4, background: 'var(--raised)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 2, boxShadow: `0 0 6px ${color}60` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4 stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'UTILIZATION',     value: utilPct !== null ? `${Math.round(utilPct)}%` : '—',         positive: utilPct === null || utilPct < 30 },
          { label: 'TOTAL BALANCE',   value: USD.format(overall.totalBalance),                            positive: false },
          { label: 'CREDIT LIMIT',    value: overall.accountsWithLimitData > 0 ? USD.format(overall.totalLimit) : '—', positive: true },
          { label: 'TOTAL ACCOUNTS',  value: String(accounts.length),                                     positive: true },
        ].map(({ label, value, positive }) => (
          <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px' }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginBottom: 8 }}>{label}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 500, color: positive ? 'var(--green)' : 'var(--gold)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Advisor panel */}
      <CreditAdvisorPanel data={advisorData} />

      {/* Recent payments */}
      <RecentPaymentsPanel payments={recentPayments} />
    </div>
  );
}
