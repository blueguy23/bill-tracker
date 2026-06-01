'use client';

import { useEffect } from 'react';
import {
  Chart, LineController, LineElement, PointElement,
  BarController, BarElement,
  CategoryScale, LinearScale,
  Tooltip, Filler, Legend,
} from 'chart.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PanelType } from './PanelTrigger';
import type { DetailPanelData } from './DetailPanel';

Chart.register(
  LineController, LineElement, PointElement,
  BarController, BarElement,
  CategoryScale, LinearScale,
  Tooltip, Filler, Legend,
);

const USD  = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const USD0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const CHART_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { color: '#1e1e2a' }, ticks: { color: '#44445a', font: { family: "'IBM Plex Mono',monospace", size: 10 } } },
    y: { grid: { color: '#1e1e2a' }, ticks: { color: '#44445a', font: { family: "'IBM Plex Mono',monospace", size: 10 } } },
  },
} as const;

const CATEGORIES = ['food','transport','shopping','entertainment','health','utilities','subscriptions','income','transfer','rent','insurance','other'];

// ── Title ───────────────────────────────────────────────────────────────────

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

// ── Body router ─────────────────────────────────────────────────────────────

export function PanelBody({ type, arg, data, chartRef, expanded }: {
  type: PanelType; arg?: string | number; data: DetailPanelData;
  chartRef: React.MutableRefObject<Chart | null>; expanded: boolean;
}) {
  switch (type) {
    case 'savings':    return <SavingsView data={data} chartRef={chartRef} expanded={expanded} />;
    case 'bills':      return <BillsView data={data} />;
    case 'money-left': return <MoneyLeftView data={data} chartRef={chartRef} expanded={expanded} />;
    case 'category':   return <CategoryView category={String(arg)} data={data} chartRef={chartRef} expanded={expanded} />;
    case 'transaction': return <TransactionView index={Number(arg)} data={data} />;
    case 'networth':   return <NetWorthView data={data} chartRef={chartRef} expanded={expanded} />;
    case 'bill-detail': return <BillDetailView name={String(arg)} data={data} />;
    default: return null;
  }
}

// ── Shared pieces ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: string }) {
  return <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text3)', marginBottom: 12 }}>{children}</div>;
}

function Callout({ value, label, valueColor }: { value: string; label: React.ReactNode; valueColor?: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '14px 16px', marginBottom: 16 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 700, color: valueColor ?? 'var(--text)', marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text2)' }}>{label}</div>
    </div>
  );
}

function ListItem({ left, right, detail, rightColor, badge }: {
  left: string; right?: string; detail?: string; rightColor?: string;
  badge?: { label: string; bg: string; color: string };
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{left}</div>
        {detail && <div style={{ fontSize: 11, color: 'var(--text2)' }}>{detail}</div>}
      </div>
      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8 }}>
        {right && <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: rightColor ?? 'var(--text)' }}>{right}</div>}
        {badge && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: '0.5px', background: badge.bg, color: badge.color }}>{badge.label}</span>}
      </div>
    </div>
  );
}

function SummaryRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '2px solid var(--border-l, #252535)', marginTop: 4 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: color ?? 'var(--text)' }}>{value}</span>
    </div>
  );
}

function Recommendation({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--accent-a, rgba(124,108,240,0.15))', border: '1px solid rgba(124,108,240,0.2)', borderRadius: 6, padding: '12px 16px', fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
      {children}
    </div>
  );
}

function ChartBox({ canvasId, expanded }: { canvasId: string; expanded: boolean }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 16, marginBottom: 16 }}>
      <canvas id={canvasId} style={{ width: '100%', height: expanded ? 500 : 180 }} />
    </div>
  );
}

// ── Hook: build chart after mount ───────────────────────────────────────────

