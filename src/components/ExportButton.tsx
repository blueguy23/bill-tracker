'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

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
    <Button
      variant="outline"
      size="sm"
      onClick={() => void handleExport()}
      disabled={loading}
      data-testid="export-btn"
    >
      {loading ? 'Exporting…' : 'Export CSV'}
    </Button>
  );
}
