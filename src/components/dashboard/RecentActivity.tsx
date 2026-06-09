'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PanelTrigger } from '@/components/PanelTrigger';
import type { Transaction } from '@/lib/simplefin/types';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const CATEGORY_ICONS: Record<string, string> = {
  food: '🍕', transport: '🚗', shopping: '🛒', entertainment: '🎬',
  utilities: '⚡', subscriptions: '↻', rent: '🏠', insurance: '🛡',
  health: '💊', loans: '💳', other: '·',
};

const AVATAR_COLORS = ['bg-orange-500/20 text-orange-400', 'bg-purple-500/20 text-purple-400', 'bg-pink-500/20 text-pink-400', 'bg-emerald-500/20 text-emerald-400', 'bg-indigo-500/20 text-indigo-400', 'bg-amber-500/20 text-amber-400'];

interface RecentActivityProps {
  recentTransactions: Transaction[];
}

export function RecentActivity({ recentTransactions }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Recent Activity</CardTitle>
          <a href="/transactions" className="text-[11px] font-semibold text-muted-foreground hover:text-foreground font-mono transition-colors">All →</a>
        </div>
        <CardDescription className="text-[10px] font-mono">Last 7 days</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {recentTransactions.length === 0 ? (
          <p className="text-[11px] text-muted-foreground font-mono text-center py-8">No transactions — sync to load</p>
        ) : (
          <div className="space-y-0">
            {recentTransactions.slice(0, 6).map((t, i) => {
              const amt = Number(t.amount);
              const pos = amt >= 0;
              const date = t.posted
                ? (t.posted instanceof Date ? t.posted : new Date(Number(t.posted) * 1000))
                    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : '';
              const cat = t.category?.toLowerCase() ?? '';
              return (
                <PanelTrigger key={t._id} type="transaction" arg={i}>
                  <div className={`flex items-center gap-3 py-2.5 cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded-md transition-colors ${i > 0 ? 'border-t border-border' : ''}`}>
                    <Avatar className="w-8 h-8 shrink-0">
                      {t.merchantDomain && (
                        <AvatarImage
                          src={`https://www.google.com/s2/favicons?domain=${t.merchantDomain}&sz=32`}
                          alt={t.description}
                          className="p-1"
                        />
                      )}
                      <AvatarFallback className={`text-sm ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                        {CATEGORY_ICONS[cat] ?? '·'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-foreground truncate">{t.description}</div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5 capitalize">{t.category ?? 'Uncategorized'}</div>
                    </div>
                    <div className={`font-mono text-[13px] font-semibold shrink-0 ${pos ? 'text-green-400' : 'text-foreground'}`}>
                      {pos ? '+' : '−'}{USD.format(Math.abs(amt))}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono shrink-0 w-12 text-right">{date}</div>
                  </div>
                </PanelTrigger>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
