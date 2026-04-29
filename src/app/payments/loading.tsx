export default function Loading() {
  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ height: 24, width: 120, background: 'rgba(255,255,255,0.06)', borderRadius: 6, marginBottom: 16, animation: 'btPulse 1.5s ease-in-out infinite' }} />
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {['Bills', 'Subscriptions', 'Recurring'].map(label => (
          <div key={label} style={{ padding: '8px 16px', height: 36, width: 100, background: 'rgba(255,255,255,0.04)', borderRadius: 4, marginRight: 4, animation: 'btPulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ height: 64, borderRadius: 12, background: 'rgba(255,255,255,0.04)', animation: 'btPulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    </div>
  );
}
