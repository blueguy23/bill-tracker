import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { getAccountMeta, upsertAccountMeta } from '@/adapters/accountMeta';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams): Promise<Response> {
  try {
    const { id } = await params;
    const body = await req.json() as { customOrgName?: string | null };
    const db = await getDb();
    const existing = await getAccountMeta(db, id);
    await upsertAccountMeta(db, { ...existing, customOrgName: body.customOrgName ?? null });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /api/v1/accounts/[id]/meta]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
