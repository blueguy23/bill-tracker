'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { SectionTitle, Callout, ListItem, SummaryRow, ChartBox, AXIS_STYLE, TOOLTIP_STYLE, USD0 } from './shared';
import type { DetailPanelData } from '../DetailPanel';

export function NetWorthView({ data, expanded }: { data: DetailPanelData; expanded: boolean }) {
  const total = data.accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);
  const assets = data.accounts.filter(a => (Number(a.balance) || 0) >= 0).reduce((s, a) => s + (Number(a.balance) || 0), 0);
  const liabilities = Math.abs(data.accounts.filter(a => (Number(a.balance) || 0) < 0).reduce((s, a) => s + (Number(a.balance) || 0), 0));

  const chartData = [
    { name: 'Assets', value: assets, fill: '#22c55e' },
    { name: 'Liabilities', value: liabilities, fill: '#ef4444' },
    { name: 'Net', value: total, fill: '#7c6cf0' },
  ];

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Callout value={USD0.format(total)} label={<><span style={{ color: 'var(--green)', fontWeight: 600 }}>{USD0.format(assets)} assets</span> · <span style={{ color: 'var(--red)', fontWeight: 600 }}>{USD0.format(liabilities)} liabilities</span></>} />
        <ChartBox expanded={expanded}>
          <BarChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="#1e1e2a" vertical={false} />
            <XAxis dataKey="name" {...AXIS_STYLE} />
            <YAxis {...AXIS_STYLE} tickFormatter={(v: number) => `$${Number(v).toLocaleString()}`} width={60} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [USD0.format(Number(v)), '']} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false} />
          </BarChart>
        </ChartBox>
      </div>
      <div style={{ marginBottom: 24 }}>
        <SectionTitle>Accounts</SectionTitle>
        {data.accounts.map(a => {
          const bal = Number(a.balance) || 0;
          return (
            <ListItem
              key={a._id}
              left={a.name ?? 'Account'}
              detail={a.orgName ?? ''}
              right={USD0.format(Math.abs(bal))}
              rightColor={bal < 0 ? 'var(--red)' : 'var(--text)'}
            />
          );
        })}
        <SummaryRow label="Net Worth" value={USD0.format(total)} />
      </div>
    </>
  );
}
