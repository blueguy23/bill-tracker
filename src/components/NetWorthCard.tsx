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
  checking: 'bg-blue-500/10 text-blue-400',
  savings: 'bg-emerald-500/10 text-emerald-400',
  credit: 'bg-red-500/10 text-red-400',
  investment: 'bg-violet-500/10 text-violet-400',
  other: 'bg-zinc-500/10 text-zinc-400',
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
    <div className="rounded-xl border border-white/[0.06] bg-zinc-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-white/[0.06]">
        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Net Worth</p>
        <span className={`text-2xl font-bold tabular-nums leading-none ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {USD.format(totalBalance)}
        </span>
      </div>

      {/* Account list */}
      <div className="divide-y divide-white/[0.03] flex-1">
        {accounts.map((a) => (
          <div key={a._id} className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02] transition-colors gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-zinc-300 truncate">{a.orgName}</p>
              <p className="text-[11px] text-zinc-600 truncate">{a.name}</p>
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <span className={`text-xs font-medium tabular-nums ${a.balance < 0 ? 'text-red-400' : 'text-zinc-200'}`}>
                {USD.format(a.balance)}
              </span>
              <span className={`text-[10px] font-medium px-1.5 py-px rounded-full ${TYPE_COLORS[a.accountType] ?? TYPE_COLORS['other']}`}>
                {TYPE_LABELS[a.accountType] ?? 'Other'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-white/[0.06]">
        <p className="text-[11px] text-zinc-700">
          Synced {timeAgo(accounts[0]!.lastSyncedAt)}
        </p>
      </div>
    </div>
  );
}
