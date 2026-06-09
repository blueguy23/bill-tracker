'use client';

import { ErrorFallback } from '@/components/ErrorFallback';

export default function CreditError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorFallback pageName="Credit" error={error} reset={reset} />;
}
