import type { Metadata } from 'next';
import type { DetectedSubscriptionResponse } from '@/types/subscription';
import { SubscriptionsView } from '@/components/SubscriptionsView';

export const metadata: Metadata = { title: 'Subscriptions — Bill Tracker' };

async function fetchSubscriptions(): Promise<DetectedSubscriptionResponse[]> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  try {
    const res = await fetch(`${baseUrl}/api/v1/subscriptions`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json() as { subscriptions: DetectedSubscriptionResponse[] };
    return data.subscriptions;
  } catch {
    return [];
  }
}

export default async function SubscriptionsPage() {
  const subscriptions = await fetchSubscriptions();
  const count = subscriptions.length;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-white">Detected Subscriptions</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {count === 0
              ? 'No recurring subscriptions detected from your transactions'
              : `${count} recurring pattern${count !== 1 ? 's' : ''} detected from your transactions`}
          </p>
        </div>
      </div>
      <SubscriptionsView initialSubscriptions={subscriptions} />
    </div>
  );
}
