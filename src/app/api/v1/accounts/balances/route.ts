import { NextResponse } from 'next/server';
import { getDb } from '@/adapters/db';
import { listAccounts } from '@/adapters/accounts';
import { listAccountMeta } from '@/adapters/accountMeta';

export async function GET(): Promise<Response> {
  try {
    const db = await getDb();
    const accounts = await listAccounts(db);

    // Apply customOrgName overrides
    const accountIds = accounts.map((a) => a._id);
    const metaList = accountIds.length > 0 ? await listAccountMeta(db, accountIds) : [];
    const metaMap = new Map(metaList.map((m) => [m._id, m]));
    const accountsWithNames = accounts.map((a) => {
      const meta = metaMap.get(a._id);
      return meta?.customOrgName ? { ...a, orgName: meta.customOrgName } : a;
    });

    const totalBalance = accountsWithNames.reduce((sum, a) => sum + a.balance, 0);
    return NextResponse.json({ accounts: accountsWithNames, totalBalance });
  } catch (err) {
    console.error('[GET /api/v1/accounts/balances]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
