'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { SectionTitle, Callout, ListItem, ChartBox, AXIS_STYLE, TOOLTIP_STYLE, USD, USD0 } from './shared';
import type { DetailPanelData } from '../DetailPanel';

export function CategoryView({ category, data, expanded }: { category: string; data: DetailPanelData; expanded: boolean }) {
  const cat = data.categorySpend.find(c => c.label === category);
  const budget = data.budgetAlerts.find(b => b.category === category);
  const spent = cat?.amount ?? 0;
  const limit = budget?.limit ?? 0;
  const diff = spent - limit;
  const statusText = limit > 0 ? (diff > 0 ? `Over budget by ${USD0.format(diff)}` : `Under budget by ${USD0.format(Math.abs(diff))}`) : `${USD0.format(spent)} spent`;
  const statusColor = diff > 0 && limit > 0 ? 'var(--red)' : 'var(--green)';

  const topMerchants = data.transactions
    .filter(t => (t.category ?? '').toLowerCase() === category.toLowerCase() && Number(t.amount) < 0)
    .reduce<Map<string, number>>((acc, t) => {
      acc.set(t.description, (acc.get(t.description) ?? 0) + Math.abs(Number(t.amount)));
      return acc;
    }, new Map());
  const sorted = Array.from(topMerchants.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const chartData = [
    { name: 'Budget', value: limit, fill: 'rgba(128,128,160,0.15)' },
    { name: 'Actual', value: spent, fill: diff > 0 && limit > 0 ? '#ef4444' : '#7c6cf0' },
  ];

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <ChartBox expanded={expanded}>
          <BarChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="#1e1e2a" vertical={false} />
            <XAxis dataKey="name" {...AXIS_STYLE} />
            <YAxis {...AXIS_STYLE} tickFormatter={(v: number) => `$${v}`} width={50} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [USD0.format(Number(v)), '']} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false} />
          </BarChart>
        </ChartBox>
        <Callout value={statusText} valueColor={statusColor} label={limit > 0 ? `${USD0.format(spent)} spent of ${USD0.format(limit)} budget this month` : `${USD0.format(spent)} spent this month`} />
      </div>
      {sorted.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionTitle>Top Merchants This Month</SectionTitle>
          {sorted.map(([name, amt]) => (
            <ListItem key={name} left={name} right={USD.format(amt)} />
          ))}
        </div>
      )}
    </>
  );
}
