'use client';

import { ResponsiveContainer } from 'recharts';

export const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
export const USD0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export const AXIS_STYLE = {
  tickLine: false as const,
  axisLine: false as const,
  tick: { fill: '#44445a', fontFamily: "'IBM Plex Mono',monospace", fontSize: 10 },
};

export const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'var(--mono)', fontSize: 12 },
  labelStyle: { color: 'var(--text)', fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: 'var(--text2)', padding: 0 },
};

export function SectionTitle({ children }: { children: string }) {
  return <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text3)', marginBottom: 12 }}>{children}</div>;
}

export function Callout({ value, label, valueColor }: { value: string; label: React.ReactNode; valueColor?: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '14px 16px', marginBottom: 16 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 700, color: valueColor ?? 'var(--text)', marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text2)' }}>{label}</div>
    </div>
  );
}

export function ListItem({ left, right, detail, rightColor, badge }: {
  left: string; right?: string; detail?: string; rightColor?: string;
  badge?: { label: string; bg: string; color: string };
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{left}</div>
        {detail && <div style={{ fontSize: 11, color: 'var(--text2)' }}>{detail}</div>}
      </div>
      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8 }}>
        {right && <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: rightColor ?? 'var(--text)' }}>{right}</div>}
        {badge && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: '0.5px', background: badge.bg, color: badge.color }}>{badge.label}</span>}
      </div>
    </div>
  );
}

export function SummaryRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '2px solid var(--border-l, #252535)', marginTop: 4 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: color ?? 'var(--text)' }}>{value}</span>
    </div>
  );
}

export function Recommendation({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--accent-a, rgba(124,108,240,0.15))', border: '1px solid rgba(124,108,240,0.2)', borderRadius: 6, padding: '12px 16px', fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
      {children}
    </div>
  );
}

export function ChartBox({ children, expanded }: { children: React.ReactNode; expanded: boolean }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 16, marginBottom: 16 }}>
      <div style={{ width: '100%', height: expanded ? 500 : 180, transition: 'height 0.2s ease' }}>
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
