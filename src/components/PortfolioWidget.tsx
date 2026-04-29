import type { Holding } from '@/lib/simplefin/types';

interface Props {
  holdings: Holding[];
}

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const USD0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function PortfolioWidget({ holdings }: Props) {
  if (holdings.length === 0) return null;

  const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);

  return (
    <div
      data-testid="portfolio-widget"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '20px',
        marginBottom: 20,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--sans)', marginBottom: 3 }}>
            Portfolio
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 300, color: 'var(--text)', letterSpacing: '0em', lineHeight: 1, fontFeatureSettings: '"tnum"' }}>
            {USD0.format(totalValue)}
          </div>
        </div>
        {/* Details link disabled — /accounts page not yet built */}
        <span
          style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', fontFamily: 'var(--mono)', letterSpacing: '.04em', padding: '4px 0', cursor: 'not-allowed', opacity: 0.4 }}
          title="Portfolio details coming soon"
        >
          Details →
        </span>
      </div>

      {/* Holdings table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {holdings.map(h => {
          const pct = totalValue > 0 ? (h.marketValue / totalValue) * 100 : 0;
          const label = h.ticker ?? h.description ?? 'Unknown';

          return (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              {/* Ticker badge */}
              <div style={{
                width: 44, flexShrink: 0,
                fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                color: 'var(--accent)', letterSpacing: '.04em',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {h.ticker ?? '—'}
              </div>

              {/* Description */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--sans)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {h.description ?? label}
                </div>
                {/* Weight bar */}
                <div style={{ height: 3, background: 'var(--raised)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 2, opacity: 0.6 }} />
                </div>
              </div>

              {/* Value */}
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--text2)', flexShrink: 0, textAlign: 'right' }}>
                {USD.format(h.marketValue)}
                {/* TODO: wire up Alpha Vantage for daily % change */}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 10, fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', letterSpacing: '.04em' }}>
        VIA SIMPLEFIN · MARKET DATA DELAYED
      </div>
    </div>
  );
}
