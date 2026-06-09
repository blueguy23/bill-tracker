'use client';

import { ErrorFallback } from '@/components/ErrorFallback';

export default function SummaryError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorFallback pageName="Summary" error={error} reset={reset} />;
}
