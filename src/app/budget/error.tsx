'use client';

import { ErrorFallback } from '@/components/ErrorFallback';

export default function BudgetError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorFallback pageName="Budget" error={error} reset={reset} />;
}
