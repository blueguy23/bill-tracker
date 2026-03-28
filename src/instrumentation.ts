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
  }
}
