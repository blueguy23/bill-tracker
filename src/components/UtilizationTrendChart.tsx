'use client';

import type { UtilizationDataPoint } from '@/types/creditAdvisor';

interface UtilizationTrendChartProps {
  data: UtilizationDataPoint[];
}

const W = 600;
const H = 120;
const PAD = { top: 8, right: 8, bottom: 24, left: 36 };
const CHART_W = W - PAD.left - PAD.right;
const CHART_H = H - PAD.top - PAD.bottom;

const THRESHOLDS = [
  { pct: 0.10, color: '#10b981', label: '10%' },
  { pct: 0.30, color: '#f59e0b', label: '30%' },
  { pct: 0.70, color: '#ef4444', label: '70%' },
];

function pctStr(n: number) { return `${Math.round(n * 100)}%`; }

export function UtilizationTrendChart({ data }: UtilizationTrendChartProps) {
  if (data.length === 0) return null;

  const maxUtil = Math.min(1, Math.max(...data.map((d) => d.utilization), 0.5));
  const yScale = (v: number) => CHART_H - (v / maxUtil) * CHART_H;
  const xScale = (i: number) => (i / (data.length - 1)) * CHART_W;

  const points = data.map((d, i) => `${xScale(i)},${yScale(d.utilization)}`).join(' ');
  const area = [
    `M0,${CHART_H}`,
    ...data.map((d, i) => `L${xScale(i)},${yScale(d.utilization)}`),
    `L${CHART_W},${CHART_H}`,
    'Z',
  ].join(' ');

  // Color of the line based on latest utilization
  const latest = data[data.length - 1]!.utilization;
  const lineColor = latest < 0.10 ? '#10b981' : latest < 0.30 ? '#22c55e' : latest < 0.70 ? '#f59e0b' : '#ef4444';

  // X-axis: show first, middle, last date labels
  const labelIndices = [0, Math.floor(data.length / 2), data.length - 1];

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: H }}
        preserveAspectRatio="none"
      >
        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {/* Threshold lines */}
          {THRESHOLDS.filter((t) => t.pct <= maxUtil).map((t) => (
            <g key={t.pct}>
              <line
                x1={0} y1={yScale(t.pct)}
                x2={CHART_W} y2={yScale(t.pct)}
                stroke={t.color} strokeWidth={0.5} strokeDasharray="4 3" opacity={0.4}
              />
              <text x={-2} y={yScale(t.pct) + 3} fill={t.color} fontSize={8} textAnchor="end" opacity={0.7}>
                {t.label}
              </text>
            </g>
          ))}

          {/* Area fill */}
          <path d={area} fill={lineColor} opacity={0.08} />

          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke={lineColor}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Latest point dot */}
          <circle
            cx={xScale(data.length - 1)}
            cy={yScale(latest)}
            r={3}
            fill={lineColor}
          />

          {/* X-axis labels */}
          {labelIndices.map((i) => (
            <text
              key={i}
              x={xScale(i)}
              y={CHART_H + 14}
              fill="#71717a"
              fontSize={8}
              textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
            >
              {data[i]!.date.slice(5)} {/* MM-DD */}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}
