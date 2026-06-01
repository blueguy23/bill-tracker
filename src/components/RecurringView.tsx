'use client';

import { useState, useRef } from 'react';
import type { BillResponse } from '@/types/bill';
import { BillsView, type BillsViewHandle } from './BillsView';
import { RecurringStats } from './RecurringStats';
import { PriceWatchView, type PriceWatchItem } from './PriceWatchView';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Filter = 'all' | 'unpaid' | 'paid' | 'autopay';
type ViewTab = 'bills' | 'price-watch';

interface RecurringViewProps {
  bills: BillResponse[];
  totalMonthly: number;
  totalPaid: number;
  autoPayCount: number;
  priceWatchItems?: PriceWatchItem[];
  defaultTab?: ViewTab;
}

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const FILTERS: Filter[] = ['all', 'unpaid', 'paid', 'autopay'];

export function RecurringView({ bills, totalMonthly, totalPaid, autoPayCount, priceWatchItems = [], defaultTab = 'bills' }: RecurringViewProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [activeTab, setActiveTab] = useState<ViewTab>(defaultTab);
  const billsViewRef = useRef<BillsViewHandle>(null);

  const filtered = filter === 'all'    ? bills
    : filter === 'paid'    ? bills.filter(b => b.isPaid)
    : filter === 'unpaid'  ? bills.filter(b => !b.isPaid)
    : bills.filter(b => b.isAutoPay);

  const priceChanges = priceWatchItems.filter(i => Math.abs(i.lastCharged - i.currentAmount) > 0.5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Tab toggle + actions */}
      <div className="flex items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ViewTab)}>
          <TabsList className="h-9 p-1 bg-muted/50">
            <TabsTrigger value="bills" className="text-xs font-semibold px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Bills
            </TabsTrigger>
            <TabsTrigger value="price-watch" className="text-xs font-semibold px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5">
              Price Watch
              {priceChanges.length > 0 && (
                <Badge variant="secondary" className="bg-red-500/10 text-red-400 border-red-500/20 text-[9px] h-4 px-1.5 ml-1">
                  {priceChanges.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === 'bills' && (
          <Button
            data-testid="add-bill-btn"
            onClick={() => billsViewRef.current?.openCreate()}
            size="sm"
            className="text-xs font-semibold"
          >
            + Add Bill
          </Button>
        )}
      </div>

      {activeTab === 'bills' ? (
        <>
          {/* Stats row */}
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { label: 'TOTAL / MO', value: USD.format(totalMonthly), color: 'var(--text)' },
              { label: 'PAID',       value: USD.format(totalPaid),    color: 'var(--green)' },
              { label: 'REMAINING',  value: USD.format(totalMonthly - totalPaid), color: 'var(--red)' },
              { label: 'AUTOPAY',    value: `${autoPayCount} bills`,  color: 'var(--green)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 16px' }}>
                <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--mono)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 14, color }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Filter chips */}
          <div className="flex gap-1.5">
            {FILTERS.map(f => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'secondary'}
                size="sm"
                className="text-[10px] font-semibold font-mono uppercase tracking-wider h-7 px-3"
                onClick={() => setFilter(f)}
              >
                {f}
              </Button>
            ))}
          </div>

          <RecurringStats bills={bills} />

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <BillsView ref={billsViewRef} initialBills={filtered} hideAddButton />
          </div>
        </>
      ) : (
        <PriceWatchView items={priceWatchItems} />
      )}
    </div>
  );
}