function useChart(
  chartRef: React.MutableRefObject<Chart | null>,
  builder: (ctx: HTMLCanvasElement) => Chart | null,
  deps: unknown[],
) {
  useEffect(() => {
    const el = document.getElementById('panelChart') as HTMLCanvasElement | null;
    if (!el) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    chartRef.current = builder(el);
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// ── Views ───────────────────────────────────────────────────────────────────

function SavingsView({ data, chartRef, expanded }: { data: DetailPanelData; chartRef: React.MutableRefObject<Chart | null>; expanded: boolean }) {
  const months = data.history.slice(-6);
  const rates = months.map(m => m.income > 0 ? ((m.income - m.expenses) / m.income) * 100 : 0);
  const labels = months.map(m => m.month);
  const bestIdx = rates.indexOf(Math.max(...rates));
  const bestMonth = labels[bestIdx] ?? '';
  const bestRate = rates[bestIdx] ?? 0;
  const current = data.savingsRate;
  const gap = Math.max(0, 20 - current);
  const gapDollars = data.cashFlow.income > 0 ? Math.round(gap / 100 * data.cashFlow.income) : 0;

  useChart(chartRef, (ctx) => new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{ data: rates, borderColor: '#7c6cf0', backgroundColor: 'rgba(124,108,240,0.08)', fill: true, tension: 0.35, pointBackgroundColor: '#7c6cf0', pointRadius: 4, borderWidth: 2 }],
    },
    options: { ...CHART_OPTS, scales: { ...CHART_OPTS.scales, y: { ...CHART_OPTS.scales.y, ticks: { ...CHART_OPTS.scales.y.ticks, callback: (v: string | number) => v + '%' }, min: 0, max: Math.max(45, bestRate + 10) } } },
  }), [labels.join(), expanded]);

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <ChartBox canvasId="panelChart" expanded={expanded} />
        <Callout value={`${bestRate.toFixed(1)}%`} label={<><span style={{ color: 'var(--green)', fontWeight: 600 }}>Your best month in 6 months</span> was {bestMonth}</>} />
      </div>
      <div style={{ marginBottom: 24 }}>
        <SectionTitle>Recommendation</SectionTitle>
        {current >= 20 ? (
          <Recommendation>You&apos;re above your 20% savings target — keep it up!</Recommendation>
        ) : (
          <Recommendation>
            <strong style={{ color: 'var(--accent)' }}>Save an extra {USD0.format(gapDollars)}</strong> to hit your 20% target this month. You&apos;re currently at {current.toFixed(0)}%.
          </Recommendation>
        )}
      </div>
    </>
  );
}

function currentYYYYMM(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function BillsView({ data }: { data: DetailPanelData }) {
  const ym = currentYYYYMM();
  const paid   = data.bills.filter(b => b.isPaid && b.paidMonth === ym);
  const unpaid = data.bills.filter(b => !b.isPaid || b.paidMonth !== ym);
  const totalPaid   = paid.reduce((s, b) => s + b.amount, 0);
  const totalUnpaid = unpaid.reduce((s, b) => s + b.amount, 0);

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <SectionTitle>Paid</SectionTitle>
        {paid.length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>No bills paid yet</div>}
        {paid.map(b => (
          <ListItem key={b.name + b.amount} left={b.name} detail={`${b.category} · Due ${formatDueDate(b.dueDate)}`} right={USD.format(b.amount)}
            badge={{ label: b.isAutoPay ? 'Auto' : 'Paid', bg: 'var(--green-a, rgba(34,197,94,0.12))', color: 'var(--green)' }} />
        ))}
      </div>
      <div style={{ marginBottom: 24 }}>
        <SectionTitle>Upcoming / Unpaid</SectionTitle>
        {unpaid.length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>All bills covered!</div>}
        {unpaid.map(b => (
          <ListItem key={b.name + b.amount} left={b.name} detail={`${b.category} · Due ${formatDueDate(b.dueDate)}`} right={USD.format(b.amount)}
            badge={{ label: b.isAutoPay ? 'Auto' : 'Due', bg: 'var(--gold-a, rgba(212,148,58,0.12))', color: 'var(--gold)' }} />
        ))}
      </div>
      <SummaryRow label="Total paid" value={USD.format(totalPaid)} color="var(--green)" />
      <SummaryRow label="Remaining" value={USD.format(totalUnpaid)} color="var(--gold)" />
    </>
  );
}

