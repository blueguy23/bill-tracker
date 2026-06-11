interface ErrorRecord {
  message: string;
  event: string;
  timestamp: string;
  stack?: string;
}

const MAX_ERRORS = 50;
const errors: ErrorRecord[] = [];

export function reportError(event: string, err: unknown): void {
  const record: ErrorRecord = {
    message: err instanceof Error ? err.message : String(err),
    event,
    timestamp: new Date().toISOString(),
    stack: err instanceof Error ? err.stack?.split('\n').slice(0, 3).join('\n') : undefined,
  };
  errors.push(record);
  if (errors.length > MAX_ERRORS) errors.shift();
}

export function getRecentErrors(limit = 10): ErrorRecord[] {
  return errors.slice(-limit);
}

export function getErrorCount(): number {
  return errors.length;
}
