import { NextResponse } from 'next/server';
import type { StrictDB } from 'strictdb';
import type { CreditSettingsResponse, SaveCreditSettingsDto } from '@/types/creditAdvisor';
import { listCreditAccounts } from '@/adapters/credit';
import { listAccountMeta, upsertAccountMeta } from '@/adapters/accountMeta';

export async function handleGetCreditSettings(db: StrictDB): Promise<NextResponse> {
  const accounts = await listCreditAccounts(db);
  const accountIds = accounts.map((a) => a._id);
  const metaList = await listAccountMeta(db, accountIds);
  const metaMap = new Map(metaList.map((m) => [m._id, m]));

  const response: CreditSettingsResponse = {
    settings: accounts.map((a) => {
      const meta = metaMap.get(a._id);
      return {
        accountId: a._id,
        accountName: `${a.orgName} ${a.name}`.trim(),
        statementClosingDay: meta?.statementClosingDay ?? null,
        targetUtilization: meta?.targetUtilization ?? Number(process.env.CREDIT_TARGET_UTIL ?? 0.05),
        manualCreditLimit: meta?.manualCreditLimit ?? null,
      };
    }),
  };

  return NextResponse.json(response);
}

export async function handleSaveCreditSettings(
  db: StrictDB,
  dto: SaveCreditSettingsDto,
): Promise<NextResponse> {
  await Promise.all(
    dto.settings.map((s) =>
      upsertAccountMeta(db, {
        _id: s.accountId,
        statementClosingDay: s.statementClosingDay,
        targetUtilization: s.targetUtilization,
        manualCreditLimit: s.manualCreditLimit,
      }),
    ),
  );
  return NextResponse.json({ saved: true });
}
