'use client';

import { ErrorFallback } from '@/components/ErrorFallback';

export default function PaymentsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorFallback pageName="Payments" error={error} reset={reset} />;
}
