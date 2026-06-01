'use client';

import { useTheme } from './ThemeProvider';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import type { ForecastDay } from '@/lib/forecast';

interface Tokens {
  GRID: string;
  TEXT3: string;
  LINE: string;
  FILL: string;
  INC: string;
  EXP: string;
  FONT: string;
}

const DARK: Tokens = {
  GRID: 'rgba(255,255,255,0.04)',
  TEXT3: '#44445a',
  LINE: '#a1a1aa',
  FILL: 'rgba(99,91,255,0.08)',
  INC: '#22c55e',
  EXP: '#ef4444',
  FONT: "'IBM Plex Mono', monospace",
};

const LIGHT: Tokens = {
  GRID: 'rgba(15,23,41,0.07)',
  TEXT3: '#8A93A6',
  LINE: '#2A5BD7',
  FILL: 'rgba(42,91,215,0.08)',
  INC: '#187A5C',
  EXP: '#C9624A',
  FONT: "'JetBrains Mono', monospace",
};

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

interface ForecastChartProps {
  forecast: ForecastDay[];
}

export function ForecastChart({ forecast }: ForecastChartProps) {
  const { theme } = useTheme();
  const tokens = theme === 'light' ? LIGHT : DARK;

  if (forecast.length === 0) {
    return (
      <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.TEXT3, fontSize: 11, fontFamily: tokens.FONT }}>
        No data yet — sync accounts and add bills to project
      </div>
    );
  }

  const chartData = forecast.map((d) => {
    const dt = new Date(d.date + 'T00:00:00');
    return {
      label: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      balance: d.balance,
      events: d.events,
    };
  });

  const chartConfig = {
    balance: { label: 'Balance', color: tokens.LINE },
  } satisfies ChartConfig;

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
        <ChartContainer config={chartConfig} className="aspect-auto h-[200px] w-full">
          <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid stroke={tokens.GRID} vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: tokens.TEXT3, fontFamily: tokens.FONT, fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: tokens.TEXT3, fontFamily: tokens.FONT, fontSize: 10 }}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              width={45}
            />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'var(--mono)', fontSize: 12 }}
              labelStyle={{ color: 'var(--text)', fontWeight: 600, marginBottom: 4 }}
              formatter={(value) => [USD.format(Number(value)), 'Balance']}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0];
                const events = (point?.payload as typeof chartData[number])?.events ?? [];
                return (
                  <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 10, fontFamily: 'var(--mono)', fontSize: 12 }}>
                    <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: 4 }}>{label}</div>
                    {events.length > 0 && (
                      <div style={{ color: 'var(--text2)', marginBottom: 4 }}>
                        {events.map((e, i) => {
                          const sign = e.amount >= 0 ? '+' : '';
                          return <div key={i}>{e.type === 'income' ? '↑' : '↓'} {e.name} {sign}{USD.format(e.amount)}</div>;
                        })}
                      </div>
                    )}
                    <div style={{ color: 'var(--text2)' }}>Balance: {USD.format(point?.value as number ?? 0)}</div>
                  </div>
                );
              }}
            />
            <defs>
              <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={tokens.LINE} stopOpacity={0.12} />
                <stop offset="100%" stopColor={tokens.LINE} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="balance"
              stroke={tokens.LINE}
              strokeWidth={1.5}
              fill="url(#forecastFill)"
              dot={false}
              activeDot={{ r: 5, fill: tokens.LINE, strokeWidth: 0 }}
            />
          </AreaChart>
        </ChartContainer>
      </div>
    </div>
  );
}