function MoneyLeftView({ data, chartRef, expanded }: { data: DetailPanelData; chartRef: React.MutableRefObject<Chart | null>; expanded: boolean }) {
  const months = data.history.slice(-6);
  const labels = months.map(m => m.month);
  const leftovers = months.map(m => Math.max(0, m.income - m.expenses));
  const net = data.cashFlow.net;
  const prevNet = leftovers.length >= 2 ? leftovers[leftovers.length - 2]! : 0;
  const delta = net - prevNet;

  useChart(chartRef, (ctx) => new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data: leftovers, backgroundColor: leftovers.map(v => v > 0 ? '#22c55e' : '#d4943a'), borderRadius: 4, barThickness: 28 }],
    },
    options: { ...CHART_OPTS, scales: { ...CHART_OPTS.scales, y: { ...CHART_OPTS.scales.y, ticks: { ...CHART_OPTS.scales.y.ticks, callback: (v: string | number) => '$' + v }, min: 0 } } },
  }), [labels.join(), expanded]);

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <ChartBox canvasId="panelChart" expanded={expanded} />
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

function CategoryView({ category, data, chartRef, expanded }: { category: string; data: DetailPanelData; chartRef: React.MutableRefObject<Chart | null>; expanded: boolean }) {
  const cat = data.categorySpend.find(c => c.label === category);
  const budget = data.budgetAlerts.find(b => b.category === category);
  const spent = cat?.amount ?? 0;
  const limit = budget?.limit ?? 0;
  const diff = spent - limit;
  const statusText = limit > 0 ? (diff > 0 ? `Over budget by ${USD0.format(diff)}` : `Under budget by ${USD0.format(Math.abs(diff))}`) : `${USD0.format(spent)} spent`;
  const statusColor = diff > 0 && limit > 0 ? 'var(--red)' : 'var(--green)';

  const topMerchants = data.transactions
    .filter(t => (t.category ?? '').toLowerCase() === category.toLowerCase() && Number(t.amount) < 0)
    .reduce<Map<string, number>>((acc, t) => {
      acc.set(t.description, (acc.get(t.description) ?? 0) + Math.abs(Number(t.amount)));
      return acc;
    }, new Map());
  const sorted = Array.from(topMerchants.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

  useChart(chartRef, (ctx) => new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Budget', 'Actual'],
      datasets: [{ data: [limit, spent], backgroundColor: ['rgba(128,128,160,0.15)', diff > 0 && limit > 0 ? '#ef4444' : '#7c6cf0'], borderRadius: 4, barThickness: 40 }],
    },
    options: { ...CHART_OPTS, scales: { ...CHART_OPTS.scales, y: { ...CHART_OPTS.scales.y, ticks: { ...CHART_OPTS.scales.y.ticks, callback: (v: string | number) => '$' + v }, min: 0 } } },
  }), [category, expanded]);

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <ChartBox canvasId="panelChart" expanded={expanded} />
        <Callout value={statusText} valueColor={statusColor} label={limit > 0 ? `${USD0.format(spent)} spent of ${USD0.format(limit)} budget this month` : `${USD0.format(spent)} spent this month`} />
      </div>
      {sorted.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionTitle>Top Merchants This Month</SectionTitle>
          {sorted.map(([name, amt]) => (
            <ListItem key={name} left={name} right={USD.format(amt)} />
          ))}
        </div>
      )}
    </>
  );
}

