'use client';

import { useState } from 'react';

interface ExportButtonProps {
  startDate?: string;
  endDate?: string;
  accountId?: string;
}

export function ExportButton({ startDate, endDate, accountId }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (accountId && accountId !== 'all') params.set('accountId', accountId);

      const url = `/api/v1/export?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) return;

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = /filename="([^"]+)"/.exec(disposition);
      const filename = match?.[1] ?? 'transactions.csv';

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={() => void handleExport()}
      disabled={loading}
      data-testid="export-btn"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 border border-white/[0.08] hover:bg-white/[0.04] transition-colors disabled:opacity-50"
    >
      {loading ? 'Exporting…' : 'Export CSV'}
    </button>
  );
}
