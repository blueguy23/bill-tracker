'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

interface ChargePoint {
  amount: number;
  date: string;
}

export interface PriceWatchItem {
  billId: string;
  name: string;
  category: string;
  currentAmount: number;
  lastCharged: number;
  isSubscription: boolean;
  chargeHistory: ChargePoint[];
}

interface Props {
  items: PriceWatchItem[];
}

function getInitials(name: string): string {
  return name.split(/[\s-]+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function MiniSparkline({ points, color }: { points: number[]; color: string }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 80;
  const h = 24;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });

  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={(coords.length - 1) / (coords.length - 1) * w}
        cy={h - ((points[points.length - 1]! - min) / range) * (h - 4) - 2}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}

export function PriceWatchView({ items }: Props) {
  const { increased, decreased, stable } = useMemo(() => {
    const inc: PriceWatchItem[] = [];
    const dec: PriceWatchItem[] = [];
    const stb: PriceWatchItem[] = [];
    for (const item of items) {
      const delta = item.lastCharged - item.currentAmount;
      if (Math.abs(delta) <= 0.5) stb.push(item);
      else if (delta > 0) inc.push(item);
      else dec.push(item);
    }
    inc.sort((a, b) => (b.lastCharged - b.currentAmount) - (a.lastCharged - a.currentAmount));
    dec.sort((a, b) => (a.lastCharged - a.currentAmount) - (b.lastCharged - b.currentAmount));
    return { increased: inc, decreased: dec, stable: stb };
  }, [items]);

  const totalImpact = useMemo(() =>
    items.reduce((sum, i) => sum + (i.lastCharged - i.currentAmount), 0),
    [items]
  );

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <span className="text-2xl">📊</span>
        <p className="text-sm text-muted-foreground">No recurring bills to track yet</p>
        <p className="text-xs text-muted-foreground font-mono">Price changes will appear here once detected</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-5">
        {/* Summary strip */}
        <div className="flex gap-3">
          <Card className="flex-1">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Monthly Impact</p>
                <p className={`text-lg font-bold font-mono ${totalImpact > 0 ? 'text-red-400' : totalImpact < 0 ? 'text-green-400' : 'text-foreground'}`}>
                  {totalImpact > 0 ? '+' : ''}{USD.format(totalImpact)}/mo
                </p>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-lg font-bold font-mono text-red-400">{increased.length}</p>
                  <p className="text-[9px] font-mono text-muted-foreground uppercase">Increased</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold font-mono text-green-400">{decreased.length}</p>
                  <p className="text-[9px] font-mono text-muted-foreground uppercase">Decreased</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold font-mono text-muted-foreground">{stable.length}</p>
                  <p className="text-[9px] font-mono text-muted-foreground uppercase">Stable</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Increases */}
        {increased.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm">Price Increases</CardTitle>
                <Badge variant="secondary" className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">
                  {increased.length} item{increased.length > 1 ? 's' : ''}
                </Badge>
              </div>
              <CardDescription className="text-[10px] font-mono">Charges higher than your set amount</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-0">
                {increased.map((item, i) => (
                  <PriceRow key={item.billId} item={item} index={i} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Decreases */}
        {decreased.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm">Price Decreases</CardTitle>
                <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">
                  {decreased.length} item{decreased.length > 1 ? 's' : ''}
                </Badge>
              </div>
              <CardDescription className="text-[10px] font-mono">Charges lower than your set amount</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-0">
                {decreased.map((item, i) => (
                  <PriceRow key={item.billId} item={item} index={i} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stable */}
        {stable.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm">Stable</CardTitle>
                <Badge variant="secondary" className="text-[10px]">
                  {stable.length} item{stable.length > 1 ? 's' : ''}
                </Badge>
              </div>
              <CardDescription className="text-[10px] font-mono">No price changes detected</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-0">
                {stable.map((item, i) => (
                  <PriceRow key={item.billId} item={item} index={i} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}

const ROW_COLORS = ['bg-orange-500/20 text-orange-400', 'bg-purple-500/20 text-purple-400', 'bg-pink-500/20 text-pink-400', 'bg-emerald-500/20 text-emerald-400', 'bg-indigo-500/20 text-indigo-400', 'bg-amber-500/20 text-amber-400'];

function PriceRow({ item, index }: { item: PriceWatchItem; index: number }) {
  const delta = item.lastCharged - item.currentAmount;
  const up = delta > 0;
  const changed = Math.abs(delta) > 0.5;
  const pctChange = item.currentAmount > 0 ? Math.round((delta / item.currentAmount) * 100) : 0;
  const historyAmounts = item.chargeHistory.map(h => h.amount);

  return (
    <div className={`flex items-center gap-3 py-3 -mx-2 px-2 rounded-md hover:bg-muted/30 transition-colors ${index > 0 ? 'border-t border-border' : ''}`}>
      <Avatar className="w-9 h-9 shrink-0">
        <AvatarFallback className={`text-[10px] font-bold ${ROW_COLORS[index % ROW_COLORS.length]}`}>
          {getInitials(item.name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-foreground truncate">{item.name}</span>
          <Badge variant="outline" className="text-[9px] text-muted-foreground px-1.5 py-0 h-4">
            {item.isSubscription ? 'Sub' : 'Bill'}
          </Badge>
        </div>
        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
          Set: {USD.format(item.currentAmount)}/mo
          {changed && <span> → Charged: {USD.format(item.lastCharged)}/mo</span>}
        </div>
      </div>

      {historyAmounts.length >= 2 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-default">
              <MiniSparkline
                points={historyAmounts}
                color={changed ? (up ? '#f87171' : '#4ade80') : '#71717a'}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-popover text-popover-foreground border shadow-lg px-3 py-2">
            <div className="space-y-0.5">
              {item.chargeHistory.slice(-5).map(h => (
                <div key={h.date} className="text-[10px] font-mono flex justify-between gap-4">
                  <span className="text-muted-foreground">{h.date}</span>
                  <span>{USD.format(h.amount)}</span>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      )}

      {changed ? (
        <Badge variant="outline" className={`text-[10px] font-mono font-bold px-2 h-6 shrink-0 gap-1 ${up ? 'text-red-400 border-red-500/25' : 'text-green-400 border-green-500/25'}`}>
          {up ? '↑' : '↓'} {USD.format(Math.abs(delta))}
          <span className="text-[9px] opacity-60">({pctChange > 0 ? '+' : ''}{pctChange}%)</span>
        </Badge>
      ) : (
        <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground px-2 h-6 shrink-0">
          No change
        </Badge>
      )}
    </div>
  );
}
