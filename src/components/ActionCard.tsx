'use client';

import type { Action, ActionType } from '@/lib/actionQueue';

const TYPE_CONFIG: Record<ActionType, { icon: string; accentColor: string; bgColor: string }> = {
  'bill-overdue':      { icon: '!!', accentColor: 'var(--red)',   bgColor: 'rgba(239,68,68,0.08)' },
  'bill-due':          { icon: '$',  accentColor: 'var(--gold)',  bgColor: 'rgba(234,179,8,0.08)' },
  'classify-recurring': { icon: '?',  accentColor: 'var(--blue)',  bgColor: 'rgba(59,130,246,0.08)' },
  'payment-confirm':   { icon: '✓',  accentColor: 'var(--green)', bgColor: 'rgba(34,197,94,0.08)' },
  'price-change':      { icon: '△',  accentColor: 'var(--gold)',  bgColor: 'rgba(234,179,8,0.08)' },
  'budget-warning':    { icon: '%',  accentColor: 'var(--red)',   bgColor: 'rgba(239,68,68,0.08)' },
};

interface Props {
  action: Action;
}

export function ActionCard({ action }: Props) {
  const config = TYPE_CONFIG[action.type];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px', background: config.bgColor,
      border: '1px solid var(--border)', borderRadius: 8,
      borderLeft: `3px solid ${config.accentColor}`,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700,
        color: config.accentColor, background: 'var(--surface)',
        border: '1px solid var(--border)', flexShrink: 0,
      }}>
        {config.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>
          {action.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)', marginTop: 2 }}>
          {action.subtitle}
        </div>
      </div>

      {action.urgencyLabel && (
        <div style={{
          fontSize: 10, fontWeight: 700, fontFamily: 'var(--mono)',
          padding: '2px 8px', borderRadius: 10,
          color: config.accentColor,
          background: 'var(--surface)', border: `1px solid ${config.accentColor}`,
          textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0,
        }}>
          {action.urgencyLabel}
        </div>
      )}
    </div>
  );
}
