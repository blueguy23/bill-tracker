import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Page not found</h2>
        <p className="text-sm text-muted-foreground font-mono">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
      </div>
      <Link
        href="/"
        className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
