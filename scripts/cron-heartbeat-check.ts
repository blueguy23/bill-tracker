/**
 * Cron heartbeat checker — alerts via Discord if cron jobs haven't
 * reported a successful run within the expected window.
 *
 * Usage:
 *   npx tsx scripts/cron-heartbeat-check.ts
 *
 * Crontab:
 *   30 1,5,9,13,17,21 * * *  .../scripts/cron-heartbeat-check.sh >> .../logs/heartbeat.log 2>&1
 */

import 'dotenv/config';
import { getDb } from '../src/adapters/db.js';
import { getHeartbeat } from '../src/adapters/cronHeartbeats.js';
import { isWebhookConfigured, sendWebhook } from '../src/lib/discord/webhook.js';
import { buildHeartbeatStaleEmbed } from '../src/lib/discord/embeds.js';
import type { HeartbeatStalePayload } from '../src/types/notification.js';

const STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000;
const SCRIPTS_TO_CHECK = ['sync'] as const;

const timestamp = new Date().toISOString();

async function sendAlert(payload: HeartbeatStalePayload): Promise<void> {
  if (!isWebhookConfigured()) {
    console.error(`[${timestamp}] ALERT (no webhook): ${payload.reason} — ${payload.script}`);
    return;
  }
  await sendWebhook({ embeds: [buildHeartbeatStaleEmbed(payload)] });
  console.log(`[${timestamp}] ALERT sent: ${payload.reason} — ${payload.script}`);
}

async function main() {
  console.log(`[${timestamp}] heartbeat-check starting`);

  let db;
  try {
    db = await getDb();
  } catch (err) {
    console.error(`[${timestamp}] ERROR: Cannot connect to MongoDB:`, err);
    await sendAlert({
      script: 'all',
      lastSuccessAt: null,
      hoursSinceSuccess: null,
      reason: 'db_unreachable',
    });
    process.exit(1);
  }

  let hasAlerts = false;

  for (const script of SCRIPTS_TO_CHECK) {
    const heartbeat = await getHeartbeat(db, script);

    if (!heartbeat || !heartbeat.lastSuccessAt) {
      console.log(`[${timestamp}] ${script}: no successful run recorded`);
      await sendAlert({
        script,
        lastSuccessAt: null,
        hoursSinceSuccess: null,
        reason: 'never_run',
      });
      hasAlerts = true;
      continue;
    }

    const msSinceSuccess = Date.now() - new Date(heartbeat.lastSuccessAt).getTime();
    const hoursSinceSuccess = msSinceSuccess / (60 * 60 * 1000);

    if (msSinceSuccess > STALE_THRESHOLD_MS) {
      console.log(`[${timestamp}] ${script}: stale — last success ${hoursSinceSuccess.toFixed(1)}h ago`);
      await sendAlert({
        script,
        lastSuccessAt: heartbeat.lastSuccessAt,
        hoursSinceSuccess,
        reason: 'stale',
      });
      hasAlerts = true;
    } else {
      console.log(`[${timestamp}] ${script}: OK — last success ${hoursSinceSuccess.toFixed(1)}h ago`);
    }
  }

  console.log(`[${timestamp}] heartbeat-check complete — ${hasAlerts ? 'alerts sent' : 'all OK'}`);
  process.exit(0);
}

main();
