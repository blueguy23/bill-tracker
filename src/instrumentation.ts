import { logger } from '@/lib/logger';

const STARTUP_SYNC_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { StrictDB } = await import('strictdb');

    // Get or create the shared StrictDB instance
    const db = await StrictDB.create({ uri: process.env.STRICTDB_URI! });

    process.on('SIGTERM', () => db.gracefulShutdown(0));
    process.on('SIGINT', () => db.gracefulShutdown(0));
    process.on('uncaughtException', (err) => {
      console.error('Uncaught Exception:', err);
      db.gracefulShutdown(1);
    });
    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled Rejection:', reason);
      db.gracefulShutdown(1);
    });

    // Auto-sync on startup if SimpleFIN is configured and last sync was >2h ago
    if (process.env.SIMPLEFIN_URL) {
      try {
        const { getDb } = await import('./adapters/db');
        const { getTodayLog } = await import('./adapters/syncLog');
        const { runDailySync } = await import('./handlers/sync');
        const { SimpleFINClient } = await import('./lib/simplefin/client');

        const appDb = await getDb();
        const log = await getTodayLog(appDb);
        const stale = !log.lastSyncAt || Date.now() - log.lastSyncAt.getTime() > STARTUP_SYNC_THRESHOLD_MS;

        if (stale) {
          logger.info('startup.autoSync.triggered', { reason: 'last sync >2h ago' });
          const client = new SimpleFINClient({ url: process.env.SIMPLEFIN_URL });
          runDailySync(appDb, client, 'manual')
            .then((r) => logger.info('startup.autoSync.done', { transactionsUpserted: r.transactionsUpserted, accountsUpdated: r.accountsUpdated }))
            .catch((err) => console.error('[startup] Auto-sync failed:', err));
        } else {
          logger.info('startup.autoSync.skipped', { reason: 'sync is recent' });
        }
      } catch (err) {
        console.error('[startup] Auto-sync setup failed:', err);
      }
    }
  }
}
