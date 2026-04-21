'use client';

import { useEffect, useRef } from 'react';
import {
  Chart,
  LineController, LineElement, PointElement,
  BarController, BarElement,
  DoughnutController, ArcElement,
  CategoryScale, LinearScale,
  Tooltip, Legend,
} from 'chart.js';
import type { MonthlyFlow } from '@/adapters/cashFlowHistory';

Chart.register(
  LineController, LineElement, PointElement,
  BarController, BarElement,
  DoughnutController, ArcElement,
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

const CAT_PALETTE = [ACCENT, INC, EXP, '#f59e0b', '#c084fc', '#3b82f6', '#34d399', '#fb923c'];


function useCancelRef() {
  const ref = useRef<Chart | null>(null);
  useEffect(() => () => { ref.current?.destroy(); }, []);
  return ref;
}

function Card({ children, title, subtitle, action }: { children: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px' }}>
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

function GroupedBar({ history }: { history: MonthlyFlow[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef  = useCancelRef();

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: history.map(h => h.label),
        datasets: [
          { label: 'Income',   data: history.map(h => h.income),   backgroundColor: '#22c55e30', borderColor: INC, borderWidth: 1, borderRadius: 4 },
          { label: 'Expenses', data: history.map(h => h.expenses), backgroundColor: '#ef444430', borderColor: EXP, borderWidth: 1, borderRadius: 4 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 700, easing: 'easeOutQuart' },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, position: 'top', align: 'end', labels: { color: TEXT3, boxWidth: 8, boxHeight: 8, padding: 12, font: { family: "'IBM Plex Mono', monospace", size: 10 } } },
          tooltip: { ...TOOLTIP, callbacks: { label: c => ` ${c.dataset.label}: $${(c.parsed.y ?? 0).toLocaleString()}` } },
        },
        scales: {
          x: { border: { display: false }, grid: { display: false }, ticks: { ...TICK } },
          y: { border: { display: false }, grid: { color: GRID }, ticks: { ...TICK, callback: v => '$' + (Number(v) / 1000).toFixed(0) + 'k' } },
        },
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  return <canvas ref={canvasRef} />;
}

function CategoryDoughnut({ data }: { data: { label: string; amount: number }[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef  = useCancelRef();

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;
    chartRef.current?.destroy();
    const sorted = [...data].sort((a, b) => b.amount - a.amount).slice(0, 8);
    const total  = sorted.reduce((s, d) => s + d.amount, 0);

    chartRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: sorted.map(d => d.label),
        datasets: [{ data: sorted.map(d => d.amount), backgroundColor: CAT_PALETTE, borderColor: SURFACE, borderWidth: 3, hoverBorderWidth: 4 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '70%',
        animation: { animateRotate: true, duration: 900, easing: 'easeInOutQuart' },
        plugins: {
          legend: {
            display: true, position: 'right',
            labels: {
              color: TEXT2, font: { family: "'IBM Plex Mono', monospace", size: 10 }, boxWidth: 8, boxHeight: 8, padding: 10,
              generateLabels: (chart) => {
                const ds = chart.data.datasets[0] ?? { data: [], backgroundColor: [] };
                return (chart.data.labels as string[]).map((label, i) => {
                  const val = (ds.data[i] as number) ?? 0;
                  const pct = total > 0 ? ((val / total) * 100).toFixed(0) : '0';
                  return { text: `${label}  ${pct}%`, fillStyle: (ds.backgroundColor as string[])[i] ?? '#333', strokeStyle: 'transparent', lineWidth: 0, index: i, hidden: false };
                });
              },
            },
          },
          tooltip: { ...TOOLTIP, callbacks: { label: c => { const val = c.parsed as number; const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0'; return ` $${val.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${pct}%)`; } } },
        },
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Card
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
        <div style={{ position: 'relative', height: 180 }}>
          {hasHistory ? <TrendChart history={history} /> : <EmptyChart />}
        </div>
      </Card>

      <Card title="Monthly Comparison" subtitle="Income vs spend by month">
        <div style={{ position: 'relative', height: 180 }}>
          {hasHistory ? <GroupedBar history={history} /> : <EmptyChart />}
        </div>
      </Card>
    </div>
  );
}

export function SpendByCategoryCard({ data }: { data: { label: string; amount: number }[] }) {
  const hasSpend = data.length > 0;
  return (
    <Card title="Spend by Category" subtitle="This period">
      <div style={{ position: 'relative', height: 200 }}>
        {hasSpend ? <CategoryDoughnut data={data} /> : <EmptyChart />}
      </div>
    </Card>
  );
}
