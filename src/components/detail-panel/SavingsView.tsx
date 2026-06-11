'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import type { DetailPanelData } from '../DetailPanel';
import { USD0, AXIS_STYLE, TOOLTIP_STYLE, ChartBox, Callout, SectionTitle, Recommendation } from './shared';

interface SavingsViewProps {
  data: DetailPanelData;
  expanded: boolean;
}

export function SavingsView({ data, expanded }: SavingsViewProps) {
  const months = data.history.slice(-6);
  const chartData = months.map(m => ({
    month: m.month,
    rate: m.income > 0 ? ((m.income - m.expenses) / m.income) * 100 : 0,
  }));
  const bestIdx = chartData.reduce((bi, d, i, arr) => d.rate > arr[bi]!.rate ? i : bi, 0);
  const bestMonth = chartData[bestIdx]?.month ?? '';
  const bestRate = chartData[bestIdx]?.rate ?? 0;
  const current = data.savingsRate;
  const gap = Math.max(0, 20 - current);
  const gapDollars = data.cashFlow.income > 0 ? Math.round(gap / 100 * data.cashFlow.income) : 0;

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <ChartBox expanded={expanded}>
          <LineChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="#1e1e2a" vertical={false} />
            <XAxis dataKey="month" {...AXIS_STYLE} />
            <YAxis {...AXIS_STYLE} tickFormatter={(v: number) => `${v}%`} domain={[0, Math.max(45, bestRate + 10)]} width={40} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${Number(v).toFixed(1)}%`, 'Savings Rate']} />
            <Line type="monotone" dataKey="rate" stroke="#7c6cf0" fill="rgba(124,108,240,0.08)" strokeWidth={2} dot={{ r: 4, fill: '#7c6cf0', strokeWidth: 0 }} isAnimationActive={false} />
          </LineChart>
        </ChartBox>
        <Callout value={`${bestRate.toFixed(1)}%`} label={<><span style={{ color: 'var(--green)', fontWeight: 600 }}>Your best month in 6 months</span> was {bestMonth}</>} />
      </div>
      <div style={{ marginBottom: 24 }}>
        <SectionTitle>Recommendation</SectionTitle>
        {current >= 20 ? (
          <Recommendation>You&apos;re above your 20% savings target — keep it up!</Recommendation>
        ) : (
          <Recommendation>
            <strong style={{ color: 'var(--accent)' }}>Save an extra {USD0.format(gapDollars)}</strong> to hit your 20% target this month. You&apos;re currently at {current.toFixed(0)}%.
          </Recommendation>
        )}
      </div>
    </>
  );
}
