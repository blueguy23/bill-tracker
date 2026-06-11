'use client';

import type { Action } from '@/lib/actionQueue';
import { ActionCard } from '@/components/ActionCard';

interface Props {
  actions: Action[];
  maxItems?: number;
}

export function ActionList({ actions, maxItems = 5 }: Props) {
  if (actions.length === 0) {
    return (
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '24px 16px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
          All clear
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
          No action items right now
        </div>
      </div>
    );
  }

  const visible = actions.slice(0, maxItems);
  const remaining = actions.length - visible.length;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: 0.8, color: 'var(--text3)',
        }}>
          Action items
          <span style={{
            marginLeft: 8, fontSize: 10, fontFamily: 'var(--mono)',
            padding: '1px 6px', borderRadius: 8,
            background: 'rgba(255,255,255,0.06)', color: 'var(--text2)',
          }}>
            {actions.length}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {visible.map(action => (
          <ActionCard key={action.id} action={action} />
        ))}
      </div>

      {remaining > 0 && (
        <div style={{
          textAlign: 'center', marginTop: 8,
          fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)',
        }}>
          +{remaining} more
        </div>
      )}
    </div>
  );
}
