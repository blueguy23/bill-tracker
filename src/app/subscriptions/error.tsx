'use client';

import { ErrorFallback } from '@/components/ErrorFallback';

export default function SubscriptionsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorFallback pageName="Subscriptions" error={error} reset={reset} />;
}
