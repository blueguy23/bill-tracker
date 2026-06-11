'use client';

import { ErrorFallback } from '@/components/ErrorFallback';

export default function GoalsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorFallback pageName="Goals" error={error} reset={reset} />;
}
