export default function SubscriptionsLoading() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-pulse">
      <div className="pt-2 space-y-1">
        <div className="h-6 w-36 bg-zinc-800 rounded-md" />
        <div className="h-4 w-56 bg-zinc-800/60 rounded-md" />
      </div>
      {/* Cost summary bar */}
      <div className="rounded-xl border border-white/[0.06] bg-zinc-900 p-4 flex flex-wrap gap-6">
        <div className="h-7 w-32 bg-zinc-800 rounded-md" />
        <div className="h-7 w-32 bg-zinc-800 rounded-md" />
        <div className="h-7 w-24 bg-zinc-800 rounded-md ml-auto" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/[0.06] bg-zinc-900 p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="h-5 w-40 bg-zinc-800 rounded-md" />
              <div className="flex gap-2">
                <div className="h-5 w-14 bg-zinc-800 rounded-full" />
                <div className="h-5 w-20 bg-zinc-800 rounded-full" />
              </div>
            </div>
            <div className="h-8 w-32 bg-zinc-800 rounded-md" />
            <div className="h-4 w-64 bg-zinc-800/60 rounded-md" />
            <div className="flex gap-3 pt-1">
              <div className="h-9 w-28 bg-zinc-800 rounded-lg" />
              <div className="h-9 w-20 bg-zinc-800 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
