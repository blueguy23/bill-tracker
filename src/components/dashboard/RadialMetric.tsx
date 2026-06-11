'use client';

import {
  RadialBarChart, RadialBar, PolarGrid, PolarRadiusAxis, Label,
} from 'recharts';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RadialMetricProps {
  value: number;
  max: number;
  label: string;
  sublabel: string;
  detail: string;
  color: string;
}

export function RadialMetric({ value, max, label, sublabel, detail, color }: RadialMetricProps) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const endAngle = pct * 360;
  const chartData = [{ value: pct * 100, fill: color }];
  const config: ChartConfig = { value: { label, color } };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <ChartContainer config={config} className="mx-auto aspect-square max-h-[140px]">
              <RadialBarChart data={chartData} startAngle={90} endAngle={90 - endAngle} innerRadius={52} outerRadius={68}>
                <PolarGrid gridType="circle" radialLines={false} stroke="none" className="first:fill-muted last:fill-background" polarRadius={[68, 52]} />
                <RadialBar dataKey="value" background cornerRadius={10} />
                <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan x={viewBox.cx} y={(viewBox.cy || 0) - 6} className="fill-foreground text-xl font-bold font-mono">{label}</tspan>
                            <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 14} className="fill-muted-foreground text-[10px]">{sublabel}</tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </PolarRadiusAxis>
              </RadialBarChart>
            </ChartContainer>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-popover text-popover-foreground border shadow-lg px-3 py-2">
          <p className="text-xs font-mono">{detail}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
