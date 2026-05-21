'use client';

import type { ReactNode, CSSProperties } from 'react';

export type PanelType = 'savings' | 'bills' | 'money-left' | 'category' | 'transaction' | 'networth' | 'bill-detail';

export interface PanelEvent {
  type: PanelType;
  arg?: string | number;
}

export function openDetailPanel(type: PanelType, arg?: string | number) {
  window.dispatchEvent(new CustomEvent<PanelEvent>('open-detail-panel', { detail: { type, arg } }));
}

export function PanelTrigger({ type, arg, children, style, className }: {
  type: PanelType;
  arg?: string | number;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div onClick={() => openDetailPanel(type, arg)} style={{ cursor: 'pointer', ...style }} className={className}>
      {children}
    </div>
  );
}
