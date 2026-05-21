import React from 'react';

const USD0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// ── Status Hero ──────────────────────────────────────────────────────────────

type StatusVariant = 'good' | 'warn' | 'bad';

const STATUS_STYLES: Record<StatusVariant, { bg: string; border: string; color: string; dotShadow: string; dotBg: string }> = {
  good: { bg: 'linear-gradient(135deg, #0d1f15 0%, var(--surface) 60%)', border: 'rgba(34,197,94,0.2)', color: 'var(--green)', dotShadow: '0 0 8px var(--green)', dotBg: 'var(--green)' },
  warn: { bg: 'linear-gradient(135deg, #1f1a0d 0%, var(--surface) 60%)', border: 'rgba(212,148,58,0.2)', color: 'var(--gold)', dotShadow: '0 0 8px var(--gold)', dotBg: 'var(--gold)' },
  bad:  { bg: 'linear-gradient(135deg, #1f0d0d 0%, var(--surface) 60%)', border: 'rgba(239,68,68,0.2)', color: 'var(--red)', dotShadow: '0 0 8px var(--red)', dotBg: 'var(--red)' },
};

export function StatusHero({ variant, headline, subline }: { variant: StatusVariant; headline: string; subline: React.ReactNode }) {
  const s = STATUS_STYLES[variant];
  return (
    <section style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: '28px 28px 24px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10, color: s.color }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: s.dotBg, boxShadow: s.dotShadow }} />
        {headline}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 400 }}>{subline}</div>
    </section>
  );
}

// ── Month in Review ──────────────────────────────────────────────────────────

export function MonthInReview({ month, stats }: { month: string; stats: { label: string; value: string; detail: string; color?: string }[] }) {
  return (
    <section style={{ background: 'linear-gradient(135deg, #161224 0%, var(--surface) 60%)', border: '1px solid rgba(124,108,240,0.25)', borderRadius: 12, padding: '22px 24px', marginBottom: 20, position: 'relative' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--accent)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        ◇ {month} in Review
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Your month at a glance</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {stats.map(s => (
          <div key={s.label}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text3)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700, color: s.color ?? 'var(--text)' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{s.detail}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Anomaly Card ─────────────────────────────────────────────────────────────

export function AnomalyCard({ merchant, amount, usual }: { merchant: string; amount: string; usual: string }) {
  return (
    <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--gold)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--gold-a, rgba(212,148,58,0.15))', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>⚠</div>
      <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
        <strong style={{ color: 'var(--gold)', fontWeight: 600 }}>{merchant}</strong> is {amount} higher than your usual {usual}
      </div>
    </div>
  );
}

// ── Actionable Alert ─────────────────────────────────────────────────────────

type AlertType = 'warn' | 'danger' | 'info';

const ALERT_COLORS: Record<AlertType, { iconBg: string; iconColor: string; btnBg: string; btnColor: string }> = {
  warn:   { iconBg: 'var(--gold-a, rgba(212,148,58,0.15))', iconColor: 'var(--gold)',   btnBg: 'rgba(212,148,58,0.15)', btnColor: 'var(--gold)' },
  danger: { iconBg: 'var(--red-a, rgba(239,68,68,0.12))',   iconColor: 'var(--red)',     btnBg: 'rgba(239,68,68,0.12)',  btnColor: 'var(--red)' },
  info:   { iconBg: 'var(--accent-a)',                        iconColor: 'var(--accent)', btnBg: 'var(--accent-a)',        btnColor: 'var(--accent)' },
};

export function ActionableAlert({ type, title, desc, action, actionLabel }: { type: AlertType; title: string; desc: string; action?: string; actionLabel: string }) {
  const c = ALERT_COLORS[type];
  const icon = type === 'warn' ? '⚠' : type === 'danger' ? '!' : '↻';
  return (
    <div style={{ flex: 1, minWidth: 260, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0, background: c.iconBg, color: c.iconColor }}>{icon}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.4 }}>{desc}</div>
        </div>
      </div>
      {action && (
        <a href={action} style={{ alignSelf: 'flex-start', padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: c.btnBg, color: c.btnColor, textDecoration: 'none' }}>
          {actionLabel}
        </a>
      )}
    </div>
  );
}

// ── KPI Tile ─────────────────────────────────────────────────────────────────

interface KpiTileProps {
  label: string; value: string;
  trend?: { direction: 'up' | 'down' | 'neutral'; text: string };
  context: string; barPct: number; barVariant: 'good' | 'warn';
}

export function KpiTile({ label, value, trend, context, barPct, barVariant }: KpiTileProps) {
  const trendColor = trend?.direction === 'up' ? 'var(--green)' : trend?.direction === 'down' ? 'var(--red)' : 'var(--text3)';
  return (
    <div style={{ flex: '1 1 0', minWidth: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', cursor: 'pointer', transition: 'border-color .15s', position: 'relative', overflow: 'hidden' }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text3)', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 700, color: 'var(--text)', fontFeatureSettings: '"tnum"' }}>{value}</span>
        {trend && <span style={{ fontSize: 12, fontWeight: 600, color: trendColor }}>{trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '·'} {trend.text}</span>}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10, fontFamily: 'var(--mono)' }}>{context}</div>
      <div style={{ height: 4, background: 'var(--raised)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(barPct, 100)}%`, borderRadius: 2, transition: 'width 1s ease', background: barVariant === 'good' ? 'var(--green)' : 'var(--gold)' }} />
      </div>
    </div>
  );
}

// ── Section Title ────────────────────────────────────────────────────────────

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{title}</span>
      {subtitle && <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{subtitle}</span>}
    </div>
  );
}

// ── Category Row ─────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  food: '🍕', transport: '🚗', shopping: '🛒', entertainment: '🎬',
  utilities: '⚡', subscriptions: '↻', rent: '🏠', insurance: '🛡',
  health: '💊', other: '·',
};

export function getCategoryIcon(cat: string): string {
  return CATEGORY_ICONS[cat.toLowerCase()] ?? '·';
}

export function CategoryRow({ label, icon, spent, limit, barColor }: { label: string; icon: string; spent: number; limit: number; barColor: string }) {
  const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const over = spent > limit && limit > 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 16, width: 28, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', width: 100, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, position: 'relative', height: 6, background: 'var(--raised)', borderRadius: 3, overflow: 'visible' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: over ? 'var(--red)' : barColor, borderRadius: 3, transition: 'width 1s ease' }} />
        {limit > 0 && <div style={{ position: 'absolute', top: -2, bottom: -2, width: 2, background: 'var(--text3)', borderRadius: 1, left: `${Math.min((limit / Math.max(spent, limit)) * 100, 100)}%` }} />}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 90 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: over ? 'var(--red)' : 'var(--text)' }}>{USD0.format(spent)}</span>
        {limit > 0 && <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}> of {USD0.format(limit)}</span>}
      </div>
    </div>
  );
}
