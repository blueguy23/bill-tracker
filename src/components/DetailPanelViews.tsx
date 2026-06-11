'use client';

import type { PanelType } from './PanelTrigger';
import type { DetailPanelData } from './DetailPanel';
import { SavingsView } from './detail-panel/SavingsView';
import { BillsView } from './detail-panel/BillsView';
import { MoneyLeftView } from './detail-panel/MoneyLeftView';
import { CategoryView } from './detail-panel/CategoryView';
import { TransactionView } from './detail-panel/TransactionView';
import { NetWorthView } from './detail-panel/NetWorthView';
import { BillDetailView } from './detail-panel/BillDetailView';

export function getTitle(type: PanelType | null, arg: string | number | undefined, data: DetailPanelData): string {
  switch (type) {
    case 'savings':    return 'Savings Rate';
    case 'bills':      return 'Bills This Month';
    case 'money-left': return 'Money Left After Bills';
    case 'networth':   return 'Net Worth';
    case 'category':   return String(arg ?? 'Category');
    case 'transaction': {
      const tx = data.transactions[Number(arg ?? -1)];
      return tx?.description ?? 'Transaction';
    }
    case 'bill-detail': return String(arg ?? 'Bill');
    default: return '—';
  }
}

export function PanelBody({ type, arg, data, expanded }: {
  type: PanelType; arg?: string | number; data: DetailPanelData; expanded: boolean;
}) {
  switch (type) {
    case 'savings':     return <SavingsView data={data} expanded={expanded} />;
    case 'bills':       return <BillsView data={data} />;
    case 'money-left':  return <MoneyLeftView data={data} expanded={expanded} />;
    case 'category':    return <CategoryView category={String(arg)} data={data} expanded={expanded} />;
    case 'transaction': return <TransactionView index={Number(arg)} data={data} />;
    case 'networth':    return <NetWorthView data={data} expanded={expanded} />;
    case 'bill-detail': return <BillDetailView name={String(arg)} data={data} />;
    default: return null;
  }
}
