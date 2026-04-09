'use client';

interface CreditHealthScoreProps {
  score: number | null;
}

function getLabel(score: number): { label: string; color: string; from: string; to: string } {
  if (score >= 72) return { label: 'Excellent', color: 'text-emerald-400', from: 'from-emerald-500/[0.12]', to: 'to-zinc-900' };
  if (score >= 54) return { label: 'Good', color: 'text-blue-400', from: 'from-blue-500/[0.12]', to: 'to-zinc-900' };
  if (score >= 36) return { label: 'Fair', color: 'text-amber-400', from: 'from-amber-500/[0.12]', to: 'to-zinc-900' };
  return { label: 'Poor', color: 'text-red-400', from: 'from-red-500/[0.12]', to: 'to-zinc-900' };
}

export function CreditHealthScore({ score }: CreditHealthScoreProps) {
  if (score === null) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-zinc-900 p-5 flex flex-col gap-1">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Health Score</p>
        <p className="text-2xl font-bold text-zinc-600">—</p>
        <p className="text-sm text-zinc-500">No credit accounts synced</p>
      </div>
    );
  }

  const { label, color, from, to } = getLabel(score);

  return (
    <div className={`rounded-xl border border-white/[0.06] bg-gradient-to-br ${from} ${to} p-5 flex flex-col gap-1`}>
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Health Score</p>
      <p className={`text-4xl font-bold ${color}`}>{score}</p>
      <p className={`text-sm font-medium ${color}`}>{label}</p>
    </div>
  );
}
