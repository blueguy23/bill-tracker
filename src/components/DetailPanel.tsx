'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Chart } from 'chart.js';
import type { PanelType, PanelEvent } from './PanelTrigger';
import { PanelBody, getTitle } from './DetailPanelViews';

// ── Types ───────────────────────────────────────────────────────────────────

export interface PanelBill {
  name: string; amount: number; category: string; isPaid: boolean;
  isAutoPay?: boolean; dueDate: string | number; recurrenceInterval?: string;
  paidMonth?: string | null; url?: string; notes?: string; renewalNote?: string;
}

export interface PanelTransaction {
  _id: string; description: string; amount: number; category?: string;
  posted?: string | number | Date;
}

export interface PanelAccount {
  _id: string; orgName?: string; name?: string; balance?: string | number;
  accountType?: string;
}

interface CategorySpend { label: string; amount: number; }
interface BudgetAlert { category: string; spent: number; limit: number; }

export interface DetailPanelData {
  bills: PanelBill[];
  transactions: PanelTransaction[];
  accounts: PanelAccount[];
  cashFlow: { income: number; expenses: number; net: number };
  history: { month: string; income: number; expenses: number }[];
  savingsRate: number;
  categorySpend: CategorySpend[];
  budgetAlerts: BudgetAlert[];
}

// ── Component ───────────────────────────────────────────────────────────────

const MIN_W = 380;
const MAX_W = 720;
const DEFAULT_W = 420;

export function DetailPanel({ data }: { data: DetailPanelData }) {
  const [open, setOpen]         = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [panelType, setPanelType] = useState<PanelType | null>(null);
  const [panelArg, setPanelArg]   = useState<string | number | undefined>();
  const [width, setWidth]       = useState(DEFAULT_W);
  const chartRef                = useRef<Chart | null>(null);
  const panelRef                = useRef<HTMLElement>(null);
  const dragRef                 = useRef({ active: false, startX: 0, startW: DEFAULT_W });

  const close = useCallback(() => {
    setOpen(false);
    setExpanded(false);
    setWidth(DEFAULT_W);
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
  }, []);

  useEffect(() => {
    function handler(e: Event) {
      const { type, arg } = (e as CustomEvent<PanelEvent>).detail;
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
      setPanelType(type);
      setPanelArg(arg);
      setExpanded(false);
      setWidth(DEFAULT_W);
      setOpen(true);
    }
    window.addEventListener('open-detail-panel', handler);
    return () => window.removeEventListener('open-detail-panel', handler);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  // Drag-to-resize
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragRef.current.active || expanded) return;
      const newW = Math.max(MIN_W, Math.min(MAX_W, window.innerWidth - e.clientX));
      setWidth(newW);
    }
    function onUp() {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setWidth(w => {
        if (Math.abs(w - 420) < 30) return 420;
        if (Math.abs(w - 600) < 30) return 600;
        return w;
      });
      if (chartRef.current) chartRef.current.resize();
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, [expanded]);

  function startDrag(e: React.MouseEvent) {
    if (expanded) return;
    e.preventDefault();
    dragRef.current = { active: true, startX: e.clientX, startW: width };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  function toggleExpand() {
    const next = !expanded;
    setExpanded(next);
    const el = panelRef.current;
    if (el) {
      const onEnd = (ev: TransitionEvent) => {
        if (ev.propertyName !== 'width') return;
        el.removeEventListener('transitionend', onEnd);
        if (chartRef.current) chartRef.current.resize();
      };
      el.addEventListener('transitionend', onEnd);
    }
  }

  const title = getTitle(panelType, panelArg, data);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
          opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity .25s ease',
        }}
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        style={{
          position: 'fixed', top: 0, right: expanded ? '5vw' : 0,
          width: expanded ? '90vw' : width, height: '100vh',
          background: 'var(--raised)', borderLeft: '1px solid var(--border)', zIndex: 101,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: dragRef.current.active
            ? 'transform .3s cubic-bezier(0.4,0,0.2,1)'
            : 'transform .3s cubic-bezier(0.4,0,0.2,1), width .3s cubic-bezier(0.4,0,0.2,1)',
          display: 'flex', flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0,0,0,.5)',
          borderRadius: expanded ? 'var(--radius, 10px)' : 0,
          border: expanded ? '1px solid var(--border)' : undefined,
        }}
      >
        {/* Drag handle */}
        <div
          onMouseDown={startDrag}
          style={{
            position: 'absolute', top: 0, left: 0, width: 4, height: '100%',
            cursor: expanded ? 'default' : 'col-resize', zIndex: 2,
            background: 'transparent', transition: 'background .15s',
          }}
          onMouseEnter={e => { if (!expanded) (e.currentTarget.style.background = 'var(--accent)'); }}
          onMouseLeave={e => { if (!dragRef.current.active) e.currentTarget.style.background = 'transparent'; }}
        />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={toggleExpand} title={expanded ? 'Collapse' : 'Expand'} style={btnStyle}>
              {expanded ? '⤵' : '⤢'}
            </button>
            <button onClick={close} title="Close (Esc)" style={btnStyle}>&times;</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
          {open && panelType && (
            <PanelBody type={panelType} arg={panelArg} data={data} chartRef={chartRef} expanded={expanded} />
          )}
        </div>
      </aside>
    </>
  );
}

const btnStyle: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 6,
  background: 'var(--surface)', border: '1px solid var(--border)',
  color: 'var(--text2)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 14, transition: 'color .15s', lineHeight: 1,
};

