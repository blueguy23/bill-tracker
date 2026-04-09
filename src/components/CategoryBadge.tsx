import type { BillCategory } from '@/types/bill';

const STYLES: Record<BillCategory, { pill: string; dot: string }> = {
  utilities:     { pill: 'bg-blue-500/10 text-cyan-400',     dot: 'bg-blue-500' },
  subscriptions: { pill: 'bg-violet-500/10 text-violet-400', dot: 'bg-violet-500' },
  insurance:     { pill: 'bg-emerald-500/10 text-emerald-400', dot: 'bg-emerald-500' },
  rent:          { pill: 'bg-orange-500/10 text-orange-400', dot: 'bg-orange-500' },
  loans:         { pill: 'bg-red-500/10 text-red-400',       dot: 'bg-red-500' },
  other:         { pill: 'bg-depth-800 text-sky-500',        dot: 'bg-zinc-500' },
};

interface CategoryBadgeProps {
  category: BillCategory;
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  const s = STYLES[category] ?? STYLES['other'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${s.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
      {category}
    </span>
  );
}
