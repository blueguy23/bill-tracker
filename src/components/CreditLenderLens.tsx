import type { JSX } from 'react';

interface Props {
  displayScore: number | null;
}

interface Band {
  rate: string;
  rateLabel: string;
  verdict: string;
  cls: 'good' | 'okay' | 'warn';
  detail: string;
  barPct: number;
  barLabel: string;
}

function mortgage(s: number): Band {
  if (s >= 740) return { rate: '~5.8%', rateLabel: 'estimated APR', verdict: 'Eligible — best available rates', cls: 'good', detail: 'You qualify for the most competitive 30-year rates available from conventional lenders.', barPct: 100, barLabel: 'Top tier — Exceptional' };
  if (s >= 670) return { rate: '~6.4%', rateLabel: 'estimated APR', verdict: 'Eligible — not the best rate', cls: 'okay', detail: `At 740+ you'd qualify for ~5.8% — saving ~$120/mo on a $400k mortgage.`, barPct: Math.round(((s - 300) / 550) * 100), barLabel: `${740 - s} points to Very Good tier (740)` };
  if (s >= 620) return { rate: '~7.5%', rateLabel: 'estimated APR', verdict: 'Eligible — elevated rate', cls: 'warn', detail: 'You qualify but at a subprime rate. Improving to 670 would meaningfully lower your payment.', barPct: Math.round(((s - 300) / 550) * 100), barLabel: `${670 - s} points to Good tier (670)` };
  return { rate: 'N/A', rateLabel: 'estimated APR', verdict: 'Likely not eligible', cls: 'warn', detail: 'Most conventional lenders require 620+. FHA loans may still be available.', barPct: Math.round(((s - 300) / 550) * 100), barLabel: `${620 - s} points to minimum threshold (620)` };
}

function auto(s: number): Band {
  if (s >= 740) return { rate: '~5.9%', rateLabel: 'estimated APR', verdict: 'Eligible — best tier', cls: 'good', detail: 'Tier 1 pricing. You qualify for the lowest auto rates from most lenders.', barPct: 100, barLabel: 'Top tier' };
  if (s >= 670) return { rate: '~7.1%', rateLabel: 'estimated APR', verdict: 'Eligible — competitive rate', cls: 'good', detail: "Tier 2 pricing. Most lenders will approve at standard rates. You're in good shape.", barPct: Math.round(((s - 300) / 550) * 100), barLabel: 'Strong position for auto financing' };
  if (s >= 580) return { rate: '~11.5%', rateLabel: 'estimated APR', verdict: 'Eligible — higher rate', cls: 'okay', detail: "You'll qualify but at elevated rates. A 670 score would drop your rate significantly.", barPct: Math.round(((s - 300) / 550) * 100), barLabel: `${670 - s} points to standard rate tier` };
  return { rate: '~16%+', rateLabel: 'estimated APR', verdict: 'Eligible — subprime only', cls: 'warn', detail: 'Dealership financing may be available but at very high rates. Consider improving score first.', barPct: Math.round(((s - 300) / 550) * 100), barLabel: `${580 - s} points to standard tier (580)` };
}

function cards(s: number): Band {
  if (s >= 740) return { rate: '~95%', rateLabel: 'approval odds', verdict: 'Eligible — all premium cards', cls: 'good', detail: 'Chase Sapphire Reserve, Amex Platinum, and all major rewards cards are within reach.', barPct: 100, barLabel: 'Exceptional approval odds' };
  if (s >= 670) return { rate: '~80%', rateLabel: 'approval odds', verdict: 'Eligible — most premium cards', cls: 'good', detail: 'Chase Sapphire, Amex Gold, and most travel cards are within reach at this score.', barPct: Math.round(((s - 300) / 550) * 100), barLabel: 'Most rewards cards accessible' };
  if (s >= 580) return { rate: '~55%', rateLabel: 'approval odds', verdict: 'Basic and secured cards', cls: 'okay', detail: "You can get starter and cash-back cards. Premium travel cards will be harder to qualify for.", barPct: Math.round(((s - 300) / 550) * 100), barLabel: `${670 - s} points to premium tier (670)` };
  return { rate: '~30%', rateLabel: 'approval odds', verdict: 'Secured cards only', cls: 'warn', detail: 'Focus on a secured card to build history. After 6-12 months of on-time payments your score will improve.', barPct: Math.round(((s - 300) / 550) * 100), barLabel: `${580 - s} points to standard tier (580)` };
}

const COLOR: Record<string, string> = { good: 'var(--green)', okay: '#e8c97e', warn: 'var(--gold)' };

const ICONS: Record<string, JSX.Element> = {
  mortgage: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>,
  auto:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  cards:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
};

export function CreditLenderLens({ displayScore }: Props) {
  if (displayScore === null) return null;

  const CARDS = [
    { testId: 'lender-card-mortgage', type: '30-Year Mortgage', icon: ICONS.mortgage, band: mortgage(displayScore) },
    { testId: 'lender-card-auto',     type: 'Auto Loan',        icon: ICONS.auto,     band: auto(displayScore) },
    { testId: 'lender-card-cards',    type: 'Premium Credit Cards', icon: ICONS.cards, band: cards(displayScore) },
  ];

  return (
    <div data-testid="lender-lens" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text3)', padding: '0 4px' }}>
        What your {displayScore} score means right now
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {CARDS.map(({ testId, type, icon, band }) => (
          <div key={testId} data-testid={testId} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, background: 'var(--raised)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>
                {icon}
              </div>
              <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>{type}</span>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>{band.rate}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{band.rateLabel}</div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, color: COLOR[band.cls] }}>{band.verdict}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>{band.detail}</div>
            <div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${band.barPct}%`, background: COLOR[band.cls], borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>{band.barLabel}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
