export default function RecurringLoading() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-pulse">
      <div className="pt-2 space-y-1">
        <div className="h-6 w-36 bg-zinc-800 rounded-md" />
        <div className="h-4 w-32 bg-zinc-800/60 rounded-md" />
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/[0.06] bg-zinc-900 p-5 space-y-3">
            <div className="h-3 w-24 bg-zinc-800 rounded" />
            <div className="h-9 w-28 bg-zinc-800 rounded-md" />
            <div className="h-3 w-12 bg-zinc-800/60 rounded" />
          </div>
        ))}
      </div>
      {/* Interval group */}
      <div className="rounded-xl border border-white/[0.06] bg-zinc-900 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.06] flex justify-between">
          <div className="h-4 w-24 bg-zinc-800 rounded" />
          <div className="h-4 w-16 bg-zinc-800 rounded" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-5 py-3 border-b border-white/[0.03] flex gap-8">
            <div className="h-3 w-32 bg-zinc-800 rounded flex-1" />
            <div className="h-3 w-16 bg-zinc-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
