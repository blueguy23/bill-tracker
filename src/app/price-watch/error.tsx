'use client';

import { ErrorFallback } from '@/components/ErrorFallback';

export default function PriceWatchError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorFallback pageName="Price Watch" error={error} reset={reset} />;
}
