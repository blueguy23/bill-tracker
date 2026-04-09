export default function SummaryLoading() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-pulse">
      <div className="pt-2 space-y-1">
        <div className="h-6 w-36 bg-zinc-800 rounded-md" />
        <div className="h-4 w-48 bg-zinc-800/60 rounded-md" />
      </div>
      {/* Month nav */}
      <div className="flex items-center gap-4">
        <div className="h-8 w-8 bg-zinc-800 rounded-lg" />
        <div className="h-5 w-40 bg-zinc-800 rounded-md" />
        <div className="h-8 w-8 bg-zinc-800 rounded-lg" />
      </div>
      {/* Spending section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/[0.06] bg-zinc-900 p-5 space-y-3">
            <div className="h-3 w-20 bg-zinc-800 rounded" />
            <div className="h-9 w-28 bg-zinc-800 rounded-md" />
          </div>
        ))}
      </div>
      {/* Bills section */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/[0.06] bg-zinc-900 p-5 space-y-3">
            <div className="h-3 w-20 bg-zinc-800 rounded" />
            <div className="h-9 w-28 bg-zinc-800 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
