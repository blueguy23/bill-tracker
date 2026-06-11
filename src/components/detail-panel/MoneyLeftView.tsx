'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import type { DetailPanelData } from '../DetailPanel';
import { USD0, AXIS_STYLE, TOOLTIP_STYLE, ChartBox, Callout, SectionTitle, ListItem, SummaryRow } from './shared';

interface MoneyLeftViewProps {
  data: DetailPanelData;
  expanded: boolean;
}

export function MoneyLeftView({ data, expanded }: MoneyLeftViewProps) {
  const months = data.history.slice(-6);
  const chartData = months.map(m => ({
    month: m.month,
    leftover: Math.max(0, m.income - m.expenses),
  }));
  const net = data.cashFlow.net;
  const prevNet = chartData.length >= 2 ? chartData[chartData.length - 2]!.leftover : 0;
  const delta = net - prevNet;

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <ChartBox expanded={expanded}>
          <BarChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="#1e1e2a" vertical={false} />
            <XAxis dataKey="month" {...AXIS_STYLE} />
            <YAxis {...AXIS_STYLE} tickFormatter={(v: number) => `$${v}`} width={50} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [USD0.format(Number(v)), 'Leftover']} />
            <Bar dataKey="leftover" radius={[4, 4, 0, 0]} maxBarSize={28} fill="#22c55e" isAnimationActive={false} />
          </BarChart>
        </ChartBox>
        <Callout
          value={USD0.format(Math.max(0, net))}
          label={<>Discretionary budget remaining · <span style={{ color: delta >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{delta >= 0 ? '↑' : '↓'} {USD0.format(Math.abs(delta))} vs last month</span></>}
        />
      </div>
      <div style={{ marginBottom: 24 }}>
        <SectionTitle>Breakdown</SectionTitle>
        <ListItem left="Total income" right={USD0.format(data.cashFlow.income)} rightColor="var(--green)" />
        <ListItem left="Total expenses" right={`-${USD0.format(data.cashFlow.expenses)}`} />
        <SummaryRow label="Discretionary" value={USD0.format(Math.max(0, net))} />
      </div>
    </>
  );
}
