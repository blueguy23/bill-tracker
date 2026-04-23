import 'dotenv/config';
import type { StrictDB } from 'strictdb';
import { enrichWithTrove } from '../../src/handlers/troveEnrich.js';

export default {
  name: 'trove-enrich-all',
  description: 'Run Trove enrichment on ALL non-user-categorized transactions (backfill + limit test)',
  async run(db: StrictDB) {
    if (!process.env.TROVE_API_KEY) {
      console.log('  ❌ TROVE_API_KEY not set in .env');
      return;
    }

    console.log('  Enriching all transactions with Trove (this may take a minute)...\n');
    const start = Date.now();
    const result = await enrichWithTrove(db, 'all');
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    console.log(`  ✅ Done in ${elapsed}s`);
    console.log(`  Total transactions processed : ${result.total}`);
    console.log(`  Enriched by Trove            : ${result.enrichedByTrove}`);
    console.log(`  Enriched by keyword rules    : ${result.enrichedByKeywords}`);
    console.log(`  Skipped (zero amount)        : ${result.skipped}`);
  },
};
