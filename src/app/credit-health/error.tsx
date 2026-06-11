'use client';

import { ErrorFallback } from '@/components/ErrorFallback';

export default function CreditHealthError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorFallback pageName="Credit Health" error={error} reset={reset} />;
}
