export default function CreditLoading() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-pulse">
      <div className="pt-2 space-y-1">
        <div className="h-6 w-32 bg-zinc-800 rounded-md" />
        <div className="h-4 w-48 bg-zinc-800/60 rounded-md" />
      </div>
      {/* Score + utilization row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/[0.06] bg-zinc-900 p-5 space-y-2">
          <div className="h-3 w-24 bg-zinc-800 rounded-md" />
          <div className="h-10 w-16 bg-zinc-800 rounded-md" />
          <div className="h-4 w-20 bg-zinc-800/60 rounded-md" />
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-zinc-900 p-5 space-y-2">
          <div className="h-3 w-28 bg-zinc-800 rounded-md" />
          <div className="h-10 w-16 bg-zinc-800 rounded-md" />
          <div className="h-4 w-36 bg-zinc-800/60 rounded-md" />
        </div>
      </div>
      {/* Account cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/[0.06] bg-zinc-900 p-5 space-y-3">
            <div className="h-4 w-28 bg-zinc-800 rounded-md" />
            <div className="h-8 w-24 bg-zinc-800 rounded-md" />
            <div className="h-2 w-full bg-zinc-800 rounded-full" />
            <div className="h-3 w-20 bg-zinc-800/60 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
