'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from './ThemeProvider';
import {
  Chart,
  LineController, LineElement, PointElement,
  BarController, BarElement,
  CategoryScale, LinearScale,
  Tooltip, Legend,
} from 'chart.js';
import type { MonthlyFlow } from '@/adapters/cashFlowHistory';

Chart.register(
  LineController, LineElement, PointElement,
  BarController, BarElement,
  CategoryScale, LinearScale,
  Tooltip, Legend,
);

interface ChartTokens {
  GRID: string;
  TEXT3: string;
  TEXT2: string;
  INC: string;
  EXP: string;
  TOOLTIP: { backgroundColor: string; borderColor: string; borderWidth: number; titleColor: string; bodyColor: string; padding: number };
  TICK_FONT: string;
  CAT: string[];
}

const DARK: ChartTokens = {
  GRID:     'rgba(255,255,255,0.04)',
  TEXT3:    '#44445a',
  TEXT2:    '#8080a0',
  INC:      '#22c55e',
  EXP:      '#ef4444',
  TOOLTIP:  { backgroundColor: '#17171e', borderColor: '#1e1e2a', borderWidth: 1, titleColor: '#ededf5', bodyColor: '#8080a0', padding: 10 },
  TICK_FONT: "'IBM Plex Mono', monospace",
  CAT: ['oklch(0.68 0.22 265)', '#22c55e', '#ef4444', 'oklch(0.67 0.13 40)', '#c084fc', '#3b82f6', '#34d399', '#fb923c'],
};

const LIGHT: ChartTokens = {
  GRID:     'rgba(15,23,41,0.07)',
  TEXT3:    '#8A93A6',
  TEXT2:    '#5C6679',
  INC:      '#187A5C',
  EXP:      '#C9624A',
  TOOLTIP:  { backgroundColor: '#FFFFFF', borderColor: '#E2E7EE', borderWidth: 1, titleColor: '#0F1729', bodyColor: '#5C6679', padding: 10 },
  TICK_FONT: "'JetBrains Mono', monospace",
  CAT: ['#C9624A', '#187A5C', '#2A5BD7', '#C47A2A', '#c084fc', '#3b82f6', '#34d399', '#fb923c'],
};

function useCancelRef() {
  const ref = useRef<Chart | null>(null);
  useEffect(() => () => { ref.current?.destroy(); }, []);
  return ref;
}

function Card({ children, title, subtitle, action, testId }: { children: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode; testId?: string }) {
  return (
    <div data-testid={testId} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--sans)', marginBottom: 3 }}>{title}</p>
          {subtitle && <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function TrendChart({ history, tokens }: { history: MonthlyFlow[]; tokens: ChartTokens }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef  = useCancelRef();
  const { INC, EXP, TEXT3, GRID, TOOLTIP, TICK_FONT } = tokens;

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    const TICK = { color: TEXT3, font: { family: TICK_FONT, size: 10 } };
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: history.map(h => h.label),
        datasets: [
          { label: 'Income',   data: history.map(h => h.income),   borderColor: INC,   backgroundColor: 'transparent', fill: false, tension: 0.3, borderWidth: 1.5, pointRadius: 3, pointBackgroundColor: INC,   pointBorderColor: 'transparent' },
          { label: 'Expenses', data: history.map(h => h.expenses), borderColor: EXP,   backgroundColor: 'transparent', fill: false, tension: 0.3, borderWidth: 1.5, pointRadius: 3, pointBackgroundColor: EXP,   pointBorderColor: 'transparent' },
          { label: 'Net',      data: history.map(h => h.net),      borderColor: TEXT3, backgroundColor: 'transparent', fill: false, tension: 0.3, borderWidth: 1, borderDash: [4, 3], pointRadius: 2, pointBackgroundColor: TEXT3, pointBorderColor: 'transparent' },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 800, easing: 'easeInOutQuart' },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: { ...TOOLTIP, callbacks: { label: c => ` ${c.dataset.label}: $${(c.parsed.y ?? 0).toLocaleString()}` } },
        },
        scales: {
          x: { border: { display: false }, grid: { color: GRID }, ticks: { ...TICK } },
          y: { border: { display: false }, grid: { color: GRID }, ticks: { ...TICK, callback: v => '$' + (Number(v) / 1000).toFixed(0) + 'k' } },
        },
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, tokens]);

  return <canvas ref={canvasRef} />;
}

function EmptyChart({ tokens }: { tokens: ChartTokens }) {
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.TEXT3, fontSize: 11, fontFamily: tokens.TICK_FONT }}>
      No data yet — sync to populate
    </div>
  );
}

export function DashboardCharts({ history }: { history: MonthlyFlow[] }) {
  const { theme } = useTheme();
  const tokens = theme === 'light' ? LIGHT : DARK;
  const { INC, EXP, TEXT3 } = tokens;
  const hasHistory = history.length > 0;
  const legendItems = [[INC, 'INCOME'], [EXP, 'SPEND'], [TEXT3, 'NET']] as [string, string][];

  return (
    <Card
      testId="cash-flow-card"
      title="Cash Flow"
      subtitle="Income vs expenses over time"
      action={
        <div style={{ display: 'flex', gap: 14 }}>
          {legendItems.map(([color, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: TEXT3, fontFamily: tokens.TICK_FONT }}>
              <div style={{ width: 14, height: label === 'NET' ? 0 : 1.5, borderTop: label === 'NET' ? `1px dashed ${TEXT3}` : 'none', background: label !== 'NET' ? color : 'transparent' }} />
              {label}
            </div>
          ))}
        </div>
      }
    >
      <div style={{ position: 'relative', height: 200 }}>
        {hasHistory ? <TrendChart history={history} tokens={tokens} /> : <EmptyChart tokens={tokens} />}
      </div>
    </Card>
  );
}

export function SpendByCategoryCard({ data }: { data: { label: string; amount: number }[] }) {
  const { theme } = useTheme();
  const tokens = theme === 'light' ? LIGHT : DARK;
  const sorted = [...data].sort((a, b) => b.amount - a.amount).slice(0, 8);
  const max = sorted[0]?.amount ?? 0;

  return (
    <div data-testid="spending-chart">
      <Card title="Spend by Category" subtitle="This period">
        {sorted.length === 0 ? (
          <EmptyChart tokens={tokens} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {sorted.map(({ label, amount }, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--text2)', minWidth: 80, fontFamily: 'var(--sans)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
                <div style={{ flex: 1, height: 4, background: tokens.GRID, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: max > 0 ? `${(amount / max) * 100}%` : '0%', background: tokens.CAT[i % tokens.CAT.length], borderRadius: 2, transition: 'width .4s ease' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text2)', textAlign: 'right', minWidth: 48, fontFamily: 'var(--mono)' }}>
                  {'$' + amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
