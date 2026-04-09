export default function BudgetLoading() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-pulse">
      <div className="pt-2 space-y-1">
        <div className="h-6 w-24 bg-zinc-800 rounded-md" />
        <div className="h-4 w-48 bg-zinc-800/60 rounded-md" />
      </div>
      {/* Summary bar */}
      <div className="rounded-xl border border-white/[0.06] bg-zinc-900 p-5 flex flex-wrap gap-6">
        <div className="h-8 w-40 bg-zinc-800 rounded-md" />
        <div className="h-8 w-40 bg-zinc-800 rounded-md" />
        <div className="h-3 w-full bg-zinc-800 rounded-full mt-2" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/[0.06] bg-zinc-900 p-5 space-y-3">
            <div className="h-4 w-24 bg-zinc-800 rounded-md" />
            <div className="h-8 w-28 bg-zinc-800 rounded-md" />
            <div className="h-2 w-full bg-zinc-800 rounded-full" />
            <div className="h-3 w-16 bg-zinc-800/60 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
