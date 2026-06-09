'use client';

import { ErrorFallback } from '@/components/ErrorFallback';

export default function TransactionsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorFallback pageName="Transactions" error={error} reset={reset} />;
}
