'use client';

import type { CreditAdvisorResponse, AZEOCard } from '@/types/creditAdvisor';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function utilColor(util: number): string {
  if (util < 0.10) return 'var(--green)';
  if (util < 0.30) return '#22c55e';
  if (util < 0.70) return 'var(--gold)';
  return 'var(--red)';
}

function AZEOCardRow({ card }: { card: AZEOCard }) {
  const pct       = `${Math.round(card.currentUtilization * 100)}%`;
  const targetPct = `${Math.round(card.targetUtilization * 100)}%`;
  const color     = utilColor(card.currentUtilization);

  return (
    <div style={{
      borderRadius: 10, border: card.alertActive ? '1px solid rgba(245,158,11,.4)' : '1px solid var(--border)',
      background: card.alertActive ? 'rgba(245,158,11,.04)' : 'var(--raised)',
      padding: '16px', display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.accountName}</div>
          {card.isAnchor && (
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent)', background: 'oklch(0.68 0.22 265 / 0.12)', borderRadius: 10, padding: '2px 8px', display: 'inline-block', marginTop: 3, fontFamily: 'var(--mono)' }}>
              AZEO ANCHOR
            </span>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 17, fontWeight: 700, color }}>{pct}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 1 }}>
            {USD.format(card.currentBalance)} / {USD.format(card.creditLimit)}
          </div>
        </div>
      </div>

      {card.paydownNeeded > 0 && (
        <div style={{ borderRadius: 8, padding: '8px 10px', background: `${color}10`, fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--sans)' }}>
          Pay <strong style={{ color: 'var(--text)' }}>{USD.format(card.paydownNeeded)}</strong>
          {' → report '}
          <strong style={{ color: 'var(--text)' }}>{USD.format(card.targetBalance)} ({targetPct})</strong>
          {!card.isAnchor && (
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
              Pay <strong style={{ color: 'var(--text)' }}>{USD.format(card.currentBalance)}</strong> → report $0 (AZEO target)
            </div>
          )}
        </div>
      )}

      {card.paydownNeeded === 0 && (
        <div style={{ fontSize: 12, color: 'var(--green)', fontFamily: 'var(--sans)' }}>Already at target ({targetPct}) ✓</div>
      )}

      {card.statementClosingDay ? (
        <div style={{ fontSize: 11, fontFamily: 'var(--sans)', color: card.alertActive ? 'var(--gold)' : 'var(--text3)', fontWeight: card.alertActive ? 600 : 400 }}>
          {card.alertActive
            ? `⚠ Statement closes in ${card.daysUntilClose} day${card.daysUntilClose !== 1 ? 's' : ''} — pay now`
            : `Statement closes day ${card.statementClosingDay}${card.daysUntilClose !== null ? ` (${card.daysUntilClose}d away)` : ''}`}
        </div>
      ) : (
        <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--sans)' }}>
          Set statement closing date in <a href="/settings" style={{ color: 'var(--text2)', textDecoration: 'underline' }}>Settings</a> for close alerts
        </div>
      )}
    </div>
  );
}

export function CreditAdvisorPanel({ data }: { data: CreditAdvisorResponse }) {
  const { azeo } = data;
  if (!azeo) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* AZEO Plan */}
      {azeo && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', fontFamily: 'var(--mono)', letterSpacing: '.08em' }}>AZEO PAYDOWN PLAN</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--sans)', marginTop: 3 }}>
                All Zero Except One — pay every card to $0 except your anchor, left at {Math.round(azeo.anchorCard.targetUtilization * 100)}%
              </div>
            </div>
            {azeo.projectedScore !== null && (
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>If completed</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 17, fontWeight: 700, color: 'var(--green)' }}>
                  {azeo.projectedScore}<span style={{ fontSize: 11, color: 'var(--text3)' }}>/100</span>
                </div>
              </div>
            )}
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {azeo.cards.map((card) => (
              <AZEOCardRow key={card.accountId} card={card} />
            ))}
          </div>
          <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--sans)' }}>
              Projected utilization after AZEO: <span style={{ color: 'var(--text2)' }}>{Math.round(azeo.projectedOverallUtilization * 100)}%</span>
              {' · '}Configure statement dates in <a href="/settings" style={{ color: 'var(--text2)', textDecoration: 'underline' }}>Settings</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
