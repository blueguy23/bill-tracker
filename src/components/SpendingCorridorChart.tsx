'use client';

import { useTheme } from './ThemeProvider';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import type { DailySpending, PayPeriodStats } from '@/types/payPeriod';

const USD0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

interface Props {
  dailySpending: DailySpending[];
  stats: PayPeriodStats;
}

export function SpendingCorridorChart({ dailySpending, stats }: Props) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';

  const GRID = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,41,0.07)';
  const TEXT3 = isDark ? '#52525b' : '#8A93A6';
  const FONT = isDark ? "'IBM Plex Mono', monospace" : "'JetBrains Mono', monospace";

  const budget = stats.safeToSpend + stats.spent;
  const totalDays = dailySpending.length;
  const todayIndex = dailySpending.findIndex(d => d.isProjected) - 1;
  const todayLabel = todayIndex >= 0 ? dailySpending[todayIndex]?.date : undefined;

  const chartData = dailySpending.map((d, i) => {
    const dt = new Date(d.date + 'T00:00:00');
    const paceTarget = totalDays > 1 ? (budget / (totalDays - 1)) * i : budget;
    return {
      label: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      date: d.date,
      actual: d.isProjected ? undefined : d.cumulative,
      pace: Math.round(paceTarget * 100) / 100,
      cumulative: d.cumulative,
      isProjected: d.isProjected,
    };
  });

  let statusColor = 'var(--text3)';
  let statusText = 'No spending data yet';
  if (todayIndex >= 0 && todayIndex < chartData.length) {
    const todayPoint = chartData[todayIndex]!;
    const delta = todayPoint.cumulative - todayPoint.pace;
    statusColor = delta > 0 ? 'var(--red)' : 'var(--green)';
    statusText = delta > 0
      ? `${USD0.format(Math.abs(delta))} over pace`
      : `${USD0.format(Math.abs(delta))} under pace`;
  }

  const todayLabelFormatted = todayLabel
    ? new Date(todayLabel + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : undefined;

  const chartConfig = {
    actual: { label: 'Your spending', color: 'var(--text)' },
    pace: { label: 'Budget pace', color: 'var(--green)' },
  } satisfies ChartConfig;

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, padding: 28, marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.2 }}>Spending pace</p>
          <p style={{ fontSize: 12, color: statusColor, fontFamily: FONT, marginTop: 2 }}>{statusText}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, color: TEXT3, fontFamily: FONT, textAlign: 'right' }}>
          <div>
            <span style={{ display: 'inline-block', width: 8, height: 2, background: 'var(--text)', verticalAlign: 'middle', marginRight: 5, borderRadius: 1 }} />
            Actual
          </div>
          <div>
            <span style={{ display: 'inline-block', width: 8, height: 2, background: 'var(--green)', verticalAlign: 'middle', marginRight: 5, borderRadius: 1, opacity: 0.5 }} />
            Budget pace
          </div>
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
              tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`}
              width={50}
            />
            {todayLabelFormatted && (
              <ReferenceLine x={todayLabelFormatted} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" label={{ value: 'TODAY', position: 'bottom', fill: '#a1a1aa', fontSize: 9, fontFamily: FONT }} />
            )}
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0]?.payload as typeof chartData[number] | undefined;
                if (!point) return null;
                const delta = point.cumulative - point.pace;
                return (
                  <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 10, fontFamily: 'var(--mono)', fontSize: 12 }}>
                    <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: 4 }}>{label}</div>
                    <div style={{ color: 'var(--text2)' }}>Spent: {USD0.format(point.cumulative)}</div>
                    <div style={{ color: 'var(--text3)' }}>Pace: {USD0.format(point.pace)}</div>
                    <div style={{ color: delta > 0 ? 'var(--red)' : 'var(--green)', marginTop: 4, fontWeight: 600 }}>
                      {delta > 0 ? '+' : ''}{USD0.format(delta)} vs pace
                    </div>
                  </div>
                );
              }}
            />
            <defs>
              <linearGradient id="corridorPaceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--green)" stopOpacity={0.06} />
                <stop offset="100%" stopColor="var(--green)" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="corridorActualFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--text)" stopOpacity={0.08} />
                <stop offset="100%" stopColor="var(--text)" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="pace"
              stroke="var(--green)"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              strokeOpacity={0.5}
              fill="url(#corridorPaceFill)"
              dot={false}
              activeDot={false}
            />
            <Area
              type="monotone"
              dataKey="actual"
              stroke="var(--text)"
              strokeWidth={2}
              fill="url(#corridorActualFill)"
              dot={false}
              connectNulls={false}
              activeDot={{ r: 4, fill: 'var(--text)', strokeWidth: 0 }}
            />
          </AreaChart>
        </ChartContainer>
      </div>
    </div>
  );
}
