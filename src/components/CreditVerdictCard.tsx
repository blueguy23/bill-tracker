'use client';

import type { OverallCreditStats, CreditAccountSummary, CreditPaymentRecord } from '@/types/credit';
import type { UtilizationDataPoint } from '@/types/creditAdvisor';

interface Props {
  displayScore: number | null;
  overall: OverallCreditStats;
  accounts: CreditAccountSummary[];
  recentPayments: CreditPaymentRecord[];
  trend: UtilizationDataPoint[];
}

const ARC_TOTAL = Math.PI * 110; // π * r, semicircle r=110 ≈ 345.6

export function scoreColor(s: number): string {
  if (s < 580) return 'var(--red)';
  if (s < 670) return 'var(--gold)';
  if (s < 740) return 'var(--accent)';
  if (s < 800) return '#60a5fa';
  return 'var(--green)';
}

export function scoreLabel(s: number): string {
  if (s < 580) return 'Poor';
  if (s < 670) return 'Fair';
  if (s < 740) return 'Good';
  if (s < 800) return 'Very Good';
  return 'Exceptional';
}

function ScoreGauge({ score, color }: { score: number; color: string }) {
  const pct      = (score - 300) / 550;
  const fill     = pct * ARC_TOTAL;
  const offset   = ARC_TOTAL - fill;
  const angleRad = ((-90 + pct * 180) * Math.PI) / 180;
  const nx = 140 + 90 * Math.cos(angleRad);
  const ny = 140 + 90 * Math.sin(angleRad);

  return (
    <div style={{ position: 'relative', width: 280, height: 155 }}>
      <svg width="280" height="155" viewBox="0 0 280 155">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f87171"/>
            <stop offset="25%" stopColor="#f59e0b"/>
            <stop offset="50%" stopColor="#e8c97e"/>
            <stop offset="75%" stopColor="#60a5fa"/>
            <stop offset="100%" stopColor="#4ade80"/>
          </linearGradient>
        </defs>
        <path d="M 30 140 A 110 110 0 0 1 250 140" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="16" strokeLinecap="round"/>
        <path d="M 30 140 A 110 110 0 0 1 250 140" fill="none" stroke="url(#gaugeGrad)" strokeWidth="16" strokeLinecap="round"
          strokeDasharray={String(ARC_TOTAL)} strokeDashoffset={String(offset)}
          style={{ filter: `drop-shadow(0 0 12px ${color}66)`, transition: 'stroke-dashoffset 1s ease' }}/>
        <line x1="140" y1="140" x2={nx} y2={ny} stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="140" cy="140" r="5" fill="rgba(255,255,255,0.5)"/>
      </svg>
      <div style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
        <div data-testid="credit-score" style={{ fontFamily: 'var(--mono)', fontSize: 52, fontWeight: 700, color, letterSpacing: '-3px', lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 1 }}>{scoreLabel(score)}</div>
        <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>300 – 850 scale</div>
      </div>
    </div>
  );
}