function TransactionView({ index, data }: { index: number; data: DetailPanelData }) {
  const tx = data.transactions[index];
  if (!tx) return <div style={{ color: 'var(--text3)', fontSize: 12 }}>Transaction not found</div>;

  const amt = Number(tx.amount);
  const pos = amt >= 0;
  const date = tx.posted
    ? (tx.posted instanceof Date ? tx.posted : new Date(typeof tx.posted === 'number' ? tx.posted * 1000 : tx.posted))
        .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  const merchantTxns = data.transactions.filter(t => t.description === tx.description);
  const thisMonth = merchantTxns.filter(t => {
    if (!t.posted) return false;
    const d = t.posted instanceof Date ? t.posted : new Date(typeof t.posted === 'number' ? Number(t.posted) * 1000 : t.posted);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 12, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{thisMonth}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>This month</div>
        </div>
        <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 12, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{merchantTxns.length}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>All time</div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <SectionTitle>Details</SectionTitle>
        <ListItem left="Amount" right={`${pos ? '+' : '-'}${USD.format(Math.abs(amt))}`} rightColor={pos ? 'var(--green)' : 'var(--text)'} />
        <ListItem left="Date" right={date} />
        <ListItem left="Category" right={tx.category ?? 'Uncategorized'} />
      </div>

      <div>
        <SectionTitle>Recategorize</SectionTitle>
        <Select defaultValue={tx.category ?? 'other'}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

function NetWorthView({ data, chartRef, expanded }: { data: DetailPanelData; chartRef: React.MutableRefObject<Chart | null>; expanded: boolean }) {
  const total = data.accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);
  const assets = data.accounts.filter(a => (Number(a.balance) || 0) >= 0).reduce((s, a) => s + (Number(a.balance) || 0), 0);
  const liabilities = Math.abs(data.accounts.filter(a => (Number(a.balance) || 0) < 0).reduce((s, a) => s + (Number(a.balance) || 0), 0));

  useChart(chartRef, (ctx) => new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Assets', 'Liabilities', 'Net'],
      datasets: [{ data: [assets, liabilities, total], backgroundColor: ['#22c55e', '#ef4444', '#7c6cf0'], borderRadius: 4, barThickness: 40 }],
    },
    options: { ...CHART_OPTS, scales: { ...CHART_OPTS.scales, y: { ...CHART_OPTS.scales.y, ticks: { ...CHART_OPTS.scales.y.ticks, callback: (v: string | number) => '$' + Number(v).toLocaleString() }, min: 0 } } },
  }), [total, expanded]);

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Callout value={USD0.format(total)} label={<><span style={{ color: 'var(--green)', fontWeight: 600 }}>{USD0.format(assets)} assets</span> · <span style={{ color: 'var(--red)', fontWeight: 600 }}>{USD0.format(liabilities)} liabilities</span></>} />
        <ChartBox canvasId="panelChart" expanded={expanded} />
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

function BillDetailView({ name, data }: { name: string; data: DetailPanelData }) {
  const bill = data.bills.find(b => b.name === name && !b.isPaid) ?? data.bills.find(b => b.name === name);
  if (!bill) return <div style={{ color: 'var(--text3)', fontSize: 12 }}>Bill not found</div>;

  const ym = currentYYYYMM();
  const isPaid = bill.isPaid && bill.paidMonth === ym;

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Callout value={USD.format(bill.amount)} label={`${bill.category} · Due ${formatDueDate(bill.dueDate)}`} />
      </div>
      <div style={{ marginBottom: 24 }}>
        <SectionTitle>Status</SectionTitle>
        <ListItem left="Payment status"
          badge={{ label: isPaid ? 'Paid' : 'Due', bg: isPaid ? 'var(--green-a, rgba(34,197,94,0.12))' : 'var(--gold-a, rgba(212,148,58,0.12))', color: isPaid ? 'var(--green)' : 'var(--gold)' }} />
        <ListItem left="Auto-pay" right={bill.isAutoPay ? 'Enabled' : 'Off'} />
        <ListItem left="Recurring" right={bill.recurrenceInterval ?? 'One-time'} />
      </div>
      {bill.renewalNote && (
        <div>
          <SectionTitle>Renewal Note</SectionTitle>
          <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{bill.renewalNote}</div>
        </div>
      )}
    </>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDueDate(d: string | number): string {
  if (typeof d === 'number') {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
