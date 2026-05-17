import { NextResponse } from 'next/server';
import type { StrictDB } from 'strictdb';
import { getForecast } from '@/adapters/forecast';

export async function handleGetForecast(db: StrictDB): Promise<Response> {
  const { days, incomePatterns } = await getForecast(db);

  return NextResponse.json({
    forecast: days,
    incomePatterns: incomePatterns.map((p) => ({
      name: p.name,
      amount: p.amount,
      nextExpected: p.nextExpected.toISOString(),
      interval: p.interval,
      occurrences: p.occurrences,
    })),
  });
}
