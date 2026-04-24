const TROVE_BASE = 'https://trove.headline.com/api/v1';

export interface TroveResult {
  name: string;
  domain: string | null;
  industry: string | null;
  categories: string[];
}

export async function enrichTransaction(
  description: string,
  amount: number,
  date: string,
  userId: string,
): Promise<TroveResult | null> {
  const key = process.env.TROVE_API_KEY;
  if (!key || Math.abs(amount) === 0) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    let res: Response;
    try {
      res = await fetch(`${TROVE_BASE}/transactions/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-KEY': key },
        body: JSON.stringify({
          description,
          amount: Math.abs(amount),
          date,
          user_id: userId,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) return null;

    const data = await res.json() as Record<string, unknown>;
    if (!data.name) return null;

    return {
      name: data.name as string,
      domain: (data.domain as string | null) ?? null,
      industry: (data.industry as string | null) ?? null,
      categories: Array.isArray(data.categories) ? (data.categories as string[]) : [],
    };
  } catch {
    return null;
  }
}
