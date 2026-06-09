'use client';

import { Button } from '@/components/ui/button';

interface Props {
  pageName?: string;
  error: Error & { digest?: string };
  reset: () => void;
}

export function ErrorFallback({ pageName, error, reset }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold text-foreground">
          {pageName ? `${pageName} failed to load` : 'Something went wrong'}
        </h2>
        <p className="text-sm text-muted-foreground font-mono max-w-md">
          {error.message || 'An unexpected error occurred'}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
