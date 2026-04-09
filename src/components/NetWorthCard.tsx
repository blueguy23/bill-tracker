import type { Account } from '@/lib/simplefin/types';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const TYPE_LABELS: Record<string, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit: 'Credit',
  investment: 'Investment',
  other: 'Other',
};

const TYPE_COLORS: Record<string, string> = {
  checking: 'bg-blue-500/10 text-cyan-400',
  savings: 'bg-emerald-500/10 text-emerald-400',
  credit: 'bg-red-500/10 text-red-400',
  investment: 'bg-violet-500/10 text-violet-400',
  other: 'bg-zinc-500/10 text-sky-500',
};

function timeAgo(date: Date | string): string {
  const diffMin = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface NetWorthCardProps {
  accounts: Account[];
}

export function NetWorthCard({ accounts }: NetWorthCardProps) {
  if (accounts.length === 0) return null;

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const isPositive = totalBalance >= 0;

  return (
    <div className="rounded-xl border border-teal-900/40 bg-depth-900 overflow-hidden">
      <div className="px-5 py-4 border-b border-teal-900/40 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Net Worth</h3>
        <span className={`text-xl font-bold tabular-nums ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {USD.format(totalBalance)}
        </span>
      </div>
      <div className="divide-y divide-white/[0.03]">
        {accounts.map((a) => (
          <div key={a._id} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="min-w-0">
                <p className="text-sm text-sky-100 truncate">{a.orgName}</p>
                <p className="text-xs text-sky-700 truncate">{a.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-4">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${TYPE_COLORS[a.accountType] ?? TYPE_COLORS.other}`}>
                {TYPE_LABELS[a.accountType] ?? 'Other'}
              </span>
              <span className={`text-sm font-medium tabular-nums ${a.balance < 0 ? 'text-red-400' : 'text-sky-100'}`}>
                {USD.format(a.balance)}
              </span>
            </div>
          </div>
        ))}
      </div>
      {accounts.length > 0 && (
        <div className="px-5 py-2.5 border-t border-teal-900/40">
          <p className="text-[11px] text-sky-900">
            Last synced {timeAgo(accounts[0]!.lastSyncedAt)}
          </p>
        </div>
      )}
    </div>
  );
}
