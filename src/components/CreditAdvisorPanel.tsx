'use client';

import type { CreditAdvisorResponse, AZEOCard } from '@/types/creditAdvisor';
import { UtilizationTrendChart } from './UtilizationTrendChart';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function utilizationColor(util: number): string {
  if (util < 0.10) return 'text-emerald-400';
  if (util < 0.30) return 'text-green-400';
  if (util < 0.70) return 'text-amber-400';
  return 'text-red-400';
}

function utilizationBg(util: number): string {
  if (util < 0.10) return 'bg-emerald-500/[0.10]';
  if (util < 0.30) return 'bg-green-500/[0.10]';
  if (util < 0.70) return 'bg-amber-500/[0.10]';
  return 'bg-red-500/[0.10]';
}

function AZEOCardRow({ card }: { card: AZEOCard }) {
  const pct = `${Math.round(card.currentUtilization * 100)}%`;
  const targetPct = `${Math.round(card.targetUtilization * 100)}%`;

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${card.alertActive ? 'border-amber-500/40 bg-amber-500/[0.04]' : 'border-white/[0.06] bg-zinc-800/50'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{card.accountName}</p>
          {card.isAnchor && (
            <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/[0.12] rounded-full px-2 py-0.5 mt-0.5 inline-block">
              AZEO Anchor
            </span>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className={`text-lg font-bold tabular-nums ${utilizationColor(card.currentUtilization)}`}>{pct}</p>
          <p className="text-xs text-zinc-500">{USD.format(card.currentBalance)} / {USD.format(card.creditLimit)}</p>
        </div>
      </div>

      {card.paydownNeeded > 0 && (
        <div className={`rounded-lg px-3 py-2 text-xs space-y-1 ${utilizationBg(card.currentUtilization)}`}>
          <p className="text-zinc-300">
            Pay <span className="font-semibold text-white">{USD.format(card.paydownNeeded)}</span>
            {' '}→ report{' '}
            <span className="font-semibold text-white">{USD.format(card.targetBalance)} ({targetPct})</span>
          </p>
          {!card.isAnchor && (
            <p className="text-zinc-400">Pay <span className="font-semibold text-white">{USD.format(card.currentBalance)}</span> → report $0 (AZEO target)</p>
          )}
        </div>
      )}

      {card.paydownNeeded === 0 && (
        <p className="text-xs text-emerald-400">Already at target ({targetPct}) ✓</p>
      )}

      {card.statementClosingDay && (
        <div className="flex items-center gap-2 text-xs">
          {card.alertActive ? (
            <span className="text-amber-400 font-medium">
              ⚠ Statement closes in {card.daysUntilClose} day{card.daysUntilClose !== 1 ? 's' : ''} — pay now
            </span>
          ) : (
            <span className="text-zinc-500">
              Statement closes day {card.statementClosingDay}
              {card.daysUntilClose !== null && ` (${card.daysUntilClose}d away)`}
            </span>
          )}
        </div>
      )}

      {!card.statementClosingDay && (
        <p className="text-xs text-zinc-600">
          Set statement closing date in <a href="/settings" className="text-zinc-400 underline underline-offset-2">Settings</a> for close alerts
        </p>
      )}
    </div>
  );
}

interface CreditAdvisorPanelProps {
  data: CreditAdvisorResponse;
}

export function CreditAdvisorPanel({ data }: CreditAdvisorPanelProps) {
  const { trend, azeo } = data;

  if (!azeo && trend.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Utilization trend */}
      {trend.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-zinc-900 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/[0.06]">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">30-Day Utilization Trend</p>
          </div>
          <div className="px-5 py-4">
            <UtilizationTrendChart data={trend} />
          </div>
        </div>
      )}

      {/* AZEO Plan */}
      {azeo && (
        <div className="rounded-xl border border-white/[0.06] bg-zinc-900 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">AZEO Paydown Plan</p>
              <p className="text-xs text-zinc-600 mt-0.5">
                All Zero Except One — pay every card to $0 except your highest-limit card (anchor), left at {Math.round(azeo.anchorCard.targetUtilization * 100)}%
              </p>
            </div>
            {azeo.projectedScore !== null && (
              <div className="text-right shrink-0 ml-4">
                <p className="text-xs text-zinc-500">If completed</p>
                <p className="text-lg font-bold text-emerald-400">{azeo.projectedScore}<span className="text-xs text-zinc-500">/100</span></p>
              </div>
            )}
          </div>
          <div className="p-4 space-y-3">
            {azeo.cards.map((card) => (
              <AZEOCardRow key={card.accountId} card={card} />
            ))}
          </div>
          <div className="px-5 py-3 border-t border-white/[0.06]">
            <p className="text-xs text-zinc-600">
              Projected utilization after AZEO: <span className="text-zinc-400">{Math.round(azeo.projectedOverallUtilization * 100)}%</span>
              {' · '}Configure statement dates in <a href="/settings" className="text-zinc-400 underline underline-offset-2">Settings</a> to receive close alerts
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
