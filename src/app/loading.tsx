export default function Loading() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="pt-2 space-y-1.5">
        <div className="h-6 w-32 bg-white/[0.06] rounded animate-pulse" />
        <div className="h-4 w-48 bg-white/[0.04] rounded animate-pulse" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-white/[0.04] animate-pulse" />
        ))}
      </div>
    </div>
  );
}
