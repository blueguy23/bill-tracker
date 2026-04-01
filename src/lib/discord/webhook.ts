import type { DiscordWebhookPayload } from '@/types/notification';

export class DiscordWebhookError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'DiscordWebhookError';
  }
}

export function isWebhookConfigured(): boolean {
  return Boolean(process.env.DISCORD_WEBHOOK_URL);
}

export async function sendWebhook(payload: DiscordWebhookPayload): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new DiscordWebhookError(res.status, `Discord webhook returned ${res.status}`);
  }
}
