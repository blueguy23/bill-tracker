/**
 * Structured logger — emits JSON lines to stdout in production, human-readable
 * prefixed lines in development. Never logs secrets or PII.
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info('sync.complete', { txnsUpserted: 42 });
 *   logger.error('db.connect.failed', { error: err.message });
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LEVELS: Record<LogLevel, number> = { error: 0, warn: 1, info: 2, debug: 3 };

function configuredLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
  return (raw in LEVELS ? raw : 'info') as LogLevel;
}

function emit(level: LogLevel, event: string, data?: Record<string, unknown>): void {
  const minLevel = configuredLevel();
  if (LEVELS[level] > LEVELS[minLevel]) return;

  const entry = {
    level,
    event,
    ts: new Date().toISOString(),
    ...data,
  };

  if (process.env.NODE_ENV === 'production') {
    // JSON lines — console.log works in both Node.js and Edge runtimes
    console.log(JSON.stringify(entry)); // eslint-disable-line no-console
  } else {
    // Human-friendly for local dev
    const prefix = `[${level.toUpperCase().padEnd(5)}] [${event}]`;
    const extra = data && Object.keys(data).length > 0 ? ' ' + JSON.stringify(data) : '';
    // eslint-disable-next-line no-console
    console.log(`${prefix}${extra}`);
  }
}

export const logger = {
  error: (event: string, data?: Record<string, unknown>) => emit('error', event, data),
  warn:  (event: string, data?: Record<string, unknown>) => emit('warn',  event, data),
  info:  (event: string, data?: Record<string, unknown>) => emit('info',  event, data),
  debug: (event: string, data?: Record<string, unknown>) => emit('debug', event, data),
};
