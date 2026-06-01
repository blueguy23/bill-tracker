'use client';

import { useTheme } from './ThemeProvider';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import type { MonthlyFlow } from '@/adapters/cashFlowHistory';

interface ChartTokens {
  GRID: string;
  TEXT3: string;
  TEXT2: string;
  INC: string;
  EXP: string;
  TICK_FONT: string;
  CAT: string[];
}

const DARK: ChartTokens = {
  GRID:      'rgba(255,255,255,0.04)',
  TEXT3:     '#44445a',
  TEXT2:     '#8080a0',
  INC:       '#4ade80',
  EXP:       '#f87171',
  TICK_FONT: "'IBM Plex Mono', monospace",
  CAT: ['#fafafa', '#4ade80', '#f87171', '#fbbf24', '#c084fc', '#a1a1aa', '#34d399', '#fb923c'],
};

const LIGHT: ChartTokens = {
  GRID:      'rgba(15,23,41,0.07)',
  TEXT3:     '#8A93A6',
  TEXT2:     '#5C6679',
  INC:       '#187A5C',
  EXP:       '#C9624A',
  TICK_FONT: "'JetBrains Mono', monospace",
  CAT: ['#C9624A', '#187A5C', '#2A5BD7', '#C47A2A', '#c084fc', '#a1a1aa', '#34d399', '#fb923c'],
};

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

const trendConfig = {
  income:   { label: 'Income',   color: 'var(--chart-income)' },
  expenses: { label: 'Expenses', color: 'var(--chart-expenses)' },
  net:      { label: 'Net',      color: 'var(--chart-net)' },
} satisfies ChartConfig;

function TrendChart({ history, tokens }: { history: MonthlyFlow[]; tokens: ChartTokens }) {
  const config = {
    income:   { ...trendConfig.income,   color: tokens.INC },
    expenses: { ...trendConfig.expenses, color: tokens.EXP },
    net:      { ...trendConfig.net,      color: tokens.TEXT3 },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="aspect-auto h-[200px] w-full">
      <LineChart data={history} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid stroke={tokens.GRID} vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: tokens.TEXT3, fontFamily: tokens.TICK_FONT, fontSize: 10 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: tokens.TEXT3, fontFamily: tokens.TICK_FONT, fontSize: 10 }}
          tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
          width={45}
        />
        <Tooltip
          contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'var(--mono)', fontSize: 12 }}
          labelStyle={{ color: 'var(--text)', fontWeight: 600, marginBottom: 4 }}
          itemStyle={{ color: 'var(--text2)', padding: 0 }}
          formatter={(value, name) => [`$${Number(value).toLocaleString()}`, String(name).charAt(0).toUpperCase() + String(name).slice(1)]}
        />
        <Line type="monotone" dataKey="income" stroke={tokens.INC} strokeWidth={1.5} dot={{ r: 3, fill: tokens.INC, strokeWidth: 0 }} />
        <Line type="monotone" dataKey="expenses" stroke={tokens.EXP} strokeWidth={1.5} dot={{ r: 3, fill: tokens.EXP, strokeWidth: 0 }} />
        <Line type="monotone" dataKey="net" stroke={tokens.TEXT3} strokeWidth={1} strokeDasharray="4 3" dot={{ r: 2, fill: tokens.TEXT3, strokeWidth: 0 }} />
      </LineChart>
    </ChartContainer>
  );
}

function EmptyChart({ tokens }: { tokens: ChartTokens }) {
  return (
    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.TEXT3, fontSize: 11, fontFamily: tokens.TICK_FONT }}>
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