function Sparkline({ trend }: { trend: UtilizationDataPoint[] }) {
  if (trend.length < 2) {
    return (
      <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>Insufficient history</span>
      </div>
    );
  }
  const n    = trend.length;
  const vals = trend.map(p => 1 - p.utilization); // invert: lower util = higher
  const minV = Math.min(...vals), maxV = Math.max(...vals);
  const range = maxV - minV || 0.01;
  const pts   = vals.map((v, i) => `${(i / (n - 1)) * 400},${55 - ((v - minV) / range) * 50}`).join(' L');
  const area  = `M ${pts} L 400,60 L 0,60 Z`;
  const first = trend[0], last = trend[n - 1];

  return (
    <>
      <svg width="100%" height="60" viewBox="0 0 400 60" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(96,165,250,0.3)"/>
            <stop offset="100%" stopColor="rgba(96,165,250,0)"/>
          </linearGradient>
        </defs>
        <path d={`M ${pts}`} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round"
          style={{ filter: 'drop-shadow(0 0 6px rgba(96,165,250,0.5))' }}/>
        <path d={area} fill="url(#sparkGrad)"/>
        <circle cx="400" cy={55 - ((vals[n - 1]! - minV) / range) * 50} r="4" fill="var(--accent)"
          style={{ filter: 'drop-shadow(0 0 5px rgba(96,165,250,0.7))' }}/>
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
          {first && new Date(first.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </span>
        <span style={{ fontSize: 9, color: 'var(--accent)', fontFamily: 'var(--mono)' }}>
          {last && `${new Date(last.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} · ${Math.round((1 - last.utilization) * 100)}%`}
        </span>
      </div>
    </>
  );
}

export function CreditVerdictCard({ displayScore, overall, accounts, recentPayments, trend }: Props) {
  if (displayScore === null) return null;

  const color   = scoreColor(displayScore);
  const utilPct = overall.utilization !== null ? Math.round(overall.utilization * 100) : null;

  // Score change from trend
  const scoreChange = trend.length >= 2
    ? Math.round(((trend[0]?.utilization ?? 0) - (trend[trend.length - 1]?.utilization ?? 0)) * 60)
    : null;

  // Factors
  const pmtPct    = accounts.length > 0 ? Math.round((new Set(recentPayments.map(p => p.accountId)).size / accounts.length) * 100) : null;
  const FACTORS = [
    { label: 'Payment history', val: pmtPct !== null ? `${pmtPct}%` : 'No data', sub: pmtPct !== null ? 'On time' : '—', cls: pmtPct !== null && pmtPct >= 80 ? 'good' : 'warn' },
    { label: 'Utilization',     val: utilPct !== null ? `${utilPct}%` : 'No data', sub: utilPct !== null ? (utilPct < 30 ? 'Target met' : 'Target <30%') : '—', cls: utilPct === null ? 'neu' : utilPct < 30 ? 'good' : 'warn' },
    { label: 'Credit age',      val: 'No data',  sub: '—', cls: 'neu' },
    { label: 'Accounts',        val: `${accounts.length} open`, sub: accounts.length >= 3 ? 'Good mix' : 'Limited', cls: accounts.length >= 3 ? 'good' : 'warn' },
    { label: 'Hard inquiries',  val: 'No data',  sub: '—', cls: 'neu' },
    { label: 'Derogatory',      val: 'None',     sub: 'Clean record', cls: 'good' },
  ];
  const CLS_COLOR: Record<string, string> = { good: 'var(--green)', warn: 'var(--gold)', neu: 'var(--text3)' };

  const n = trend.length;

  return (
    <div data-testid="verdict-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `2px solid ${color}`, borderRadius: 12, padding: '28px 32px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'center' }}>

      {/* Left: gauge + score change */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <ScoreGauge score={displayScore} color={color}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: 280, padding: '0 4px' }}>
          {[['Poor','#f87171','300'],['Fair','#f59e0b','580'],['Good','#e8c97e','670'],['Very Good','#60a5fa','740'],['Exceptional','#4ade80','800']].map(([l,c,v]) => (
            <div key={v} style={{ fontSize: 8, fontFamily: 'var(--mono)', color: c, textAlign: 'center' }}>{l}<br/>{v}</div>
          ))}
        </div>
        {scoreChange !== null && (
          <div data-testid="score-change" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: scoreChange >= 0 ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)', border: `1px solid ${scoreChange >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`, borderRadius: 20, fontSize: 11, color: scoreChange >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--mono)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points={scoreChange >= 0 ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}/></svg>
            {scoreChange >= 0 ? '+' : ''}{scoreChange} pts trend
          </div>
        )}
      </div>

      {/* Right: context + sparkline + factors */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Your score is in the {scoreLabel(displayScore)} range</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>
            {displayScore >= 740
              ? 'You qualify for the best rates on most credit products.'
              : `Reaching ${displayScore < 670 ? '670 (Good)' : '740 (Very Good)'} would unlock better rates.`}
          </div>
        </div>

        {n >= 2 && (
          <div data-testid="score-sparkline" style={{ background: 'var(--raised)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Utilization history · {n} months</span>
            </div>
            <Sparkline trend={trend}/>
          </div>
        )}

        <div data-testid="factors-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {FACTORS.map(({ label, val, sub, cls }) => (
            <div key={label} style={{ background: 'var(--raised)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, color: CLS_COLOR[cls] }}>{val}</div>
              <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
