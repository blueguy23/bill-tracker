'use client';

import { useTheme } from './ThemeProvider';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import type { DailyBalance } from '@/types/payPeriod';

const USD0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

interface Props {
  dailyBalances: DailyBalance[];
}

export function PayPeriodBalanceChart({ dailyBalances }: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';

  const GRID = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,41,0.07)';
  const TEXT3 = isDark ? '#52525b' : '#8A93A6';
  const LINE = isDark ? '#a1a1aa' : '#5C6679';
  const FONT = isDark ? "'IBM Plex Mono', monospace" : "'JetBrains Mono', monospace";

  const todayIndex = dailyBalances.findIndex(d => d.isProjected) - 1;
  const todayLabel = todayIndex >= 0 ? dailyBalances[todayIndex]?.date : undefined;

  const chartData = dailyBalances.map(d => {
    const dt = new Date(d.date + 'T00:00:00');
    return {
      label: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      date: d.date,
      actual: d.isProjected ? undefined : d.balance,
      projected: d.isProjected ? d.balance : undefined,
      balance: d.balance,
      events: d.events,
      isProjected: d.isProjected,
    };
  });

  if (todayIndex >= 0 && todayIndex < chartData.length - 1) {
    const todayPoint = chartData[todayIndex];
    const nextPoint = chartData[todayIndex + 1];
    if (todayPoint && nextPoint) {
      nextPoint.projected = nextPoint.balance;
      todayPoint.projected = todayPoint.balance;
    }
  }

  const chartConfig = {
    actual: { label: 'Actual', color: LINE },
    projected: { label: 'Projected', color: 'var(--gold)' },
  } satisfies ChartConfig;

  const todayLabelFormatted = todayLabel
    ? new Date(todayLabel + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : undefined;

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, padding: 28, marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.2 }}>Daily balance</p>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Running balance through this pay period</p>
        </div>
        <div style={{ fontSize: 12, color: TEXT3, fontFamily: FONT }}>
          <span style={{ display: 'inline-block', width: 8, height: 2, background: TEXT3, verticalAlign: 'middle', marginRight: 5, borderRadius: 1 }} />
          Balance
        </div>
      </div>
      <div style={{ position: 'relative', height: 160 }}>
        <ChartContainer config={chartConfig} className="aspect-auto h-[160px] w-full">
          <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: TEXT3, fontFamily: FONT, fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: TEXT3, fontFamily: FONT, fontSize: 10 }}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
              width={50}
            />
            {todayLabelFormatted && (
              <ReferenceLine x={todayLabelFormatted} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" label={{ value: 'TODAY', position: 'bottom', fill: '#a1a1aa', fontSize: 9, fontFamily: FONT }} />
            )}
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'var(--mono)', fontSize: 12 }}
              labelStyle={{ color: 'var(--text)', fontWeight: 600, marginBottom: 4 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0]?.payload as typeof chartData[number] | undefined;
                if (!point) return null;
                return (
                  <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 10, fontFamily: 'var(--mono)', fontSize: 12 }}>
                    <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: 4 }}>{label}</div>
                    {point.events.length > 0 && (
                      <div style={{ color: 'var(--text2)', marginBottom: 4 }}>
                        {point.events.map((e, i) => (
                          <div key={i}>{e.type === 'income' ? '+' : '−'} {e.name} {USD0.format(e.amount)}</div>
                        ))}
                      </div>
                    )}
                    <div style={{ color: point.isProjected ? 'var(--gold)' : 'var(--text2)' }}>
                      {point.isProjected ? 'Projected' : 'Balance'}: {USD0.format(point.balance)}
                    </div>
                  </div>
                );
              }}
            />
            <defs>
              <linearGradient id="ppActualFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={LINE} stopOpacity={0.08} />
                <stop offset="100%" stopColor={LINE} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="actual"
              stroke={LINE}
              strokeWidth={1.5}
              fill="url(#ppActualFill)"
              dot={false}
              connectNulls={false}
              activeDot={{ r: 4, fill: LINE, strokeWidth: 0 }}
            />
            <Area
              type="monotone"
              dataKey="projected"
              stroke="var(--gold)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              fill="none"
              dot={false}
              connectNulls={false}
              activeDot={{ r: 4, fill: 'var(--gold)', strokeWidth: 0 }}
            />
          </AreaChart>
        </ChartContainer>
      </div>
    </div>
  );
}
