'use client';

import type { OverallCreditStats } from '@/types/credit';
import type { AZEOPlan } from '@/types/creditAdvisor';

interface ActionItem {
  impact: string;
  impactLabel: string;
  title: string;
  desc: string;
  cta: string;
  href?: string;
}

interface Props {
  overall: OverallCreditStats;
  azeo: AZEOPlan | null;
  displayScore: number | null;
}

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function buildNowActions(overall: OverallCreditStats, azeo: AZEOPlan | null): ActionItem[] {
  const actions: ActionItem[] = [];
  const utilPct = overall.utilization !== null ? Math.round(overall.utilization * 100) : null;

  if (utilPct !== null && utilPct > 30) {
    const topCard = azeo?.cards
      .filter(c => c.paydownNeeded > 0)
      .sort((a, b) => b.paydownNeeded - a.paydownNeeded)[0];
    const desc = topCard
      ? `You're at ${utilPct}% overall. Pay ${USD.format(topCard.paydownNeeded)} on ${topCard.accountName} first — the biggest lever you have right now.`
      : `You're at ${utilPct}%. Paying balances below 30% is the single highest-impact action available.`;
    actions.push({
      impact: '+18',
      impactLabel: 'est. pts',
      title: 'Lower your credit utilization to under 30%',
      desc,
      cta: 'View utilization detail',
      href: '/settings',
    });
  }

  const alertCard = azeo?.cards.find(c => c.alertActive);
  if (alertCard) {
    const days = alertCard.daysUntilClose ?? 0;
    const guidance = alertCard.isAnchor
      ? `Keep balance at ${USD.format(alertCard.targetBalance)} (${Math.round(alertCard.targetUtilization * 100)}%) for optimal reporting.`
      : 'Pay to $0 before this date for AZEO strategy.';
    actions.push({
      impact: '+8',
      impactLabel: 'est. pts',
      title: `Pay ${alertCard.accountName} before statement closes`,
      desc: `Statement closes in ${days} day${days !== 1 ? 's' : ''}. ${guidance}`,
      cta: 'View AZEO plan',
    });
  }

  if (utilPct === null || utilPct > 15) {
    actions.push({
      impact: '+12',
      impactLabel: 'est. pts',
      title: 'Request a credit limit increase',
      desc: "Asking your issuer for a higher limit lowers your utilization ratio without changing spending. No hard inquiry if done through your bank's app.",
      cta: 'How to request',
    });
  }

  return actions;
}

const HABIT_ACTIONS: ActionItem[] = [
  {
    impact: '+35',
    impactLabel: 'over 12mo',
    title: 'Keep all payments on time, every month',
    desc: 'Payment history is 40% of your score. Set autopay on everything, even just the minimum, to protect a clean record.',
    cta: 'Review autopay settings',
    href: '/payments',
  },
  {
    impact: '+20',
    impactLabel: 'over 12mo',
    title: "Don't open new credit unless necessary",
    desc: 'Each hard inquiry costs a few points and temporarily lowers your average account age. Wait for existing inquiries to age off before applying for new lines.',
    cta: 'Learn more',
  },
  {
    impact: '+15',
    impactLabel: 'over 24mo',
    title: 'Keep your oldest accounts open',
    desc: "Credit age averages across all accounts. Don't close cards you don't use — older is always better.",
    cta: 'View account ages',
    href: '/settings',
  },
];

function ActionRow({ item, col }: { item: ActionItem; col: 'now' | 'habit' }) {
  const color = col === 'now' ? '#e8c97e' : '#60a5fa';
  return (
    <div data-testid="action-item" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0, width: 36 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color }}>{item.impact}</div>
        <div style={{ fontSize: 8, color: 'var(--text3)', textAlign: 'center', lineHeight: 1.2 }}>{item.impactLabel}</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>{item.title}</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.4 }}>{item.desc}</div>
        <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          {item.cta}
        </div>
      </div>
    </div>
  );
}

export function CreditActionsGrid({ overall, azeo, displayScore }: Props) {
  if (displayScore === null) return null;

  const nowActions = buildNowActions(overall, azeo);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text3)', padding: '0 4px' }}>
        Actions to improve your score
      </div>
      <div data-testid="actions-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

        <div data-testid="actions-now" style={{ background: 'var(--surface)', border: '1px solid rgba(232,201,126,0.15)', borderTop: '2px solid #e8c97e', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(232,201,126,0.10)', color: '#e8c97e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Do this now</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>High-impact, can action today</div>
            </div>
          </div>
          {nowActions.length > 0
            ? nowActions.map((item, i) => <ActionRow key={i} item={item} col="now" />)
            : <div style={{ padding: '16px', fontSize: 12, color: 'var(--text3)' }}>Utilization is healthy. Nothing urgent.</div>
          }
        </div>

        <div data-testid="actions-habit" style={{ background: 'var(--surface)', border: '1px solid rgba(96,165,250,0.12)', borderTop: '2px solid #60a5fa', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(96,165,250,0.10)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Build this habit</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>Long-term score builders</div>
            </div>
          </div>
          {HABIT_ACTIONS.map((item, i) => <ActionRow key={i} item={item} col="habit" />)}
        </div>

      </div>
    </div>
  );
}
