'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from './ThemeProvider';
import {
  Chart,
  LineController, LineElement, PointElement,
  CategoryScale, LinearScale,
  Tooltip, Filler,
} from 'chart.js';
import type { ForecastDay } from '@/lib/forecast';

Chart.register(
  LineController, LineElement, PointElement,
  CategoryScale, LinearScale,
  Tooltip, Filler,
);

interface Tokens {
  GRID: string;
  TEXT3: string;
  LINE: string;
  FILL: string;
  INC: string;
  EXP: string;
  TOOLTIP: { backgroundColor: string; borderColor: string; borderWidth: number; titleColor: string; bodyColor: string; padding: number };
  FONT: string;
}

const DARK: Tokens = {
  GRID: 'rgba(255,255,255,0.04)',
  TEXT3: '#44445a',
  LINE: 'oklch(0.68 0.22 265)',
  FILL: 'rgba(99,91,255,0.08)',
  INC: '#22c55e',
  EXP: '#ef4444',
  TOOLTIP: { backgroundColor: '#17171e', borderColor: '#1e1e2a', borderWidth: 1, titleColor: '#ededf5', bodyColor: '#8080a0', padding: 10 },
  FONT: "'IBM Plex Mono', monospace",
};

const LIGHT: Tokens = {
  GRID: 'rgba(15,23,41,0.07)',
  TEXT3: '#8A93A6',
  LINE: '#2A5BD7',
  FILL: 'rgba(42,91,215,0.08)',
  INC: '#187A5C',
  EXP: '#C9624A',
  TOOLTIP: { backgroundColor: '#FFFFFF', borderColor: '#E2E7EE', borderWidth: 1, titleColor: '#0F1729', bodyColor: '#5C6679', padding: 10 },
  FONT: "'JetBrains Mono', monospace",
};

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

interface ForecastChartProps {
  forecast: ForecastDay[];
}

export function ForecastChart({ forecast }: ForecastChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const { theme } = useTheme();
  const tokens = theme === 'light' ? LIGHT : DARK;

  useEffect(() => () => { chartRef.current?.destroy(); }, []);

  useEffect(() => {
    if (!canvasRef.current || forecast.length === 0) return;
    chartRef.current?.destroy();

    const labels = forecast.map((d) => {
      const dt = new Date(d.date + 'T00:00:00');
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const pointColors = forecast.map((d) => {
      if (d.events.some((e) => e.type === 'income')) return tokens.INC;
      if (d.events.some((e) => e.type === 'bill' || e.type === 'subscription')) return tokens.EXP;
      return 'transparent';
    });

    const pointRadii = forecast.map((d) =>
      d.events.length > 0 ? 4 : 0,
    );

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Projected Balance',
          data: forecast.map((d) => d.balance),
          borderColor: tokens.LINE,
          backgroundColor: tokens.FILL,
          fill: 'origin',
          tension: 0.2,
          borderWidth: 1.5,
          pointRadius: pointRadii,
          pointBackgroundColor: pointColors,
          pointBorderColor: 'transparent',
          pointHoverRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 800, easing: 'easeInOutQuart' },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...tokens.TOOLTIP,
            callbacks: {
              title: (items) => items[0]?.label ?? '',
              afterTitle: (items) => {
                const idx = items[0]?.dataIndex;
                if (idx == null) return '';
                const day = forecast[idx];
                if (!day?.events.length) return '';
                return day.events
                  .map((e) => {
                    const sign = e.amount >= 0 ? '+' : '';
                    return `${e.type === 'income' ? '↑' : '↓'} ${e.name} ${sign}${USD.format(e.amount)}`;
                  })
                  .join('\n');
              },
              label: (c) => ` Balance: ${USD.format(c.parsed.y ?? 0)}`,
            },
          },
        },
        scales: {
          x: {
            border: { display: false },
            grid: { color: tokens.GRID },
            ticks: {
              color: tokens.TEXT3,
              font: { family: tokens.FONT, size: 10 },
              maxTicksLimit: 13,
              maxRotation: 0,
            },
          },
          y: {
            border: { display: false },
            grid: { color: tokens.GRID },
            ticks: {
              color: tokens.TEXT3,
              font: { family: tokens.FONT, size: 10 },
              callback: (v) => '$' + (Number(v) / 1000).toFixed(0) + 'k',
            },
          },
        },
      },
    });
  }, [forecast, tokens]);

  if (forecast.length === 0) {
    return (
      <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.TEXT3, fontSize: 11, fontFamily: tokens.FONT }}>
        No data yet — sync accounts and add bills to project
      </div>
    );
  }

  const legendItems: [string, string][] = [
    [tokens.LINE, 'BALANCE'],
    [tokens.EXP, 'BILL/SUB'],
    [tokens.INC, 'INCOME'],
  ];

  return (
    <div data-testid="forecast-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--sans)', marginBottom: 3 }}>90-Day Forecast</p>
          <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>Projected balance based on bills, subscriptions & income</p>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          {legendItems.map(([color, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: tokens.TEXT3, fontFamily: tokens.FONT }}>
              <div style={{ width: 8, height: 8, borderRadius: label === 'BALANCE' ? 0 : '50%', background: color }} />
              {label}
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: 'relative', height: 200 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
