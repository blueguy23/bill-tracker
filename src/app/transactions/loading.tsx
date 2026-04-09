export default function TransactionsLoading() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-pulse">
      <div className="pt-2 space-y-1">
        <div className="h-6 w-36 bg-zinc-800 rounded-md" />
        <div className="h-4 w-52 bg-zinc-800/60 rounded-md" />
      </div>
      {/* Search */}
      <div className="h-10 w-full bg-zinc-900 border border-white/[0.06] rounded-lg" />
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="h-9 w-36 bg-zinc-900 border border-white/[0.06] rounded-lg" />
        <div className="h-9 w-80 bg-zinc-900 border border-white/[0.06] rounded-lg" />
      </div>
      {/* Table */}
      <div className="rounded-xl border border-white/[0.06] bg-zinc-900 overflow-hidden">
        <div className="border-b border-white/[0.06] px-4 py-3 flex gap-8">
          <div className="h-3 w-16 bg-zinc-800 rounded" />
          <div className="h-3 w-32 bg-zinc-800 rounded" />
          <div className="h-3 w-24 bg-zinc-800 rounded hidden md:block" />
          <div className="h-3 w-16 bg-zinc-800 rounded ml-auto" />
        </div>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="px-4 py-3 border-b border-white/[0.03] flex items-center gap-8">
            <div className="h-3 w-20 bg-zinc-800 rounded shrink-0" />
            <div className="h-3 bg-zinc-800 rounded flex-1" style={{ width: `${40 + (i % 4) * 15}%` }} />
            <div className="h-3 w-24 bg-zinc-800 rounded hidden md:block shrink-0" />
            <div className="h-3 w-16 bg-zinc-800 rounded shrink-0 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
