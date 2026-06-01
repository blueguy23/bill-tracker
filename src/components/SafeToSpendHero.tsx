import type { PayPeriodStats, PayPeriodBounds } from '@/types/payPeriod';

const USD0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

interface Props {
  stats: PayPeriodStats;
  period: PayPeriodBounds;
}

function WaterfallRow({ label, value, color, barPct }: { label: string; value: string; color: string; barPct: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', width: 52, textAlign: 'right', flexShrink: 0 }}>
        {label}
      </div>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2, background: color,
          width: `${Math.min(Math.max(barPct, 2), 100)}%`,
        }} />
      </div>
      <div style={{ fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 500, color: 'var(--text2)', width: 56, textAlign: 'right', flexShrink: 0 }}>
        {value}
      </div>
    </div>
  );
}

export function SafeToSpendHero({ stats, period }: Props) {
  const { safeToSpend, income, spent, billsDue, spentPercent } = stats;
  const heroColor = safeToSpend >= 0 ? 'var(--green)' : 'var(--red)';

  const circumference = 2 * Math.PI * 36;
  const pct = Math.min(spentPercent, 100);
  const offset = circumference - (pct / 100) * circumference;
  const gaugeColor = spentPercent > 90 ? 'var(--red)' : spentPercent > 70 ? 'var(--gold)' : 'var(--green)';

  const daysLeft = Math.max(period.daysLeft, 1);
  const dailyAllowance = safeToSpend > 0 ? safeToSpend / daysLeft : 0;

  const maxVal = Math.max(income, 1);

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
      padding: 32, marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 32 }}>
        {/* Left: number + waterfall */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)', marginBottom: 8 }}>Safe to spend</div>
          <div style={{
            fontSize: 56, fontWeight: 700, fontFamily: 'var(--mono)',
            lineHeight: 1, letterSpacing: -3, color: heroColor,
          }}>
            {USD0.format(Math.abs(safeToSpend))}
          </div>
          {dailyAllowance > 0 && (
            <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 8 }}>
              {USD0.format(dailyAllowance)}/day · {daysLeft} days left
            </div>
          )}
          {safeToSpend <= 0 && (
            <div style={{ fontSize: 12, color: 'var(--red)', fontFamily: 'var(--mono)', marginTop: 8 }}>
              Over budget · {daysLeft} days left
            </div>
          )}

          {/* Waterfall breakdown */}
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <WaterfallRow label="Income" value={USD0.format(income)} color="var(--green)" barPct={(income / maxVal) * 100} />
            <WaterfallRow label="− Spent" value={USD0.format(spent)} color="var(--text3)" barPct={(spent / maxVal) * 100} />
            <WaterfallRow label="− Bills" value={USD0.format(billsDue)} color="var(--gold)" barPct={(billsDue / maxVal) * 100} />
          </div>
        </div>

        {/* Right: gauge ring */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <svg viewBox="0 0 88 88" width={88} height={88} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="44" cy="44" r="36" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
            <circle
              cx="44" cy="44" r="36" fill="none"
              stroke={gaugeColor} strokeWidth="5" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
            <g transform="rotate(90, 44, 44)">
              <text x="44" y="42" textAnchor="middle" fill="var(--text)"
                style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600 }}>
                {spentPercent}%
              </text>
              <text x="44" y="54" textAnchor="middle" fill="var(--text3)"
                style={{ fontFamily: 'var(--mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                spent
              </text>
            </g>
          </svg>
          <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Budget used
          </div>
        </div>
      </div>
    </div>
  );
}
