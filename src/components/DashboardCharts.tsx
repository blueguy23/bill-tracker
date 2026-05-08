'use client';

import { useEffect, useRef } from 'react';
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

const GRID    = 'rgba(255,255,255,0.04)';
const TEXT3   = '#44445a';
const INC     = '#22c55e';
const EXP     = '#ef4444';
const ACCENT  = 'oklch(0.68 0.22 265)';
const SURFACE = '#131318';
const RAISED  = '#17171e';
const BORDER  = '#1e1e2a';
const TEXT2   = '#8080a0';

const TOOLTIP = {
  backgroundColor: RAISED,
  borderColor:     BORDER,
  borderWidth:     1,
  titleColor:      '#ededf5',
  bodyColor:       TEXT2,
  padding:         10,
} as const;

const TICK = { color: TEXT3, font: { family: "'IBM Plex Mono', monospace", size: 10 } } as const;

const CAT_PALETTE = [ACCENT, INC, EXP, 'var(--gold)', '#c084fc', '#3b82f6', '#34d399', '#fb923c'];


function useCancelRef() {
  const ref = useRef<Chart | null>(null);
  useEffect(() => () => { ref.current?.destroy(); }, []);
  return ref;
}

function Card({ children, title, subtitle, action, testId }: { children: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode; testId?: string }) {
  return (
    <div data-testid={testId} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#ededf5', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 3 }}>{title}</p>
          {subtitle && <p style={{ fontSize: 11, color: TEXT3, fontFamily: "'IBM Plex Mono', monospace" }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function TrendChart({ history }: { history: MonthlyFlow[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef  = useCancelRef();

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
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
  }, [history]);

  return <canvas ref={canvasRef} />;
}



function EmptyChart() {
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: TEXT3, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>
      No data yet — sync to populate
    </div>
  );
}

export function DashboardCharts({ history }: { history: MonthlyFlow[] }) {
  const hasHistory = history.length > 0;
  const legendItems = [['#22c55e', 'INCOME'], ['#ef4444', 'SPEND'], [TEXT3, 'NET']] as const;

  return (
    <Card
      testId="cash-flow-card"
      title="Cash Flow"
      subtitle="Income vs expenses over time"
      action={
        <div style={{ display: 'flex', gap: 14 }}>
          {legendItems.map(([color, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: TEXT3, fontFamily: "'IBM Plex Mono', monospace" }}>
              <div style={{ width: 14, height: label === 'NET' ? 0 : 1.5, borderTop: label === 'NET' ? `1px dashed ${TEXT3}` : 'none', background: label !== 'NET' ? color : 'transparent' }} />
              {label}
            </div>
          ))}
        </div>
      }
    >
      <div style={{ position: 'relative', height: 200 }}>
        {hasHistory ? <TrendChart history={history} /> : <EmptyChart />}
      </div>
    </Card>
  );
}

export function SpendByCategoryCard({ data }: { data: { label: string; amount: number }[] }) {
  const sorted = [...data].sort((a, b) => b.amount - a.amount).slice(0, 8);
  const max = sorted[0]?.amount ?? 0;

  return (
    <div data-testid="spending-chart">
      <Card title="Spend by Category" subtitle="This period">
        {sorted.length === 0 ? (
          <EmptyChart />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {sorted.map(({ label, amount }, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 12, color: TEXT2, minWidth: 80, fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
                <div style={{ flex: 1, height: 4, background: GRID, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: max > 0 ? `${(amount / max) * 100}%` : '0%', background: CAT_PALETTE[i % CAT_PALETTE.length], borderRadius: 2, transition: 'width .4s ease' }} />
                </div>
                <div style={{ fontSize: 11, color: TEXT2, textAlign: 'right', minWidth: 48, fontFamily: "'IBM Plex Mono', monospace" }}>
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
